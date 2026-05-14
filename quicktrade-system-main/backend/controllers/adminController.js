const sql = require("../db");

exports.addGame = async (req, res) => {
    const db = await sql.getDB();
    try {
        const { name, category, image_url } = req.body;
        const result = await db.run(
            'INSERT INTO Games (name, category, image_url) VALUES (?, ?, ?)',
            [name, category, image_url]
        );
        res.status(201).json({ message: "Game added successfully", game_id: result.lastID });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to add game" });
    }
};

exports.getGames = async (req, res) => {
    const db = await sql.getDB();
    try {
        const games = await db.all('SELECT * FROM Games ORDER BY name ASC');
        res.json(games);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch games" });
    }
};

exports.addCategory = async (req, res) => {
    const db = await sql.getDB();
    try {
        const { name } = req.body;
        const result = await db.run(
            'INSERT INTO Categories (name) VALUES (?)',
            [name]
        );
        res.status(201).json({ message: "Category added successfully", category_id: result.lastID });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to add category" });
    }
};

exports.getCategories = async (req, res) => {
    const db = await sql.getDB();
    try {
        const categories = await db.all('SELECT * FROM Categories ORDER BY name ASC');
        res.json(categories);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch categories" });
    }
};

exports.getStats = async (req, res) => {
    const db = await sql.getDB();
    try {
        const userCount = await db.get('SELECT COUNT(*) as count FROM users');
        const itemCount = await db.get('SELECT COUNT(*) as count FROM Items');
        const tradeCount = await db.get('SELECT COUNT(*) as count FROM Trades');
        
        res.json({
            users: userCount.count,
            items: itemCount.count,
            trades: tradeCount.count
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch stats" });
    }
};
