
import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";

// Create a review
export const createReview = async (req, res) => {
  try {
    const email = req.user?.email;
    const { bookId, rating, comment } = req.body;

    if (!email) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!ObjectId.isValid(bookId)) {
      return res.status(400).json({
        message: "Invalid book ID",
      });
    }

    const score = Number(rating);

    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return res.status(400).json({
        message: "Rating must be between 1 and 5",
      });
    }

    if (
      typeof comment !== "string" ||
      comment.trim().length < 2 ||
      comment.trim().length > 2000
    ) {
      return res.status(400).json({
        message: "Comment must be 2-2000 characters",
      });
    }

    const db = getDB();

    // Review is allowed only after delivery
    const delivery = await db.collection("deliveries").findOne({
      clientEmail: email,
      bookId: {
        $in: [bookId, new ObjectId(bookId)],
      },
      status: "Delivered",
    });

    if (!delivery) {
      return res.status(403).json({
        message: "You can review only a delivered book",
      });
    }

    const reviews = db.collection("reviews");

    const existingReview = await reviews.findOne({
      bookId: new ObjectId(bookId),
      userEmail: email,
    });

    if (existingReview) {
      return res.status(409).json({
        message: "You have already reviewed this book",
      });
    }

    const review = {
      bookId: new ObjectId(bookId),
      userEmail: email,
      rating: score,
      comment: comment.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await reviews.insertOne(review);

    return res.status(201).json({
      message: "Review created successfully",
      data: {
        ...review,
        _id: result.insertedId,
      },
    });
  } catch (error) {
    console.error("Create review error:", error);

    return res.status(500).json({
      message: "Failed to create review",
    });
  }
};

// Get reviews for a book
export const getBookReviews = async (req, res) => {
  try {
    const { bookId } = req.params;

    if (!ObjectId.isValid(bookId)) {
      return res.status(400).json({
        message: "Invalid book ID",
      });
    }

    const reviews = await getDB()
      .collection("reviews")
      .find({
        bookId: new ObjectId(bookId),
      })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      data: reviews,
    });
  } catch (error) {
    console.error("Get reviews error:", error);

    return res.status(500).json({
      message: "Failed to fetch reviews",
    });
  }
};

// Get logged-in user's reviews
export const getMyReviews = async (req, res) => {
  try {
    const email = req.user?.email;

    if (!email) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const reviews = await getDB()
      .collection("reviews")
      .find({ userEmail: email })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      data: reviews,
    });
  } catch (error) {
    console.error("Get my reviews error:", error);

    return res.status(500).json({
      message: "Failed to fetch your reviews",
    });
  }
};

// Update logged-in user's review
export const updateMyReview = async (req, res) => {
  try {
    const email = req.user?.email;
    const { reviewId } = req.params;
    const { rating, comment } = req.body;

    if (!email) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!ObjectId.isValid(reviewId)) {
      return res.status(400).json({
        message: "Invalid review ID",
      });
    }

    const updates = {
      updatedAt: new Date(),
    };

    if (rating !== undefined) {
      const score = Number(rating);

      if (!Number.isInteger(score) || score < 1 || score > 5) {
        return res.status(400).json({
          message: "Rating must be between 1 and 5",
        });
      }

      updates.rating = score;
    }

    if (comment !== undefined) {
      if (
        typeof comment !== "string" ||
        comment.trim().length < 2 ||
        comment.trim().length > 2000
      ) {
        return res.status(400).json({
          message: "Invalid comment",
        });
      }

      updates.comment = comment.trim();
    }

    if (Object.keys(updates).length === 1) {
      return res.status(400).json({
        message: "Provide a rating or comment",
      });
    }

    const result = await getDB()
      .collection("reviews")
      .updateOne(
        {
          _id: new ObjectId(reviewId),
          userEmail: email,
        },
        {
          $set: updates,
        }
      );

    if (!result.matchedCount) {
      return res.status(404).json({
        message: "Review not found",
      });
    }

    return res.status(200).json({
      message: "Review updated successfully",
    });
  } catch (error) {
    console.error("Update review error:", error);

    return res.status(500).json({
      message: "Failed to update review",
    });
  }
};

// Delete logged-in user's review
export const deleteMyReview = async (req, res) => {
  try {
    const email = req.user?.email;
    const { reviewId } = req.params;

    if (!email) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!ObjectId.isValid(reviewId)) {
      return res.status(400).json({
        message: "Invalid review ID",
      });
    }

    const result = await getDB()
      .collection("reviews")
      .deleteOne({
        _id: new ObjectId(reviewId),
        userEmail: email,
      });

    if (!result.deletedCount) {
      return res.status(404).json({
        message: "Review not found",
      });
    }

    return res.status(200).json({
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Delete review error:", error);

    return res.status(500).json({
      message: "Failed to delete review",
    });
  }
};