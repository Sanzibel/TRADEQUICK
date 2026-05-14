const express = require("express");
const router = express.Router();
const ticketController = require("../controllers/ticketController");

router.post("/", ticketController.createTicket);
router.post("/join", ticketController.joinTicket);
router.get("/admin/overview", ticketController.getAdminTickets);
router.get("/user/:user_id", ticketController.getUserTickets);
router.get("/:ticketCode", ticketController.getTicket);
router.post("/:ticketCode/items", ticketController.submitItem);
router.post("/:ticketCode/assign-middleman", ticketController.assignMiddleman);
router.post("/:ticketCode/middleman-action", ticketController.middlemanAction);
router.post("/:ticketCode/complete", ticketController.completeTicket);
router.post("/:ticketCode/cancel", ticketController.cancelTicket);

module.exports = router;
