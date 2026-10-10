
import express from "express";

import {
  verifyToken,
  verifyAdmin,
} from "../middleware/auth.js";

import {
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
} from "../controllers/adminController.js";

const router = express.Router();

// Admin authentication and authorization
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

export default router;