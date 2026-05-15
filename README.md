# QuickTrade

QuickTrade is a web-based digital item trading system. It allows users to register, post game items, bookmark listings, create trade offers, exchange messages, and use middleman-assisted trade tickets for safer transactions.

## Technology Stack

### Frontend

- React.js
- Vite
- Axios
- CSS

### Backend

- Node.js
- Express.js
- JWT authentication
- bcrypt password hashing

### Database

- SQLite for local development
- PostgreSQL / Neon for production deployment

## Core Modules

- Authentication and user accounts
- Item posting and listing management
- Bookmark management
- Direct trade offers
- Trade messaging
- Middleman-assisted trade tickets
- Ticket item declarations
- Ticket verification logs and status history
- Admin-managed games and categories
- Reports and analytics

## Main Database Tables

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

## Development Setup

Install dependencies from the repository root:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The backend source is located in:

```text
quicktrade-system-main/backend
```

The database schema reference is located in:

```text
quicktrade-system-main/backend/database.sql
```

The runtime database initialization logic is located in:

```text
quicktrade-system-main/backend/db.js
```
