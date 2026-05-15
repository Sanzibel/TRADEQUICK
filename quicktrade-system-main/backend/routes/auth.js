const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authenticateToken } = require("../middleware/authMiddleware");

router.post("/login", authController.login);
router.post("/register", authController.register);
router.get("/verify/:user_id", authController.verifyUser);
router.put("/profile/:user_id", authenticateToken, authController.updateProfile);

module.exports = router;
