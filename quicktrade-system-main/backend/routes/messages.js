const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");

router.post("/send", messageController.sendMessage);
router.get("/trade/:trade_id", messageController.getTradeMessages);
router.get("/user/:user_id", messageController.getConversations);

module.exports = router;
