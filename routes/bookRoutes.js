
import express from "express";

import {
  createBook,
  getBooks,
  getLibrarianBooks,
  getBookById,
  updateBook,
  deleteBook,
  unpublishBook,
} from "../controllers/bookController.js";

const router = express.Router();

router.post("/", createBook);
router.get("/", getBooks);
router.get("/librarian", getLibrarianBooks);
router.get("/:id", getBookById);
router.put("/:id", updateBook);
router.delete("/:id", deleteBook);
router.patch("/:id/unpublish", unpublishBook);

export default router;