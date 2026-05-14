const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

// Admin routes (In a real app, these would be protected by admin middleware)
router.post("/games", adminController.addGame);
router.get("/games", adminController.getGames);
router.post("/categories", adminController.addCategory);
router.get("/categories", adminController.getCategories);
router.get("/stats", adminController.getStats);

module.exports = router;
