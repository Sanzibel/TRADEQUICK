# QuickTrade: Capstone Hearing Presentation Notes

## 1. System Identity
- **Title**: QuickTrade
- **Tagline**: "Trade smarter, trade faster."
- **Theme**: Black & Gold (Luxury, Trust, Exclusivity)
- **Problem Statement**: Gamers lack a secure, centralized, and visually appealing platform for cross-game trading that ensures transaction integrity.

## 2. UI / UX Overview
- **Main Page**: Left Sidebar filters for game, category, and value. Center content with interactive item cards.
- **Item Posting**: Validated screenshot upload, automated value suggestions, and visibility controls.
- **Messaging**: Integrated chat system with conversation lists and reporting features for moderation.
- **Profile**: Centralized view of Favorites, Transaction History, and Account Settings.

## 3. Database Architecture (Task 4)
- **Relational Integrity**: 14 core tables with strict foreign key relationships.
- **Complex Transactions**:
  - Implementation of `BEGIN TRANSACTION`, `COMMIT`, and `ROLLBACK`.
  - Case Study: Initiating a trade offer locks both items involved. If the server fails mid-process, both items are automatically unlocked via rollback.

## 4. Reporting & Insights (Task 5)
- **Data Visualization**:
  - Bar Chart: Most traded games (Market Trends).
  - Pie Chart: Inventory distribution.
- **Operational Logs**: Real-time activity tracking for transparency.
- **Data Portability**: Exportable CSV reports for admin documentation.

## 5. Deployment & Scalability
- **Deployment Strategy**: Ready for AWS/Heroku.
- **Modular Design**: Separate layers for UI (React), API (Node/Express), and Data (SQL Server) allow for independent scaling.

## 6. Demo Screenshots
*(Insert screenshots of the Home page, Reports dashboard, and Trade modal here)*

---
**Presenter**: Miguel
**Project**: QuickTrade System
**Date**: May 7, 2026
