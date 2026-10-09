const express = require("express");
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const {
  getStats,
  getAnalytics,
  getUsers,
  updateUserRole,
  deleteUser,
  getAdminBooks,
  approveBook,
  unpublishBookAdmin,
  deleteBookAdmin,
  getTransactions,
} = require("../controllers/adminController");

const router = express.Router();

router.use(verifyToken, verifyAdmin);

router.get("/stats", getStats);
router.get("/analytics", getAnalytics);

router.get("/users", getUsers);
router.patch("/users/:id/role", updateUserRole);
router.delete("/users/:id", deleteUser);

router.get("/books", getAdminBooks);
router.patch("/books/:id/approve", approveBook);
router.patch("/books/:id/unpublish", unpublishBookAdmin);
router.delete("/books/:id", deleteBookAdmin);

router.get("/transactions", getTransactions);

module.exports = router;