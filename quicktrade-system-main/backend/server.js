require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const authRoutes = require("./routes/auth");
const itemRoutes = require("./routes/items");
const tradeRoutes = require("./routes/trades");
const messageRoutes = require("./routes/messages");
const adminRoutes = require("./routes/admin");
const ticketRoutes = require("./routes/tickets");

app.use("/api/auth", authRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/trades", tradeRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/tickets", ticketRoutes);

if (process.env.NODE_ENV !== "production") {
  app.listen(5000, () => {
    console.log("Server running on port 5000");
  });
}

module.exports = app;
