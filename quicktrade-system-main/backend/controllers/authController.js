const sql = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const getAdminEmails = () => {
  return (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
};

const getUserRole = (email, currentRole = "user") => {
  return getAdminEmails().includes(String(email || "").toLowerCase())
    ? "admin"
    : currentRole || "user";
};

exports.register = async (req, res) => {
  try {
    const { full_name, username, email, password } = req.body;
    const db = await sql.getDB(); // This now waits for initDB() to finish

    if (!username || !email || !password || password.length < 8) {
      return res.status(400).json({ error: "Invalid inputs. Password must be at least 8 characters." });
    }

    // Check if user exists
    const userCheck = await db.get(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (userCheck) {
      return res.status(400).json({ error: "Username or Email already taken" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const role = getUserRole(email);

    await db.run(
      'INSERT INTO users (full_name, username, email, password, role) VALUES (?, ?, ?, ?, ?)',
      [full_name, username, email, hashedPassword, role]
    );

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("Registration Error:", err);
    res.status(500).json({ error: "Registration failed: " + (err.message || "Unknown error") });
  }
};

exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const db = await sql.getDB();

    const user = await db.get(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [identifier, identifier]
    );

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const role = getUserRole(user.email, user.role);

    if (role !== user.role) {
      await db.run('UPDATE users SET role = ? WHERE user_id = ?', [role, user.user_id]);
    }

    const token = jwt.sign(
      { user_id: user.user_id, username: user.username, role },
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "24h" }
    );

    res.json({ 
      token, 
      user: { 
        user_id: user.user_id, 
        username: user.username, 
        full_name: user.full_name,
        email: user.email,
        role,
        premium_status: user.premium_status,
        balance: user.balance
      } 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
};

exports.verifyUser = async (req, res) => {
  try {
    const { user_id } = req.params;
    const db = await sql.getDB();
    const user = await db.get('SELECT user_id, full_name, username, email, role, premium_status, balance FROM users WHERE user_id = ?', [user_id]);
    if (user) {
      res.json({ valid: true, user });
    } else {
      res.status(404).json({ valid: false });
    }
  } catch (err) {
    res.status(500).json({ error: "Verification failed" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { full_name, username, email, current_password, new_password } = req.body;
    const db = await sql.getDB();

    if (Number(req.user?.user_id) !== Number(user_id)) {
      return res.status(403).json({ error: "You can only update your own account" });
    }

    const user = await db.get('SELECT * FROM users WHERE user_id = ?', [user_id]);
    if (!user) return res.status(404).json({ error: "User not found" });

    const nextFullName = String(full_name || "").trim();
    const nextUsername = String(username || "").trim();
    const nextEmail = String(email || "").trim().toLowerCase();

    if (!nextUsername || !nextEmail) {
      return res.status(400).json({ error: "Username and email are required" });
    }

    const duplicate = await db.get(
      'SELECT user_id FROM users WHERE (username = ? OR email = ?) AND user_id <> ?',
      [nextUsername, nextEmail, user_id]
    );
    if (duplicate) {
      return res.status(409).json({ error: "Username or email is already taken" });
    }

    let nextPassword = user.password;
    if (new_password) {
      if (String(new_password).length < 8) {
        return res.status(400).json({ error: "New password must be at least 8 characters" });
      }
      if (!current_password) {
        return res.status(400).json({ error: "Current password is required to change password" });
      }
      const passwordOk = await bcrypt.compare(current_password, user.password);
      if (!passwordOk) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }
      nextPassword = await bcrypt.hash(new_password, 10);
    }

    const role = getUserRole(nextEmail, user.role);

    await db.run(
      `UPDATE users
       SET full_name = ?, username = ?, email = ?, password = ?, role = ?, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [nextFullName || null, nextUsername, nextEmail, nextPassword, role, user_id]
    );

    const updated = await db.get(
      'SELECT user_id, full_name, username, email, role, premium_status, balance FROM users WHERE user_id = ?',
      [user_id]
    );

    const token = jwt.sign(
      { user_id: updated.user_id, username: updated.username, role: updated.role },
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "24h" }
    );

    res.json({ message: "Profile updated", user: updated, token });
  } catch (err) {
    console.error("[UPDATE_PROFILE_ERROR]", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
};
