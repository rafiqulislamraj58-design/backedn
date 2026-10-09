const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const Delivery = require("../models/DeliveryModel");
const {
  createCheckoutSession,
  retrieveSession,
} = require("../services/stripeService");

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

    if (String(book.status).toLowerCase() !== "published") {
      return res.status(400).json({
        success: false,
        message: "This book is not available for delivery",
      });
    }

    if (book.availability === "checkedOut") {
      return res.status(400).json({
        success: false,
        message: "This book is currently checked out",
      });
    }

    if (book.librarianEmail === email) {
      return res.status(400).json({
        success: false,
        message: "You cannot request your own book",
      });
    }

    const deliveryFee = Number(book.deliveryFee || 0);
    const amount = deliveryFee;

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment amount",
      });
    }

    const order = {
      bookId: book._id,
      bookTitle: book.title,
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

const confirmPayment = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Session ID is required",
      });
    }

    const session = await retrieveSession(sessionId);

    if (session.payment_status !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Payment not completed",
      });
    }

    const db = getDB();
    const orders = db.collection("orders");
    const books = db.collection("books");

    const order = await orders.findOne({ stripeSessionId: session.id });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // success page refresh korle duplicate delivery toiri hobe na
    if (order.paymentStatus === "paid") {
      return res.status(200).json({
        success: true,
        message: "Already confirmed",
      });
    }

    const book = await books.findOne({ _id: order.bookId });

    await orders.updateOne(
      { _id: order._id },
      {
        $set: {
          paymentStatus: "paid",
          orderStatus: "confirmed",
          updatedAt: new Date(),
        },
      }
    );

    const userDoc = await db
      .collection("user")
      .findOne({ email: order.customerEmail });

    await Delivery.create({
      bookId: order.bookId,
      bookTitle: order.bookTitle,
      clientName: userDoc?.name || order.customerEmail,
      clientEmail: order.customerEmail,
      librarianEmail: book?.librarianEmail || "unknown",
      deliveryFee: order.deliveryFee,
      status: "Pending",
    });

    await books.updateOne(
      { _id: order.bookId },
      { $set: { availability: "checkedOut", updatedAt: new Date() } }
    );

    res.status(200).json({
      success: true,
      message: "Payment confirmed, delivery requested",
    });
  } catch (error) {
    console.error("Confirm payment error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to confirm payment",
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
  confirmPayment,
  getOrderById,
};