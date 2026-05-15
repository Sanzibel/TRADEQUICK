const express = require("express");
const router = express.Router();
const itemController = require("../controllers/itemController");
const { authenticateToken, requireAdmin } = require("../middleware/authMiddleware");

router.post("/post", itemController.postItem);
router.get("/", itemController.getItems);
router.get("/inventory/:user_id", itemController.getUserInventory);
router.post("/bookmark", itemController.toggleBookmark);
router.get("/bookmarks/:user_id", itemController.getBookmarks);
router.delete("/admin/listings/:post_id", authenticateToken, requireAdmin, itemController.adminDeleteListing);
router.get("/listings/:user_id", itemController.getUserListings);
router.delete("/listings/:post_id", itemController.deleteListing);

module.exports = router;
