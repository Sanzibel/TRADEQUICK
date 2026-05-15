const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { authenticateToken, requireAdmin } = require("../middleware/authMiddleware");

router.post("/games", authenticateToken, requireAdmin, adminController.addGame);
router.get("/games", adminController.getGames);
router.post("/categories", authenticateToken, requireAdmin, adminController.addCategory);
router.get("/categories", adminController.getCategories);
router.get("/stats", authenticateToken, requireAdmin, adminController.getStats);

module.exports = router;
