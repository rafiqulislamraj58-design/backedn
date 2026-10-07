const express = require("express");

const {
  createBook,
  getBooks,
  getBookById,
  updateBook,
  deleteBook,
  unpublishBook,
} = require("../controllers/bookController");

const router = express.Router();

router.post("/", createBook);
router.get("/", getBooks);
router.get("/:id", getBookById);
router.put("/:id", updateBook);
router.delete("/:id", deleteBook);
router.patch("/:id/unpublish", unpublishBook);

module.exports = router;