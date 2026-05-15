const path = require('path');
const { neon } = require('@neondatabase/serverless');

let db;
let initPromise = null;

// Improved production detection
const isVercel = process.env.VERCEL === '1' || !!process.env.NOW_REGION;
const hasPostgres = !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);
const isProduction = isVercel || hasPostgres || process.env.NODE_ENV === 'production';

const initDB = async () => {
    if (initPromise) return initPromise;

    initPromise = (async () => {
        const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;

        if (isProduction && dbUrl) {
            console.log("Production mode: Connecting to Neon PostgreSQL...");
            try {
                const cleanUrl = dbUrl.split('&channel_binding')[0];
                const sql = neon(cleanUrl);
                
                const dbInterface = {
                    get: async (query, params = []) => {
                        let count = 1;
                        const pgQuery = query.replace(/\?/g, () => `$${count++}`);
                        const rows = await sql(pgQuery, params);
                        return rows[0];
                    },
                    all: async (query, params = []) => {
                        let count = 1;
                        const pgQuery = query.replace(/\?/g, () => `$${count++}`);
                        return await sql(pgQuery, params);
                    },
                    run: async (query, params = []) => {
                        let count = 1;
                        const pgQuery = query.replace(/\?/g, () => `$${count++}`);
                        
                        if (pgQuery.trim().toUpperCase().startsWith('INSERT')) {
                            const returningQuery = `${pgQuery.replace(/;+$/, '')} RETURNING *`;
                            const rows = await sql(returningQuery, params);
                            const firstRow = rows[0];
                            if (!firstRow) return { lastID: null, changes: 0 };
                            const idKey = Object.keys(firstRow).find(k => k.toLowerCase().endsWith('_id') || k.toLowerCase() === 'id');
                            return { lastID: firstRow[idKey], changes: 1 };
                        }
                        
                        const rows = await sql(pgQuery, params);
                        return { lastID: null, changes: Array.isArray(rows) ? rows.length : 0 };
                    },
                    exec: async (query) => {
                        // For Neon, we split queries by semicolon to avoid "multiple commands" error
                        const queries = query.split(';').filter(q => q.trim() !== '');
                        for (const q of queries) {
                            await sql(q);
                        }
                        return;
                    }
                };

                // Create tables one by one
                await dbInterface.exec(`
                    CREATE TABLE IF NOT EXISTS users (
                        user_id SERIAL PRIMARY KEY,
                        full_name TEXT,
                        username TEXT UNIQUE NOT NULL,
                        email TEXT UNIQUE NOT NULL,
                        password TEXT NOT NULL,
                        role TEXT DEFAULT 'user',
                        premium_status INTEGER DEFAULT 0,
                        balance DECIMAL(18, 2) DEFAULT 0.00,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );

                    CREATE TABLE IF NOT EXISTS Items (
                        item_id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        game TEXT NOT NULL,
                        name TEXT NOT NULL,
                        description TEXT,
                        value DECIMAL(18, 2) NOT NULL,
                        tradable_status INTEGER DEFAULT 1,
                        image TEXT,
                        FOREIGN KEY (user_id) REFERENCES users(user_id)
                    );

                    CREATE TABLE IF NOT EXISTS ItemPosts (
                        post_id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        screenshot_url TEXT,
                        name TEXT NOT NULL,
                        game TEXT NOT NULL,
                        description TEXT,
                        value DECIMAL(18, 2) NOT NULL,
                        category TEXT,
                        tags TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(user_id)
                    );

                    CREATE TABLE IF NOT EXISTS Trades (
                        trade_id SERIAL PRIMARY KEY,
                        item_offered INTEGER NOT NULL,
                        item_requested INTEGER NOT NULL,
                        status TEXT DEFAULT 'pending',
                        status_detail TEXT DEFAULT 'initial',
                        message TEXT,
                        middleman TEXT,
                        escrow_fee DECIMAL(18, 2) DEFAULT 0.00,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (item_offered) REFERENCES ItemPosts(post_id),
                        FOREIGN KEY (item_requested) REFERENCES ItemPosts(post_id)
                    );

                    CREATE TABLE IF NOT EXISTS Conversations (
                        convo_id SERIAL PRIMARY KEY,
                        user1_id INTEGER NOT NULL,
                        user2_id INTEGER NOT NULL,
                        last_message TEXT,
                        last_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user1_id) REFERENCES users(user_id),
                        FOREIGN KEY (user2_id) REFERENCES users(user_id)
                    );

                    CREATE TABLE IF NOT EXISTS Messages (
                        msg_id SERIAL PRIMARY KEY,
                        sender_id INTEGER NOT NULL,
                        receiver_id INTEGER,
                        convo_id INTEGER,
                        trade_id INTEGER,
                        content TEXT NOT NULL,
                        type TEXT DEFAULT 'user',
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (convo_id) REFERENCES Conversations(convo_id),
                        FOREIGN KEY (trade_id) REFERENCES Trades(trade_id)
                    );

                    CREATE TABLE IF NOT EXISTS TradeLogs (
                        log_id SERIAL PRIMARY KEY,
                        trade_id INTEGER NOT NULL,
                        event TEXT NOT NULL,
                        details TEXT,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (trade_id) REFERENCES Trades(trade_id)
                    );

                    CREATE TABLE IF NOT EXISTS Games (
                        game_id SERIAL PRIMARY KEY,
                        name TEXT UNIQUE NOT NULL,
                        category TEXT,
                        image_url TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );

                    CREATE TABLE IF NOT EXISTS Categories (
                        category_id SERIAL PRIMARY KEY,
                        name TEXT UNIQUE NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );

                    CREATE TABLE IF NOT EXISTS Bookmarks (
                        bookmark_id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        post_id INTEGER NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(user_id),
                        FOREIGN KEY (post_id) REFERENCES ItemPosts(post_id),
                        UNIQUE(user_id, post_id)
                    );

                    CREATE TABLE IF NOT EXISTS TradeTickets (
                        ticket_id SERIAL PRIMARY KEY,
                        ticket_code TEXT UNIQUE NOT NULL,
                        creator_user_id INTEGER NOT NULL,
                        joiner_user_id INTEGER,
                        middleman_user_id INTEGER,
                        status TEXT DEFAULT 'Pending',
                        invite_note TEXT,
                        completed_at TIMESTAMP,
                        cancelled_at TIMESTAMP,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (creator_user_id) REFERENCES users(user_id),
                        FOREIGN KEY (joiner_user_id) REFERENCES users(user_id),
                        FOREIGN KEY (middleman_user_id) REFERENCES users(user_id)
                    );

                    CREATE TABLE IF NOT EXISTS TradeTicketItems (
                        item_submission_id SERIAL PRIMARY KEY,
                        ticket_id INTEGER NOT NULL,
                        user_id INTEGER NOT NULL,
                        game_name TEXT NOT NULL,
                        item_name TEXT NOT NULL,
                        quantity INTEGER DEFAULT 1,
                        screenshot_url TEXT,
                        notes TEXT,
                        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (ticket_id) REFERENCES TradeTickets(ticket_id),
                        FOREIGN KEY (user_id) REFERENCES users(user_id),
                        UNIQUE(ticket_id, user_id)
                    );

                    CREATE TABLE IF NOT EXISTS TradeTicketLogs (
                        log_id SERIAL PRIMARY KEY,
                        ticket_id INTEGER NOT NULL,
                        actor_user_id INTEGER,
                        event_type TEXT NOT NULL,
                        message TEXT,
                        evidence_url TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (ticket_id) REFERENCES TradeTickets(ticket_id),
                        FOREIGN KEY (actor_user_id) REFERENCES users(user_id)
                    );

                    CREATE TABLE IF NOT EXISTS TradeTicketStatusHistory (
                        history_id SERIAL PRIMARY KEY,
                        ticket_id INTEGER NOT NULL,
                        previous_status TEXT,
                        new_status TEXT NOT NULL,
                        changed_by INTEGER,
                        note TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (ticket_id) REFERENCES TradeTickets(ticket_id),
                        FOREIGN KEY (changed_by) REFERENCES users(user_id)
                    );
                `);

                // PostgreSQL Migration logic
                try {
                    await dbInterface.run('ALTER TABLE Messages ALTER COLUMN convo_id DROP NOT NULL');
                } catch (e) { console.log("Postgres Migration Info: convo_id nullability update."); }

                try {
                    await dbInterface.run('ALTER TABLE Trades ADD COLUMN IF NOT EXISTS status_detail TEXT DEFAULT \'initial\'');
                } catch (e) { console.log("Postgres Migration Info: status_detail column check."); }

                try {
                    await dbInterface.run('ALTER TABLE Messages ADD COLUMN IF NOT EXISTS type TEXT DEFAULT \'user\'');
                } catch (e) { console.log("Postgres Migration Info: message type column check."); }

                try {
                    await dbInterface.run('ALTER TABLE Messages ADD COLUMN IF NOT EXISTS trade_id INTEGER');
                } catch (e) { console.log("Postgres Migration Info: trade_id column check."); }

                try {
                    await dbInterface.run('ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT \'user\'');
                } catch (e) { console.log("Postgres Migration Info: user role column check."); }

                console.log("PostgreSQL Tables Verified/Created and Migrated");
                db = dbInterface;
                return db;
            } catch (err) {
                console.error("Failed to initialize PostgreSQL:", err);
                initPromise = null;
                throw err;
            }
        } else if (!isVercel) {
            // Local SQLite
            console.log("Local mode: Connecting to SQLite...");
            try {
                const sqlite3 = require('sqlite3');
                const { open } = require('sqlite');
                
                const sqliteDB = await open({
                    filename: path.join(__dirname, 'quicktrade.db'),
                    driver: sqlite3.Database
                });
                await sqliteDB.get('PRAGMA foreign_keys = ON');
                
                await sqliteDB.exec(`
                    CREATE TABLE IF NOT EXISTS users (
                        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
                        full_name TEXT,
                        username TEXT UNIQUE NOT NULL,
                        email TEXT UNIQUE NOT NULL,
                        password TEXT NOT NULL,
                        role TEXT DEFAULT 'user',
                        premium_status INTEGER DEFAULT 0,
                        balance DECIMAL(18, 2) DEFAULT 0.00,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    );

                    CREATE TABLE IF NOT EXISTS Items (
                        item_id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        game TEXT NOT NULL,
                        name TEXT NOT NULL,
                        description TEXT,
                        value DECIMAL(18, 2) NOT NULL,
                        tradable_status INTEGER DEFAULT 1,
                        image TEXT,
                        FOREIGN KEY (user_id) REFERENCES users(user_id)
                    );

                    CREATE TABLE IF NOT EXISTS ItemPosts (
                        post_id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        screenshot_url TEXT,
                        name TEXT NOT NULL,
                        game TEXT NOT NULL,
                        description TEXT,
                        value DECIMAL(18, 2) NOT NULL,
                        category TEXT,
                        tags TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(user_id)
                    );

                    CREATE TABLE IF NOT EXISTS Trades (
                        trade_id INTEGER PRIMARY KEY AUTOINCREMENT,
                        item_offered INTEGER NOT NULL,
                        item_requested INTEGER NOT NULL,
                        status TEXT DEFAULT 'pending',
                        status_detail TEXT DEFAULT 'initial',
                        message TEXT,
                        middleman TEXT,
                        escrow_fee DECIMAL(18, 2) DEFAULT 0.00,
                        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (item_offered) REFERENCES ItemPosts(post_id),
                        FOREIGN KEY (item_requested) REFERENCES ItemPosts(post_id)
                    );

                    CREATE TABLE IF NOT EXISTS Conversations (
                        convo_id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user1_id INTEGER NOT NULL,
                        user2_id INTEGER NOT NULL,
                        last_message TEXT,
                        last_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user1_id) REFERENCES users(user_id),
                        FOREIGN KEY (user2_id) REFERENCES users(user_id)
                    );

                    CREATE TABLE IF NOT EXISTS Messages (
                        msg_id INTEGER PRIMARY KEY AUTOINCREMENT,
                        sender_id INTEGER NOT NULL,
                        receiver_id INTEGER,
                        convo_id INTEGER,
                        trade_id INTEGER,
                        content TEXT NOT NULL,
                        type TEXT DEFAULT 'user',
                        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (convo_id) REFERENCES Conversations(convo_id),
                        FOREIGN KEY (trade_id) REFERENCES Trades(trade_id)
                    );

                    CREATE TABLE IF NOT EXISTS Games (
                        game_id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT UNIQUE NOT NULL,
                        category TEXT,
                        image_url TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    );

                    CREATE TABLE IF NOT EXISTS Categories (
                        category_id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT UNIQUE NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    );

                    CREATE TABLE IF NOT EXISTS Bookmarks (
                        bookmark_id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        post_id INTEGER NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(user_id),
                        FOREIGN KEY (post_id) REFERENCES ItemPosts(post_id),
                        UNIQUE(user_id, post_id)
                    );

                    CREATE TABLE IF NOT EXISTS TradeTickets (
                        ticket_id INTEGER PRIMARY KEY AUTOINCREMENT,
                        ticket_code TEXT UNIQUE NOT NULL,
                        creator_user_id INTEGER NOT NULL,
                        joiner_user_id INTEGER,
                        middleman_user_id INTEGER,
                        status TEXT DEFAULT 'Pending',
                        invite_note TEXT,
                        completed_at DATETIME,
                        cancelled_at DATETIME,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (creator_user_id) REFERENCES users(user_id),
                        FOREIGN KEY (joiner_user_id) REFERENCES users(user_id),
                        FOREIGN KEY (middleman_user_id) REFERENCES users(user_id)
                    );

                    CREATE TABLE IF NOT EXISTS TradeTicketItems (
                        item_submission_id INTEGER PRIMARY KEY AUTOINCREMENT,
                        ticket_id INTEGER NOT NULL,
                        user_id INTEGER NOT NULL,
                        game_name TEXT NOT NULL,
                        item_name TEXT NOT NULL,
                        quantity INTEGER DEFAULT 1,
                        screenshot_url TEXT,
                        notes TEXT,
                        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (ticket_id) REFERENCES TradeTickets(ticket_id),
                        FOREIGN KEY (user_id) REFERENCES users(user_id),
                        UNIQUE(ticket_id, user_id)
                    );

                    CREATE TABLE IF NOT EXISTS TradeTicketLogs (
                        log_id INTEGER PRIMARY KEY AUTOINCREMENT,
                        ticket_id INTEGER NOT NULL,
                        actor_user_id INTEGER,
                        event_type TEXT NOT NULL,
                        message TEXT,
                        evidence_url TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (ticket_id) REFERENCES TradeTickets(ticket_id),
                        FOREIGN KEY (actor_user_id) REFERENCES users(user_id)
                    );

                    CREATE TABLE IF NOT EXISTS TradeTicketStatusHistory (
                        history_id INTEGER PRIMARY KEY AUTOINCREMENT,
                        ticket_id INTEGER NOT NULL,
                        previous_status TEXT,
                        new_status TEXT NOT NULL,
                        changed_by INTEGER,
                        note TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (ticket_id) REFERENCES TradeTickets(ticket_id),
                        FOREIGN KEY (changed_by) REFERENCES users(user_id)
                    );
                `);
                const migrations = [
                    'ALTER TABLE Trades ADD COLUMN status_detail TEXT DEFAULT "initial"',
                    'ALTER TABLE Messages ADD COLUMN type TEXT DEFAULT "user"',
                    'ALTER TABLE Messages ADD COLUMN trade_id INTEGER',
                    'ALTER TABLE users ADD COLUMN role TEXT DEFAULT "user"',
                    'CREATE TABLE IF NOT EXISTS TradeLogs (log_id INTEGER PRIMARY KEY AUTOINCREMENT, trade_id INTEGER, event TEXT, details TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)'
                ];
                for (const migration of migrations) {
                    try {
                        await sqliteDB.run(migration);
                    } catch (e) {
                        // Existing local databases may already have these columns.
                    }
                }
                db = sqliteDB;
                return db;
            } catch (err) {
                console.error("SQLite load error:", err);
                throw err;
            }
        } else {
            throw new Error("Database configuration missing for Vercel. Please set DATABASE_URL.");
        }
    })();

    return initPromise;
};

const sqlHelper = {
    query: async (queryStr, params = []) => {
        const database = await initDB();
        if (isProduction) {
            let count = 1;
            const pgQuery = queryStr.replace(/\?/g, () => `$${count++}`);
            const rows = await database.all(pgQuery, params);
            return { recordset: rows };
        } else {
            return { recordset: await database.all(queryStr, params) };
        }
    },
    getDB: async () => await initDB()
};

module.exports = sqlHelper;
