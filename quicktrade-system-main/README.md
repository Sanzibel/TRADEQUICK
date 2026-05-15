# QuickTrade System

**Trade smarter, trade faster.**

QuickTrade is a cross-game digital item trading platform for securely listing, bookmarking, offering, messaging, and completing trades. The system includes a middleman-assisted trade ticket workflow for safer user-to-user exchanges.

## Key Features

- User registration, login, and account verification
- Public item posting with screenshots, categories, tags, and estimated values
- Bookmarking for saved item listings
- Direct trade offers between listed items
- Trade messages and conversation support
- Middleman-assisted trade tickets with item declarations, evidence uploads, logs, and status history
- Admin-managed games and categories
- Reports and analytics for item and trade activity

## Framework Development & Core

### Software and Tools Used

#### Web App Development

##### Backend

- Node.js
- Express.js
- Used for creating backend API routes and controllers.
- Handles authentication, item listings, bookmarks, direct trades, trade tickets, messages, admin functions, reports, and the middleman workflow.

##### Database

- SQLite for local development
- PostgreSQL / Neon for production deployment
- Stores users, item posts, bookmarks, trades, messages, conversations, games, categories, trade tickets, ticket items, ticket logs, ticket status history, and trade logs.
- Uses relational tables with primary keys, foreign keys, unique constraints, and indexes.

##### Frontend

- React.js
- Vite
- Axios
- CSS modules/stylesheets
- Used for building the user interface and communicating with backend API endpoints.
- Handles login, registration, home, profile, item posting, trade offers, trade tickets, admin queue, reports, help, privacy policy, and terms pages.

## Project Structure

```text
QuickTrade-main/
  api/
    index.js
  src/
    components/
    pages/
    App.jsx
    main.jsx
  quicktrade-system-main/
    backend/
      controllers/
      routes/
      database.sql
      db.js
      server.js
```

## Database Design

The current database schema is defined and initialized in:

```text
quicktrade-system-main/backend/db.js
```

The formal SQL reference is maintained in:

```text
quicktrade-system-main/backend/database.sql
```

The main tables are:

- `users`
- `Items`
- `ItemPosts`
- `Bookmarks`
- `Trades`
- `TradeLogs`
- `Conversations`
- `Messages`
- `Games`
- `Categories`
- `TradeTickets`
- `TradeTicketItems`
- `TradeTicketLogs`
- `TradeTicketStatusHistory`

## Installation and Setup

### Prerequisites

- Node.js v18 or higher
- npm
- Optional production database: Neon PostgreSQL

### Frontend and API Setup

From the repository root:

```bash
npm install
npm run dev
```

The frontend is served by Vite. API requests are routed to the Express backend through the project configuration.

### Backend Setup

From the backend directory:

```bash
cd quicktrade-system-main/backend
npm install
npm start
```

For local development, the backend uses SQLite and creates the required tables automatically through `db.js`.

For production, set one of the following environment variables:

```text
POSTGRES_URL
DATABASE_URL
```

When a PostgreSQL database URL is provided, the backend connects to Neon/PostgreSQL and verifies the required tables on startup.

## Notes

- `database.sql` is a schema reference for documentation and deployment review.
- `db.js` is the runtime source of truth used by the application to initialize local SQLite and production PostgreSQL databases.
- `quicktrade.db` is a local SQLite database file and may change during development.
