const sql = require("../db");

exports.postItem = async (req, res) => {
  try {
    const { user_id, name, game, description, value, category, tags, screenshot_url } = req.body;
    const db = await sql.getDB();
    
    const result = await db.run(
      'INSERT INTO ItemPosts (user_id, name, game, description, value, category, tags, screenshot_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [user_id, name, game, description, value, category, tags, screenshot_url]
    );

    res.status(201).json({ message: "Item posted successfully", post_id: result.lastID });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to post item" });
  }
};

exports.getItems = async (req, res) => {
  try {
    const db = await sql.getDB();
    const items = await db.all('SELECT * FROM ItemPosts ORDER BY post_id DESC');
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch items" });
  }
};

exports.getUserInventory = async (req, res) => {
  try {
    const { user_id } = req.params;
    const db = await sql.getDB();
    const inventory = await db.all('SELECT * FROM Items WHERE user_id = ?', [user_id]);
    res.json(inventory);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
};

exports.toggleBookmark = async (req, res) => {
  try {
    const { user_id, post_id } = req.body;
    const db = await sql.getDB();
    
    const existing = await db.get('SELECT * FROM Bookmarks WHERE user_id = ? AND post_id = ?', [user_id, post_id]);
    
    if (existing) {
      await db.run('DELETE FROM Bookmarks WHERE user_id = ? AND post_id = ?', [user_id, post_id]);
      res.json({ message: "Bookmark removed", status: "removed" });
    } else {
      await db.run('INSERT INTO Bookmarks (user_id, post_id) VALUES (?, ?)', [user_id, post_id]);
      res.json({ message: "Bookmark added", status: "added" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to toggle bookmark" });
  }
};

exports.getBookmarks = async (req, res) => {
  try {
    const { user_id } = req.params;
    const db = await sql.getDB();
    const bookmarks = await db.all(`
      SELECT ip.* FROM ItemPosts ip
      JOIN Bookmarks b ON ip.post_id = b.post_id
      WHERE b.user_id = ?
    `, [user_id]);
    res.json(bookmarks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch bookmarks" });
  }
};

exports.getUserListings = async (req, res) => {
  try {
    const { user_id } = req.params;
    const db = await sql.getDB();
    const listings = await db.all('SELECT * FROM ItemPosts WHERE user_id = ? ORDER BY created_at DESC', [Number(user_id)]);
    res.json(listings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user listings" });
  }
};

exports.deleteListing = async (req, res) => {
  try {
    const { post_id } = req.params;
    const { user_id } = req.body;
    const db = await sql.getDB();
    
    // Security check: ensure the user owns the listing
    const listing = await db.get('SELECT user_id FROM ItemPosts WHERE post_id = ?', [post_id]);
    if (!listing || listing.user_id !== parseInt(user_id)) {
      return res.status(403).json({ error: "Unauthorized to delete this listing" });
    }

    await db.run('DELETE FROM ItemPosts WHERE post_id = ?', [post_id]);
    // Also remove any bookmarks for this post
    await db.run('DELETE FROM Bookmarks WHERE post_id = ?', [post_id]);
    
    res.json({ message: "Listing removed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete listing" });
  }
};
