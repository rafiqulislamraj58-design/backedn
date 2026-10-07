const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const { createCheckoutSession } = require("../services/stripeService");

const createPaymentSession = async (req, res) => {
  try {
    const { bookId, customerEmail } = req.body;

    if (!bookId) {
      return res.status(400).json({
        success: false,
        message: "Book ID is required",
      });
    }

    if (!customerEmail) {
      return res.status(400).json({
        success: false,
        message: "Customer email is required",
      });
    }

    if (!ObjectId.isValid(bookId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book ID",
      });
    }

    const email = customerEmail.trim().toLowerCase();

    const db = getDB();

    const booksCollection = db.collection("books");
    const ordersCollection = db.collection("orders");

    const book = await booksCollection.findOne({
      _id: new ObjectId(bookId),
    });

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    const bookPrice = Number(book.price || 0);
    const deliveryFee = Number(book.deliveryFee || 0);
    const amount = bookPrice + deliveryFee;

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment amount",
      });
    }

    const order = {
      bookId: book._id,
      bookTitle: book.title,
      bookPrice,
      deliveryFee,
      amount,
      customerEmail: email,
      paymentStatus: "pending",
      orderStatus: "pending",
      stripeSessionId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const orderResult = await ordersCollection.insertOne(order);

    const session = await createCheckoutSession({
      orderId: orderResult.insertedId,
      bookId: book._id,
      title: book.title,
      amount,
      customerEmail: email,
    });

    await ordersCollection.updateOne(
      {
        _id: orderResult.insertedId,
      },
      {
        $set: {
          stripeSessionId: session.id,
          updatedAt: new Date(),
        },
      }
    );

    res.status(200).json({
      success: true,
      message: "Checkout session created successfully",
      sessionId: session.id,
      checkoutUrl: session.url,
      orderId: orderResult.insertedId,
    });
  } catch (error) {
    console.error("Create payment session error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create payment session",
    });
  }
};

const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const db = getDB();

    const order = await db.collection("orders").findOne({
      _id: new ObjectId(id),
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Get order error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch order",
    });
  }
};

module.exports = {
  createPaymentSession,
  getOrderById,
};