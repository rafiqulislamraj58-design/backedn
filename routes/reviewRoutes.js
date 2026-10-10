
import { Router } from "express";

import { verifyToken } from "../middleware/auth.js";

import {
  createReview,
  getBookReviews,
  getMyReviews,
  updateMyReview,
  deleteMyReview,
} from "../controllers/reviewController.js";

const router = Router();

// Public route
router.get("/book/:bookId", getBookReviews);

// Protected routes
router.use(verifyToken);

router.get("/my", getMyReviews);
router.post("/", createReview);
router.patch("/:reviewId", updateMyReview);
router.delete("/:reviewId", deleteMyReview);

export default router;