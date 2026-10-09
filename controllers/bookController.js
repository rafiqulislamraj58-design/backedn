const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");

const getBooksCollection = () => {
  const db = getDB();
  return db.collection("books");
};

const createBook = async (req, res) => {
  try {
    const data = req.body;

    const librarianEmail = data.librarianEmail || data.email;

    if (
      !data.title ||
      !data.author ||
      !data.description ||
      !data.category ||
      !data.image
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required book information",
      });
    }

    if (!librarianEmail) {
      return res.status(400).json({
        success: false,
        message: "Librarian email is required",
      });
    }

    const deliveryFee = Number(data.deliveryFee);

    if (Number.isNaN(deliveryFee) || deliveryFee < 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid delivery fee",
      });
    }

    const book = {
      title: data.title.trim(),
      author: data.author.trim(),
      description: data.description.trim(),
      deliveryFee,
      category: data.category,
      image: data.image,
      librarianEmail: librarianEmail.trim().toLowerCase(),
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const booksCollection = getBooksCollection();

    const result = await booksCollection.insertOne(book);

    res.status(201).json({
      success: true,
      message: "Book saved successfully",
      bookId: result.insertedId,
      book: {
        ...book,
        _id: result.insertedId,
      },
    });
  } catch (error) {
    console.error("Book save error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to save book",
    });
  }
};

const getBooks = async (req, res) => {
  try {
    const booksCollection = getBooksCollection();

    const books = await booksCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      books,
    });
  } catch (error) {
    console.error("Get books error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch books",
    });
  }
};

const getLibrarianBooks = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Librarian email is required",
      });
    }

    const booksCollection = getBooksCollection();

    const librarianEmail = email.trim().toLowerCase();

    const books = await booksCollection
      .find({
        librarianEmail,
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      books,
    });
  } catch (error) {
    console.error("Get librarian books error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch librarian books",
    });
  }
};

const getBookById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book ID",
      });
    }

    const booksCollection = getBooksCollection();

    const book = await booksCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    res.status(200).json({
      success: true,
      book,
    });
  } catch (error) {
    console.error("Get single book error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch book",
    });
  }
};

const updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book ID",
      });
    }

    if (
      !data.title ||
      !data.author ||
      !data.description ||
      !data.category ||
      !data.image
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required book information",
      });
    }

    const deliveryFee = Number(data.deliveryFee);

    if (Number.isNaN(deliveryFee) || deliveryFee < 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid delivery fee",
      });
    }

    const updateData = {
      title: data.title.trim(),
      author: data.author.trim(),
      description: data.description.trim(),
      deliveryFee,
      category: data.category,
      image: data.image,
      updatedAt: new Date(),
    };

    if (data.librarianEmail || data.email) {
      updateData.librarianEmail = (
        data.librarianEmail || data.email
      )
        .trim()
        .toLowerCase();
    }

    const booksCollection = getBooksCollection();

    const result = await booksCollection.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: updateData,
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    const updatedBook = await booksCollection.findOne({
      _id: new ObjectId(id),
    });

    res.status(200).json({
      success: true,
      message: "Book updated successfully",
      book: updatedBook,
    });
  } catch (error) {
    console.error("Update book error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update book",
    });
  }
};

const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book ID",
      });
    }

    const booksCollection = getBooksCollection();

    const result = await booksCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Book deleted successfully",
    });
  } catch (error) {
    console.error("Delete book error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete book",
    });
  }
};

const unpublishBook = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book ID",
      });
    }

    const booksCollection = getBooksCollection();

    const book = await booksCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    const status = String(book.status || "").toLowerCase();

    if (status !== "published" && status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "Only published books can be unpublished",
      });
    }

    await booksCollection.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: {
          status: "unpublished",
          updatedAt: new Date(),
        },
      }
    );

    const updatedBook = await booksCollection.findOne({
      _id: new ObjectId(id),
    });

    res.status(200).json({
      success: true,
      message: "Book unpublished successfully",
      book: updatedBook,
    });
  } catch (error) {
    console.error("Unpublish book error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update book",
    });
  }
};

module.exports = {
  createBook,
  getBooks,
  getLibrarianBooks,
  getBookById,
  updateBook,
  deleteBook,
  unpublishBook,
};