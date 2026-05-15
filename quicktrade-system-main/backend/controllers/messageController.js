const sql = require("../db");

const SUPPORT_STATUSES = ["Open", "Pending", "Resolved", "Closed"];

const validateSupportAttachment = (attachmentUrl = "", attachmentType = "") => {
    if (!attachmentUrl) return null;
    const isImage = ['data:image/jpeg', 'data:image/jpg', 'data:image/png', 'data:image/webp'].some(prefix => attachmentUrl.startsWith(prefix));
    const isPdf = attachmentUrl.startsWith('data:application/pdf');

    if (!isImage && !isPdf) {
        return "Attachment must be an image or PDF";
    }
    if (attachmentUrl.length > 4_500_000) {
        return "Attachment is too large. Max upload size is 3MB.";
    }
    if (attachmentType && !['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'].includes(attachmentType)) {
        return "Unsupported attachment type";
    }
    return null;
};

const getSupportConversation = async (db, convoId) => {
    return db.get(
        `SELECT c.*, u.username AS user_name, u.email AS user_email
         FROM Conversations c
         JOIN users u ON c.user1_id = u.user_id
         WHERE c.convo_id = ? AND c.type = 'support'`,
        [Number(convoId)]
    );
};

const getSupportMessages = async (db, convoId) => {
    return db.all(
        `SELECT m.*, COALESCE(u.username, 'QuickTrade Support') AS sender_name
         FROM Messages m
         LEFT JOIN users u ON m.sender_id = u.user_id
         WHERE m.convo_id = ?
         ORDER BY m.timestamp ASC`,
        [Number(convoId)]
    );
};

const formatSupportPayload = async (db, convo) => ({
    ...convo,
    messages: await getSupportMessages(db, convo.convo_id)
});

exports.sendMessage = async (req, res) => {
  const db = await sql.getDB();
  try {
    const { sender_id, receiver_id, trade_id, content, convo_id, type } = req.body;
    const messageType = type || 'user';

    if (!content || !String(content).trim()) {
      return res.status(400).json({ error: "Message content is required" });
    }

    if (messageType === 'image') {
      const allowed = ['data:image/jpeg', 'data:image/jpg', 'data:image/png', 'data:image/webp'];
      if (!allowed.some(prefix => String(content).startsWith(prefix))) {
        return res.status(400).json({ error: "Only JPG, PNG, JPEG, or WEBP images are allowed" });
      }
      if (String(content).length > 3_000_000) {
        return res.status(400).json({ error: "Image is too large. Max upload size is 2MB." });
      }
    }
    
    // Explicitly cast trade_id to Number if provided
    const tid = trade_id ? Number(trade_id) : null;
    const sid = sender_id !== undefined ? Number(sender_id) : 0;
    const rid = receiver_id !== undefined ? Number(receiver_id) : 0;

    const result = await db.run(
      'INSERT INTO Messages (sender_id, receiver_id, trade_id, convo_id, content, type, timestamp) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
      [sid, rid, tid, convo_id || null, content, messageType]
    );

    res.status(201).json({ 
        message: "Message sent", 
        msg_id: result.lastID 
    });
  } catch (err) {
    console.error("[SEND_MESSAGE_ERROR]", err);
    res.status(500).json({ error: "DATABASE_ERROR: " + err.message });
  }
};

exports.getTradeMessages = async (req, res) => {
  const db = await sql.getDB();
  try {
    const { trade_id } = req.params;
    // LEFT JOIN to ensure bot messages (sender_id 0) still show up even if no user 0 exists
    const messages = await db.all(
      `SELECT m.*, COALESCE(u.username, 'QUICKTRADE AI') as sender_name 
       FROM Messages m 
       LEFT JOIN users u ON m.sender_id = u.user_id 
       WHERE m.trade_id = ? 
       ORDER BY m.timestamp ASC`,
      [trade_id]
    );
    res.json(messages);
  } catch (err) {
    console.error("[GET_TRADE_MESSAGES_ERROR]", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

exports.getConversations = async (req, res) => {
    const db = await sql.getDB();
    try {
        const { user_id } = req.params;
        const convos = await db.all(
            `SELECT c.*, 
             u1.username as user1_name, 
             u2.username as user2_name
             FROM Conversations c
             JOIN users u1 ON c.user1_id = u1.user_id
             JOIN users u2 ON c.user2_id = u2.user_id
             WHERE c.user1_id = ? OR c.user2_id = ?
             ORDER BY c.last_timestamp DESC`,
            [user_id, user_id]
        );
        res.json(convos);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch conversations" });
    }
};

exports.createSupportTicket = async (req, res) => {
    const db = await sql.getDB();
    try {
        const { user_id, category, content, attachment_url, attachment_name, attachment_type } = req.body;
        const cleanCategory = String(category || "").trim();
        const cleanContent = String(content || "").trim();

        if (!user_id || !cleanCategory || !cleanContent) {
            return res.status(400).json({ error: "Category and message are required" });
        }

        const user = await db.get("SELECT user_id, username FROM users WHERE user_id = ?", [Number(user_id)]);
        if (!user) return res.status(404).json({ error: "User not found" });

        const attachmentError = validateSupportAttachment(attachment_url || "", attachment_type || "");
        if (attachmentError) return res.status(400).json({ error: attachmentError });

        const admin = await db.get("SELECT user_id FROM users WHERE role = 'admin' ORDER BY user_id ASC");
        const assignedAdminId = admin?.user_id || Number(user_id);
        const subject = `${cleanCategory} support request`;
        const firstMessage = `[${cleanCategory}] ${cleanContent}`;

        const created = await db.run(
            `INSERT INTO Conversations (user1_id, user2_id, last_message, type, support_status, subject, last_timestamp)
             VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [Number(user_id), Number(assignedAdminId), firstMessage, "support", "Open", subject]
        );

        const convoId = created.lastID;
        await db.run(
            `INSERT INTO Messages (sender_id, receiver_id, convo_id, content, type, timestamp)
             VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [Number(user_id), Number(assignedAdminId), convoId, firstMessage, "support_user"]
        );

        if (attachment_url) {
            await db.run(
                `INSERT INTO Messages (sender_id, receiver_id, convo_id, content, type, timestamp)
                 VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [Number(user_id), Number(assignedAdminId), convoId, attachment_url, attachment_type === "application/pdf" ? "file" : "image"]
            );
        }

        const convo = await getSupportConversation(db, convoId);
        res.status(201).json(await formatSupportPayload(db, convo));
    } catch (err) {
        console.error("[CREATE_SUPPORT_TICKET_ERROR]", err);
        res.status(500).json({ error: "Failed to submit support ticket" });
    }
};

exports.getUserSupportTickets = async (req, res) => {
    const db = await sql.getDB();
    try {
        const { user_id } = req.params;
        const convos = await db.all(
            `SELECT c.*, u.username AS user_name, u.email AS user_email
             FROM Conversations c
             JOIN users u ON c.user1_id = u.user_id
             WHERE c.type = 'support' AND c.user1_id = ?
             ORDER BY c.last_timestamp DESC`,
            [Number(user_id)]
        );

        res.json(await Promise.all(convos.map(convo => formatSupportPayload(db, convo))));
    } catch (err) {
        console.error("[GET_USER_SUPPORT_TICKETS_ERROR]", err);
        res.status(500).json({ error: "Failed to fetch support tickets" });
    }
};

exports.getAdminSupportTickets = async (req, res) => {
    const db = await sql.getDB();
    try {
        const convos = await db.all(
            `SELECT c.*, u.username AS user_name, u.email AS user_email
             FROM Conversations c
             JOIN users u ON c.user1_id = u.user_id
             WHERE c.type = 'support'
             ORDER BY c.last_timestamp DESC`
        );

        res.json(await Promise.all(convos.map(convo => formatSupportPayload(db, convo))));
    } catch (err) {
        console.error("[GET_ADMIN_SUPPORT_TICKETS_ERROR]", err);
        res.status(500).json({ error: "Failed to fetch support inbox" });
    }
};

exports.replySupportTicket = async (req, res) => {
    const db = await sql.getDB();
    try {
        const { convo_id } = req.params;
        const { sender_id, content, attachment_url, attachment_name, attachment_type } = req.body;
        const cleanContent = String(content || "").trim();
        const convo = await getSupportConversation(db, convo_id);

        if (!convo) return res.status(404).json({ error: "Support ticket not found" });
        if (!sender_id) return res.status(400).json({ error: "Sender is required" });
        if (!cleanContent && !attachment_url) return res.status(400).json({ error: "Reply message or attachment is required" });

        const sender = await db.get("SELECT user_id, role FROM users WHERE user_id = ?", [Number(sender_id)]);
        if (!sender) return res.status(404).json({ error: "Sender not found" });
        const isTicketUser = Number(convo.user1_id) === Number(sender_id);
        const isAdmin = sender.role === "admin";
        if (!isTicketUser && !isAdmin) return res.status(403).json({ error: "Not allowed to reply to this ticket" });

        const attachmentError = validateSupportAttachment(attachment_url || "", attachment_type || "");
        if (attachmentError) return res.status(400).json({ error: attachmentError });

        const receiverId = isAdmin ? Number(convo.user1_id) : Number(convo.user2_id);
        if (cleanContent) {
            await db.run(
                `INSERT INTO Messages (sender_id, receiver_id, convo_id, content, type, timestamp)
                 VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [Number(sender_id), receiverId, Number(convo_id), cleanContent, isAdmin ? "support_admin" : "support_user"]
            );
        }
        if (attachment_url) {
            await db.run(
                `INSERT INTO Messages (sender_id, receiver_id, convo_id, content, type, timestamp)
                 VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [Number(sender_id), receiverId, Number(convo_id), attachment_url, attachment_type === "application/pdf" ? "file" : "image"]
            );
        }

        await db.run(
            `UPDATE Conversations
             SET last_message = ?, last_timestamp = CURRENT_TIMESTAMP, support_status = CASE WHEN support_status = 'Closed' THEN 'Open' ELSE support_status END
             WHERE convo_id = ?`,
            [cleanContent || attachment_name || "Attachment sent", Number(convo_id)]
        );

        const updated = await getSupportConversation(db, convo_id);
        res.json(await formatSupportPayload(db, updated));
    } catch (err) {
        console.error("[REPLY_SUPPORT_TICKET_ERROR]", err);
        res.status(500).json({ error: "Failed to send support reply" });
    }
};

exports.updateSupportStatus = async (req, res) => {
    const db = await sql.getDB();
    try {
        const { convo_id } = req.params;
        const { status, actor_user_id } = req.body;

        if (!SUPPORT_STATUSES.includes(status)) {
            return res.status(400).json({ error: "Invalid support status" });
        }

        const actor = await db.get("SELECT role FROM users WHERE user_id = ?", [Number(actor_user_id)]);
        if (actor?.role !== "admin") {
            return res.status(403).json({ error: "Admin access required" });
        }

        const convo = await getSupportConversation(db, convo_id);
        if (!convo) return res.status(404).json({ error: "Support ticket not found" });

        await db.run(
            "UPDATE Conversations SET support_status = ?, last_timestamp = CURRENT_TIMESTAMP WHERE convo_id = ?",
            [status, Number(convo_id)]
        );

        const updated = await getSupportConversation(db, convo_id);
        res.json(await formatSupportPayload(db, updated));
    } catch (err) {
        console.error("[UPDATE_SUPPORT_STATUS_ERROR]", err);
        res.status(500).json({ error: "Failed to update support status" });
    }
};
