# QuickTrade System

**Trade smarter, trade faster.**

QuickTrade is a luxury-themed, cross-game trading platform designed for gamers to securely exchange digital assets across multiple titles like Counter Strike 2, Roblox, Dota 2, and Warframe.

## 🌟 Key Features

- **Black & Gold Luxury Theme**: A high-end UI designed for trust and exclusivity.
- **Cross-Game Trading**: Simulate trades across different gaming ecosystems.
- **Relational Database with Transactions**: Task 4 implementation ensuring data integrity and rollbacks.
- **Analytics & Reporting**: Task 5 implementation with dynamic charts and CSV exports.
- **Private Messaging**: Real-time communication between traders.
- **Item Posting Flow**: Securely list items with screenshot validation and trade preferences.

## 🚀 Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- [SQL Server](https://www.microsoft.com/en-us/sql-server/) (for backend database)

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd quicktrade-system-main/backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Initialize the database:
   - Open SQL Server Management Studio.
   - Execute the [database.sql](./backend/database.sql) script to create all required tables and relationships.
4. Start the server:
   ```bash
   npm start
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd quicktrade-system-main/frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## 📊 Task 4 & 5 Highlights

### Task 4: Database Transactions
The system uses atomic SQL transactions to handle trade offers. When a trade is initiated:
1. Both items are checked for availability.
2. A trade record is created.
3. Both items are "locked" (tradable_status = 0).
If any step fails, the entire process is rolled back to prevent data corruption.

### Task 5: Reporting & Visualization
The `/reports` dashboard provides:
- **Bar Charts**: Trades per game volume.
- **Pie Charts**: Item distribution by category.
- **Activity Logs**: Real-time log of system transactions.
- **Export**: Ability to export activity logs as CSV.

## 🛠️ Tech Stack
- **Frontend**: React.js, Vite, Chart.js
- **Backend**: Node.js, Express.js
- **Database**: MS SQL Server
- **Theme**: Custom Black & Gold CSS

---
© 2026 QuickTrade System | Capstone Project
