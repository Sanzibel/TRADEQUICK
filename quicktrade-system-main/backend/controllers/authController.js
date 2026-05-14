const sql = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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
    await db.run(
      'INSERT INTO users (full_name, username, email, password) VALUES (?, ?, ?, ?)',
      [full_name, username, email, hashedPassword]
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

    const token = jwt.sign(
      { user_id: user.user_id, username: user.username },
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "24h" }
    );

    res.json({ 
      token, 
      user: { 
        user_id: user.user_id, 
        username: user.username, 
        full_name: user.full_name,
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
    const user = await db.get('SELECT user_id FROM users WHERE user_id = ?', [user_id]);
    if (user) {
      res.json({ valid: true });
    } else {
      res.status(404).json({ valid: false });
    }
  } catch (err) {
    res.status(500).json({ error: "Verification failed" });
  }
};
