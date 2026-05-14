const sql = require("../db");

exports.createTrade = async (req, res) => {
  const db = await sql.getDB();
  const isProduction = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.NODE_ENV === 'production';
  
  try {
    const { item_offered, item_requested, message, middleman } = req.body;
    console.log(`[CREATE_TRADE] Offering ${item_offered} for ${item_requested}`);

    // Transactions work differently in Neon (no manual BEGIN TRANSACTION needed for single-shot commands)
    // For simplicity and compatibility, we'll avoid manual BEGIN/COMMIT for now unless strictly needed
    if (!isProduction) await db.run('BEGIN TRANSACTION');

    // 1. Check if both items exist
    const items = await db.all(
      'SELECT post_id FROM ItemPosts WHERE post_id IN (?, ?)',
      [item_offered, item_requested]
    );

    const offeredExists = items.some(i => String(i.post_id) === String(item_offered));
    const requestedExists = items.some(i => String(i.post_id) === String(item_requested));

    if (!offeredExists || !requestedExists) {
      console.error(`[CREATE_TRADE] Items not found. Offered: ${offeredExists}, Requested: ${requestedExists}`);
      throw new Error("One or both items not found in listings");
    }

    // 2. Insert the trade record
    const tradeResult = await db.run(
      'INSERT INTO Trades (item_offered, item_requested, status, message, middleman, timestamp) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
      [item_offered, item_requested, 'pending', message, middleman]
    );

    const tradeId = tradeResult.lastID;

    if (!isProduction) await db.run('COMMIT');
    res.status(201).json({ message: "Trade offer sent!", trade_id: tradeId });
  } catch (err) {
    if (!isProduction && db) await db.run('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to create trade offer" });
  }
};

exports.respondTrade = async (req, res) => {
  const db = await sql.getDB();
  try {
    const { trade_id, action } = req.body; // action: 'in_escrow' or 'declined'

    if (!['in_escrow', 'declined'].includes(action)) {
      return res.status(400).json({ error: "Invalid action" });
    }

    await db.run('UPDATE Trades SET status = ? WHERE trade_id = ?', [action, trade_id]);
    
    res.json({ message: `Trade ${action === 'in_escrow' ? 'accepted' : action} successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to process trade response" });
  }
};

exports.cancelTrade = async (req, res) => {
  const db = await sql.getDB();
  const isProduction = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.NODE_ENV === 'production';
  
  try {
    const { trade_id } = req.body;

    if (!isProduction) await db.run('BEGIN TRANSACTION');

    // 1. Get items involved in this trade
    const tradeData = await db.get(
      'SELECT item_offered, item_requested FROM Trades WHERE trade_id = ? AND status = ?',
      [trade_id, 'pending']
    );

    if (!tradeData) {
      throw new Error("Trade not found or already processed");
    }

    const { item_offered, item_requested } = tradeData;

    // 2. Unlock items
    await db.run(
      'UPDATE Items SET tradable_status = 1 WHERE item_id IN (?, ?)',
      [item_offered, item_requested]
    );

    // 3. Update trade status
    await db.run(
      'UPDATE Trades SET status = ? WHERE trade_id = ?',
      ['cancelled', trade_id]
    );

    if (!isProduction) await db.run('COMMIT');
    res.json({ message: "Trade cancelled and items unlocked" });
  } catch (err) {
    if (!isProduction) await db.run('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to cancel trade" });
  }
};

exports.getReports = async (req, res) => {
  try {
    const db = await sql.getDB();
    
    // Report 1: Trades per game
    // Updated JOIN to ItemPosts which is used in production for trades
    const tradesPerGame = await db.all(`
      SELECT ip.game, COUNT(t.trade_id) AS total_trades 
      FROM Trades t
      JOIN ItemPosts ip ON t.item_offered = ip.post_id
      GROUP BY ip.game
    `);

    // Report 2: Item distribution by game
    const itemDistribution = await db.all(`
      SELECT game, COUNT(*) as count 
      FROM ItemPosts 
      GROUP BY game
    `);

    // Report 3: Recent Activity
    const recentActivity = await db.all(`
      SELECT t.trade_id, t.status, t.timestamp, ip1.name as offered_item, ip2.name as requested_item
      FROM Trades t
      JOIN ItemPosts ip1 ON t.item_offered = ip1.post_id
      JOIN ItemPosts ip2 ON t.item_requested = ip2.item_id
      ORDER BY t.timestamp DESC
      LIMIT 10
    `);

    res.json({
      tradesPerGame: tradesPerGame,
      itemDistribution: itemDistribution,
      recentActivity: recentActivity
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
};

exports.getUserTrades = async (req, res) => {
  try {
    const { user_id } = req.params;
    const db = await sql.getDB();
    
    // Fetch trades where the user is either the offerer or the requested item owner
    const trades = await db.all(`
      SELECT 
        t.trade_id, 
        t.status, 
        t.timestamp,
        t.message,
        t.middleman,
        ip_offered.name AS offered_item_name,
        ip_offered.value AS offered_item_value,
        ip_offered.game AS offered_item_game,
        ip_offered.screenshot_url AS offered_item_image,
        ip_requested.name AS requested_item_name,
        ip_requested.value AS requested_item_value,
        ip_requested.game AS requested_item_game,
        ip_requested.screenshot_url AS requested_item_image,
        u_offerer.username AS offerer_username,
        u_offerer.user_id AS offerer_user_id,
        u_requested.username AS owner_username,
        u_requested.user_id AS owner_user_id
      FROM Trades t
      JOIN ItemPosts ip_offered ON t.item_offered = ip_offered.post_id
      JOIN ItemPosts ip_requested ON t.item_requested = ip_requested.post_id
      JOIN users u_offerer ON ip_offered.user_id = u_offerer.user_id
      JOIN users u_requested ON ip_requested.user_id = u_requested.user_id
      WHERE ip_offered.user_id = ? OR ip_requested.user_id = ?
      ORDER BY t.timestamp DESC
    `, [Number(user_id), Number(user_id)]);

    console.log(`[getUserTrades] Found ${trades.length} trades for user ${user_id}`);
    res.json(trades);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user trades" });
  }
};

exports.updateTradeStatusDetail = async (req, res) => {
  try {
    const { trade_id, status_detail } = req.body;
    const db = await sql.getDB();
    await db.run(
      'UPDATE Trades SET status_detail = ? WHERE trade_id = ?',
      [status_detail, trade_id]
    );
    res.json({ message: "Trade status updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update trade status" });
  }
};
