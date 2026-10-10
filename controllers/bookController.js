
import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";

const getBooksCollection = () => {
  const db = getDB();
  return db.collection("books");
};

const createBook = async (req, res) => {
  try {
    const data = req.body || {};

    const title = data.title?.trim();
    const author = data.author?.trim();
    const description = data.description?.trim();
    const category = data.category?.trim();
    const image = data.image?.trim();

    // Prefer the authenticated user's email.
    // The body fallback supports the current frontend.
    const email =
      req.user?.email ||
      req.user?.user?.email ||
      data.librarianEmail ||
      data.email;

    if (!title || !author || !description || !category || !image) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required book information.",
      });
    }

    if (!email || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Librarian email is required.",
      });
    }

    const deliveryFee = Number(data.deliveryFee);

    if (
      data.deliveryFee === "" ||
      data.deliveryFee === undefined ||
      !Number.isFinite(deliveryFee) ||
      deliveryFee < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid delivery fee.",
      });
    }

    const librarianEmail = email.trim().toLowerCase();

    const book = {
      title,
      author,
      description,
      category,
      image,
      deliveryFee,
      librarianEmail,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const collection = getBooksCollection();
    const result = await collection.insertOne(book);

    return res.status(201).json({
      success: true,
      message: "Book saved successfully.",
      book: {
        ...book,
        _id: result.insertedId,
      },
    });
  } catch (error) {
    console.error("Create book error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to save book.",
    });
  }
};

const getBooks = async (req, res) => {
  try {
    const books = await getBooksCollection()
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      books,
    });
  } catch (error) {
    console.error("Get books error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch books.",
    });
  }
};

const getLibrarianBooks = async (req, res) => {
  try {
    const email = req.query.email;

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        success: false,
        message: "Librarian email is required.",
      });
    }

    const books = await getBooksCollection()
      .find({
        librarianEmail: email.trim().toLowerCase(),
      })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      books,
    });
  } catch (error) {
    console.error("Get librarian books error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch librarian books.",
    });
  }
};

const getBookById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book ID.",
      });
    }

    const book = await getBooksCollection().findOne({
      _id: new ObjectId(id),
    });

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found.",
      });
    }

    return res.status(200).json({
      success: true,
      book,
    });
  } catch (error) {
    console.error("Get book error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch book.",
    });
  }
};

const updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body || {};

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book ID.",
      });
    }

    const title = data.title?.trim();
    const author = data.author?.trim();
    const description = data.description?.trim();
    const category = data.category?.trim();
    const image = data.image?.trim();
    const deliveryFee = Number(data.deliveryFee);

    if (!title || !author || !description || !category || !image) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required book information.",
      });
    }

    if (
      data.deliveryFee === "" ||
      data.deliveryFee === undefined ||
      !Number.isFinite(deliveryFee) ||
      deliveryFee < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid delivery fee.",
      });
    }

    const result = await getBooksCollection().updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          title,
          author,
          description,
          category,
          image,
          deliveryFee,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Book not found.",
      });
    }

    const book = await getBooksCollection().findOne({
      _id: new ObjectId(id),
    });

    return res.status(200).json({
      success: true,
      message: "Book updated successfully.",
      book,
    });
  } catch (error) {
    console.error("Update book error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update book.",
    });
  }
};

const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book ID.",
      });
    }

    const result = await getBooksCollection().deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Book not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Book deleted successfully.",
    });
  } catch (error) {
    console.error("Delete book error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete book.",
    });
  }
};

const unpublishBook = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book ID.",
      });
    }

    const collection = getBooksCollection();

    const book = await collection.findOne({
      _id: new ObjectId(id),
    });

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found.",
      });
    }

    const status = String(book.status || "").toLowerCase();

    if (status !== "published" && status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "Only published books can be unpublished.",
      });
    }

    await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: "unpublished",
          updatedAt: new Date(),
        },
      }
    );

    const updatedBook = await collection.findOne({
      _id: new ObjectId(id),
    });

    return res.status(200).json({
      success: true,
      message: "Book unpublished successfully.",
      book: updatedBook,
    });
  } catch (error) {
    console.error("Unpublish book error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update book.",
    });
  }
};

export {
  createBook,
  getBooks,
  getLibrarianBooks,
  getBookById,
  updateBook,
  deleteBook,
  unpublishBook,
};