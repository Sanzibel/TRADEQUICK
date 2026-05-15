-- QuickTrade database schema
-- Target database: PostgreSQL / Neon
-- Local development uses the equivalent SQLite schema created in db.js.

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

CREATE INDEX IF NOT EXISTS idx_itemposts_user_id ON ItemPosts(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON Bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_item_offered ON Trades(item_offered);
CREATE INDEX IF NOT EXISTS idx_trades_item_requested ON Trades(item_requested);
CREATE INDEX IF NOT EXISTS idx_messages_trade_id ON Messages(trade_id);
CREATE INDEX IF NOT EXISTS idx_messages_convo_id ON Messages(convo_id);
CREATE INDEX IF NOT EXISTS idx_tradetickets_creator ON TradeTickets(creator_user_id);
CREATE INDEX IF NOT EXISTS idx_tradetickets_joiner ON TradeTickets(joiner_user_id);
CREATE INDEX IF NOT EXISTS idx_tradetickets_middleman ON TradeTickets(middleman_user_id);
CREATE INDEX IF NOT EXISTS idx_tradeticketitems_ticket_id ON TradeTicketItems(ticket_id);
CREATE INDEX IF NOT EXISTS idx_tradeticketlogs_ticket_id ON TradeTicketLogs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_tradetickethistory_ticket_id ON TradeTicketStatusHistory(ticket_id);
