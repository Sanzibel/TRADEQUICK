const sql = require("../db");

const VALID_STATUSES = [
  "Pending",
  "Waiting for User B",
  "Middleman Assigned",
  "In Verification",
  "Completed",
  "Cancelled"
];

const MIDDLEMAN_ACTIONS = {
  received_a: "Received from User A",
  verified_a: "Verified User A item",
  received_b: "Received from User B",
  verified_b: "Verified User B item"
};

const generateTicketCode = () => {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `QT-${stamp}-${random}`;
};

const fetchTicketByCode = async (db, ticketCode) => {
  return db.get(
    `SELECT 
      tt.*,
      creator.username AS creator_username,
      joiner.username AS joiner_username,
      middleman.username AS middleman_username
     FROM TradeTickets tt
     JOIN users creator ON tt.creator_user_id = creator.user_id
     LEFT JOIN users joiner ON tt.joiner_user_id = joiner.user_id
     LEFT JOIN users middleman ON tt.middleman_user_id = middleman.user_id
     WHERE tt.ticket_code = ?`,
    [ticketCode]
  );
};

const addTicketLog = async (db, ticketId, actorUserId, eventType, message, evidenceUrl = null) => {
  await db.run(
    `INSERT INTO TradeTicketLogs (ticket_id, actor_user_id, event_type, message, evidence_url)
     VALUES (?, ?, ?, ?, ?)`,
    [ticketId, actorUserId || null, eventType, message, evidenceUrl]
  );
};

const setTicketStatus = async (db, ticket, newStatus, changedBy, note) => {
  if (!VALID_STATUSES.includes(newStatus)) {
    throw new Error("Invalid ticket status");
  }

  if (ticket.status === newStatus) return;

  const completedAt = newStatus === "Completed" ? ", completed_at = CURRENT_TIMESTAMP" : "";
  const cancelledAt = newStatus === "Cancelled" ? ", cancelled_at = CURRENT_TIMESTAMP" : "";

  await db.run(
    `UPDATE TradeTickets SET status = ?, updated_at = CURRENT_TIMESTAMP${completedAt}${cancelledAt} WHERE ticket_id = ?`,
    [newStatus, ticket.ticket_id]
  );

  await db.run(
    `INSERT INTO TradeTicketStatusHistory (ticket_id, previous_status, new_status, changed_by, note)
     VALUES (?, ?, ?, ?, ?)`,
    [ticket.ticket_id, ticket.status, newStatus, changedBy || null, note || null]
  );

  ticket.status = newStatus;
};

const getTicketPayload = async (db, ticketCode) => {
  const ticket = await fetchTicketByCode(db, ticketCode);
  if (!ticket) return null;

  const items = await db.all(
    `SELECT tti.*, u.username
     FROM TradeTicketItems tti
     JOIN users u ON tti.user_id = u.user_id
     WHERE tti.ticket_id = ?
     ORDER BY tti.submitted_at ASC`,
    [ticket.ticket_id]
  );

  const logs = await db.all(
    `SELECT ttl.*, u.username AS actor_username
     FROM TradeTicketLogs ttl
     LEFT JOIN users u ON ttl.actor_user_id = u.user_id
     WHERE ttl.ticket_id = ?
     ORDER BY ttl.created_at ASC`,
    [ticket.ticket_id]
  );

  const history = await db.all(
    `SELECT th.*, u.username AS changed_by_username
     FROM TradeTicketStatusHistory th
     LEFT JOIN users u ON th.changed_by = u.user_id
     WHERE th.ticket_id = ?
     ORDER BY th.created_at ASC`,
    [ticket.ticket_id]
  );

  return { ticket, items, logs, history };
};

const userExists = async (db, userId) => {
  if (!userId) return false;
  const user = await db.get("SELECT user_id FROM users WHERE user_id = ?", [Number(userId)]);
  return !!user;
};

exports.createTicket = async (req, res) => {
  const db = await sql.getDB();
  try {
    const { creator_user_id, invite_note } = req.body;

    if (!(await userExists(db, creator_user_id))) {
      return res.status(400).json({ error: "Valid creator user is required" });
    }

    let ticketCode = generateTicketCode();
    let created = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        created = await db.run(
          `INSERT INTO TradeTickets (ticket_code, creator_user_id, status, invite_note)
           VALUES (?, ?, ?, ?)`,
          [ticketCode, Number(creator_user_id), "Waiting for User B", invite_note || null]
        );
        break;
      } catch (err) {
        ticketCode = generateTicketCode();
        if (attempt === 2) throw err;
      }
    }

    const ticketId = created.lastID;
    await db.run(
      `INSERT INTO TradeTicketStatusHistory (ticket_id, previous_status, new_status, changed_by, note)
       VALUES (?, ?, ?, ?, ?)`,
      [ticketId, null, "Waiting for User B", Number(creator_user_id), "Ticket opened by User A"]
    );
    await addTicketLog(db, ticketId, creator_user_id, "ticket_created", "User A opened the trade ticket.");

    const payload = await getTicketPayload(db, ticketCode);
    res.status(201).json(payload);
  } catch (err) {
    console.error("[CREATE_TICKET_ERROR]", err);
    res.status(500).json({ error: "Failed to create trade ticket" });
  }
};

exports.joinTicket = async (req, res) => {
  const db = await sql.getDB();
  try {
    const { ticket_code, user_id } = req.body;
    const ticket = await fetchTicketByCode(db, ticket_code);

    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    if (!(await userExists(db, user_id))) return res.status(400).json({ error: "Valid user is required" });
    if (Number(ticket.creator_user_id) === Number(user_id)) {
      return res.status(400).json({ error: "Creator cannot join as User B" });
    }
    if (ticket.joiner_user_id && Number(ticket.joiner_user_id) !== Number(user_id)) {
      return res.status(409).json({ error: "Ticket already has User B" });
    }
    if (ticket.joiner_user_id && Number(ticket.joiner_user_id) === Number(user_id)) {
      return res.json(await getTicketPayload(db, ticket.ticket_code));
    }
    if (["Completed", "Cancelled"].includes(ticket.status)) {
      return res.status(400).json({ error: "This ticket is closed" });
    }

    await db.run(
      "UPDATE TradeTickets SET joiner_user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE ticket_id = ?",
      [Number(user_id), ticket.ticket_id]
    );

    const nextTicket = { ...ticket, joiner_user_id: Number(user_id) };
    await setTicketStatus(db, nextTicket, "Pending", user_id, "User B joined; waiting for item declarations and middleman.");
    await addTicketLog(db, ticket.ticket_id, user_id, "user_b_joined", "User B joined the trade ticket.");

    res.json(await getTicketPayload(db, ticket.ticket_code));
  } catch (err) {
    console.error("[JOIN_TICKET_ERROR]", err);
    res.status(500).json({ error: "Failed to join trade ticket" });
  }
};

exports.submitItem = async (req, res) => {
  const db = await sql.getDB();
  try {
    const { ticketCode } = req.params;
    const { user_id, game_name, item_name, quantity, screenshot_url, notes } = req.body;
    const ticket = await fetchTicketByCode(db, ticketCode);

    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    if (!game_name || !item_name || Number(quantity) < 1) {
      return res.status(400).json({ error: "Game, item, and quantity are required" });
    }
    const isParticipant = [ticket.creator_user_id, ticket.joiner_user_id].some(id => Number(id) === Number(user_id));
    if (!isParticipant) return res.status(403).json({ error: "Only ticket participants can submit items" });
    if (["Completed", "Cancelled"].includes(ticket.status)) {
      return res.status(400).json({ error: "This ticket is closed" });
    }

    const existing = await db.get(
      "SELECT item_submission_id FROM TradeTicketItems WHERE ticket_id = ? AND user_id = ?",
      [ticket.ticket_id, Number(user_id)]
    );

    if (existing) {
      await db.run(
        `UPDATE TradeTicketItems
         SET game_name = ?, item_name = ?, quantity = ?, screenshot_url = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
         WHERE item_submission_id = ?`,
        [game_name, item_name, Number(quantity), screenshot_url || null, notes || null, existing.item_submission_id]
      );
      await addTicketLog(db, ticket.ticket_id, user_id, "item_updated", "Participant updated their trade item declaration.", screenshot_url || null);
    } else {
      await db.run(
        `INSERT INTO TradeTicketItems (ticket_id, user_id, game_name, item_name, quantity, screenshot_url, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [ticket.ticket_id, Number(user_id), game_name, item_name, Number(quantity), screenshot_url || null, notes || null]
      );
      await addTicketLog(db, ticket.ticket_id, user_id, "item_submitted", "Participant submitted their trade item declaration.", screenshot_url || null);
    }

    res.json(await getTicketPayload(db, ticket.ticket_code));
  } catch (err) {
    console.error("[SUBMIT_TICKET_ITEM_ERROR]", err);
    res.status(500).json({ error: "Failed to submit ticket item" });
  }
};

exports.assignMiddleman = async (req, res) => {
  const db = await sql.getDB();
  try {
    const { ticketCode } = req.params;
    const { middleman_user_id, actor_user_id } = req.body;
    const ticket = await fetchTicketByCode(db, ticketCode);

    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    if (!(await userExists(db, middleman_user_id))) {
      return res.status(400).json({ error: "Valid middleman user is required" });
    }
    if (["Completed", "Cancelled"].includes(ticket.status)) {
      return res.status(400).json({ error: "This ticket is closed" });
    }

    await db.run(
      "UPDATE TradeTickets SET middleman_user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE ticket_id = ?",
      [Number(middleman_user_id), ticket.ticket_id]
    );

    const nextTicket = { ...ticket, middleman_user_id: Number(middleman_user_id) };
    await setTicketStatus(db, nextTicket, "Middleman Assigned", actor_user_id || middleman_user_id, "Human middleman/admin assigned.");
    await addTicketLog(db, ticket.ticket_id, actor_user_id || middleman_user_id, "middleman_assigned", "Middleman/admin joined the ticket.");

    res.json(await getTicketPayload(db, ticket.ticket_code));
  } catch (err) {
    console.error("[ASSIGN_MIDDLEMAN_ERROR]", err);
    res.status(500).json({ error: "Failed to assign middleman" });
  }
};

exports.middlemanAction = async (req, res) => {
  const db = await sql.getDB();
  try {
    const { ticketCode } = req.params;
    const { actor_user_id, action, evidence_url, note } = req.body;
    const ticket = await fetchTicketByCode(db, ticketCode);

    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    if (!ticket.middleman_user_id) return res.status(400).json({ error: "Assign a middleman first" });
    if (Number(ticket.middleman_user_id) !== Number(actor_user_id)) {
      return res.status(403).json({ error: "Only the assigned middleman can perform this action" });
    }
    if (["Completed", "Cancelled"].includes(ticket.status)) {
      return res.status(400).json({ error: "This ticket is closed" });
    }
    if (!MIDDLEMAN_ACTIONS[action]) {
      return res.status(400).json({ error: "Invalid middleman action" });
    }

    await addTicketLog(db, ticket.ticket_id, actor_user_id, action, note || MIDDLEMAN_ACTIONS[action], evidence_url || null);
    await setTicketStatus(db, ticket, "In Verification", actor_user_id, MIDDLEMAN_ACTIONS[action]);

    res.json(await getTicketPayload(db, ticket.ticket_code));
  } catch (err) {
    console.error("[MIDDLEMAN_ACTION_ERROR]", err);
    res.status(500).json({ error: "Failed to save middleman action" });
  }
};

exports.completeTicket = async (req, res) => {
  const db = await sql.getDB();
  try {
    const { ticketCode } = req.params;
    const { actor_user_id, evidence_url, note } = req.body;
    const ticket = await fetchTicketByCode(db, ticketCode);

    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    if (Number(ticket.middleman_user_id) !== Number(actor_user_id)) {
      return res.status(403).json({ error: "Only the assigned middleman can complete this ticket" });
    }

    const items = await db.all("SELECT user_id FROM TradeTicketItems WHERE ticket_id = ?", [ticket.ticket_id]);
    const itemUsers = new Set(items.map(item => Number(item.user_id)));
    if (!itemUsers.has(Number(ticket.creator_user_id)) || !itemUsers.has(Number(ticket.joiner_user_id))) {
      return res.status(400).json({ error: "Both users must submit item declarations before completion" });
    }

    const logs = await db.all("SELECT event_type FROM TradeTicketLogs WHERE ticket_id = ?", [ticket.ticket_id]);
    const eventTypes = new Set(logs.map(log => log.event_type));
    const requiredEvents = ["received_a", "verified_a", "received_b", "verified_b"];
    const missing = requiredEvents.filter(event => !eventTypes.has(event));
    if (missing.length > 0) {
      return res.status(400).json({ error: `Missing verification steps: ${missing.join(", ")}` });
    }

    await addTicketLog(db, ticket.ticket_id, actor_user_id, "completed", note || "Middleman completed the exchange and saved final evidence.", evidence_url || null);
    await setTicketStatus(db, ticket, "Completed", actor_user_id, "Items transferred and ticket completed.");

    res.json(await getTicketPayload(db, ticket.ticket_code));
  } catch (err) {
    console.error("[COMPLETE_TICKET_ERROR]", err);
    res.status(500).json({ error: "Failed to complete ticket" });
  }
};

exports.cancelTicket = async (req, res) => {
  const db = await sql.getDB();
  try {
    const { ticketCode } = req.params;
    const { actor_user_id, reason } = req.body;
    const ticket = await fetchTicketByCode(db, ticketCode);

    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    if (ticket.status === "Completed") return res.status(400).json({ error: "Completed tickets cannot be cancelled" });

    await addTicketLog(db, ticket.ticket_id, actor_user_id, "cancelled", reason || "Ticket cancelled.");
    await setTicketStatus(db, ticket, "Cancelled", actor_user_id, reason || "Ticket cancelled.");

    res.json(await getTicketPayload(db, ticket.ticket_code));
  } catch (err) {
    console.error("[CANCEL_TICKET_ERROR]", err);
    res.status(500).json({ error: "Failed to cancel ticket" });
  }
};

exports.getTicket = async (req, res) => {
  const db = await sql.getDB();
  try {
    const payload = await getTicketPayload(db, req.params.ticketCode);
    if (!payload) return res.status(404).json({ error: "Ticket not found" });
    res.json(payload);
  } catch (err) {
    console.error("[GET_TICKET_ERROR]", err);
    res.status(500).json({ error: "Failed to fetch ticket" });
  }
};

exports.getUserTickets = async (req, res) => {
  const db = await sql.getDB();
  try {
    const { user_id } = req.params;
    const tickets = await db.all(
      `SELECT tt.*, creator.username AS creator_username, joiner.username AS joiner_username, middleman.username AS middleman_username
       FROM TradeTickets tt
       JOIN users creator ON tt.creator_user_id = creator.user_id
       LEFT JOIN users joiner ON tt.joiner_user_id = joiner.user_id
       LEFT JOIN users middleman ON tt.middleman_user_id = middleman.user_id
       WHERE tt.creator_user_id = ? OR tt.joiner_user_id = ? OR tt.middleman_user_id = ?
       ORDER BY tt.updated_at DESC`,
      [Number(user_id), Number(user_id), Number(user_id)]
    );
    res.json(tickets);
  } catch (err) {
    console.error("[GET_USER_TICKETS_ERROR]", err);
    res.status(500).json({ error: "Failed to fetch user tickets" });
  }
};

exports.getAdminTickets = async (req, res) => {
  const db = await sql.getDB();
  try {
    const tickets = await db.all(
      `SELECT tt.*, creator.username AS creator_username, joiner.username AS joiner_username, middleman.username AS middleman_username
       FROM TradeTickets tt
       JOIN users creator ON tt.creator_user_id = creator.user_id
       LEFT JOIN users joiner ON tt.joiner_user_id = joiner.user_id
       LEFT JOIN users middleman ON tt.middleman_user_id = middleman.user_id
       ORDER BY tt.updated_at DESC`
    );

    res.json({
      active: tickets.filter(t => !["Completed", "Cancelled"].includes(t.status)),
      verificationQueue: tickets.filter(t => ["Middleman Assigned", "In Verification"].includes(t.status)),
      completed: tickets.filter(t => t.status === "Completed"),
      cancelled: tickets.filter(t => t.status === "Cancelled")
    });
  } catch (err) {
    console.error("[GET_ADMIN_TICKETS_ERROR]", err);
    res.status(500).json({ error: "Failed to fetch admin tickets" });
  }
};
