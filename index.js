
const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();

const port = process.env.PORT || 4000;

const client = new MongoClient(process.env.MONGO_URI);

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).send("BiblioDrop Server Running");
});

const startServer = async () => {
  try {
    await client.connect();

    console.log("MongoDB connected successfully");

    const db = client.db("bilidrop-db");

    const booksCollection = db.collection("books");

    app.post("/books", async (req, res) => {
      try {
        const data = req.body;

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

        const book = {
          title: data.title.trim(),
          author: data.author.trim(),
          description: data.description.trim(),
          deliveryFee,
          category: data.category,
          image: data.image,
          status: "pending",
          createdAt: new Date(),
          updatedAt: new Date(),
        };

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
    });

    app.get("/books", async (req, res) => {
      try {
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
    });

    app.get("/books/:id", async (req, res) => {
      try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid book ID",
          });
        }

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
    });

    app.put("/books/:id", async (req, res) => {
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
    });

    app.delete("/books/:id", async (req, res) => {
      try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid book ID",
          });
        }

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
    });

    app.patch("/books/:id/unpublish", async (req, res) => {
      try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid book ID",
          });
        }

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
          message: "Failed to unpublish book",
        });
      }
    });

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error);
  }
};

startServer();

