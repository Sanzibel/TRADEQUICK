const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");

router.post("/send", messageController.sendMessage);
router.get("/trade/:trade_id", messageController.getTradeMessages);
router.get("/user/:user_id", messageController.getConversations);
router.post("/support", messageController.createSupportTicket);
router.get("/support/user/:user_id", messageController.getUserSupportTickets);
router.get("/support/admin", messageController.getAdminSupportTickets);
router.post("/support/:convo_id/reply", messageController.replySupportTicket);
router.patch("/support/:convo_id/status", messageController.updateSupportStatus);

module.exports = router;
