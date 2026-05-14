const sql = require("../db");

exports.sendMessage = async (req, res) => {
  const db = await sql.getDB();
  try {
    const { sender_id, receiver_id, trade_id, content, convo_id, type } = req.body;
    
    // Explicitly cast trade_id to Number if provided
    const tid = trade_id ? Number(trade_id) : null;
    const sid = sender_id !== undefined ? Number(sender_id) : 0;
    const rid = receiver_id !== undefined ? Number(receiver_id) : 0;

    const result = await db.run(
      'INSERT INTO Messages (sender_id, receiver_id, trade_id, convo_id, content, type, timestamp) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
      [sid, rid, tid, convo_id || null, content, type || 'user']
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
