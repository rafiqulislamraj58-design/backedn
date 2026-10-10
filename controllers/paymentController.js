
import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import Delivery from "../models/DeliveryModel.js";
import {
  createCheckoutSession,
  retrieveSession,
} from "../services/stripeService.js";

const createPaymentSession = async (req, res) => {
  try {
    const { bookId, customerEmail } = req.body;

    if (!bookId || !customerEmail) {
      return res.status(400).json({
        success: false,
        message: !bookId
          ? "Book ID is required"
          : "Customer email is required",
      });
    }

    if (typeof customerEmail !== "string" || !customerEmail.trim()) {
      return res.status(400).json({
        success: false,
        message: "Valid customer email is required",
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

    if (book.librarianEmail?.trim().toLowerCase() === email) {
      return res.status(400).json({
        success: false,
        message: "You cannot request your own book",
      });
    }

    const deliveryFee = Number(book.deliveryFee);
    const amount = deliveryFee;

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment amount",
      });
    }

    const now = new Date();

    const order = {
      bookId: book._id,
      bookTitle: book.title,
      deliveryFee,
      amount,
      customerEmail: email,
      paymentStatus: "pending",
      orderStatus: "pending",
      stripeSessionId: null,
      createdAt: now,
      updatedAt: now,
    };

    const orderResult = await ordersCollection.insertOne(order);

    try {
      const session = await createCheckoutSession({
        orderId: orderResult.insertedId,
        bookId: book._id,
        title: book.title,
        amount,
        customerEmail: email,
      });

      await ordersCollection.updateOne(
        { _id: orderResult.insertedId },
        {
          $set: {
            stripeSessionId: session.id,
            updatedAt: new Date(),
          },
        }
      );

      return res.status(200).json({
        success: true,
        message: "Checkout session created successfully",
        sessionId: session.id,
        checkoutUrl: session.url,
        orderId: orderResult.insertedId,
      });
    } catch (stripeError) {
      // Checkout session তৈরি ব্যর্থ হলে pending order মুছে দাও।
      await ordersCollection.deleteOne({
        _id: orderResult.insertedId,
        paymentStatus: "pending",
      });

      throw stripeError;
    }
  } catch (error) {
    console.error("Create payment session error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create payment session",
    });
  }
};

const confirmPayment = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId || typeof sessionId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Valid session ID is required",
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

    const order = await orders.findOne({
      stripeSessionId: session.id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // A refreshed success page must not create another delivery.
    if (order.paymentStatus === "paid") {
      return res.status(200).json({
        success: true,
        message: "Payment already confirmed",
      });
    }

    // Verify that the Stripe session belongs to this order.
    if (
      session.metadata?.orderId &&
      session.metadata.orderId !== order._id.toString()
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment session does not match the order",
      });
    }

    const book = await books.findOne({
      _id: order.bookId,
    });

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found for this order",
      });
    }

    const userDoc = await db.collection("user").findOne({
      email: order.customerEmail,
    });

    // Only confirm payment for the matching pending order.
    const paymentUpdate = await orders.updateOne(
      {
        _id: order._id,
        paymentStatus: "pending",
      },
      {
        $set: {
          paymentStatus: "paid",
          orderStatus: "confirmed",
          updatedAt: new Date(),
        },
      }
    );

    if (paymentUpdate.modifiedCount === 0) {
      const latestOrder = await orders.findOne({
        _id: order._id,
      });

      if (latestOrder?.paymentStatus === "paid") {
        return res.status(200).json({
          success: true,
          message: "Payment already confirmed",
        });
      }

      return res.status(409).json({
        success: false,
        message: "Order could not be confirmed",
      });
    }

    try {
      await Delivery.create({
        bookId: order.bookId,
        bookTitle: order.bookTitle,
        clientName: userDoc?.name || order.customerEmail,
        clientEmail: order.customerEmail,
        librarianEmail: book.librarianEmail || "unknown",
        deliveryFee: order.deliveryFee,
        status: "Pending",
      });

      await books.updateOne(
        { _id: order.bookId },
        {
          $set: {
            availability: "checkedOut",
            updatedAt: new Date(),
          },
        }
      );
    } catch (deliveryError) {
      // Do not hide a delivery creation failure.
      // Payment is already marked paid, so this needs reconciliation.
      console.error(
        "Payment confirmed but delivery creation failed:",
        deliveryError
      );

      return res.status(500).json({
        success: false,
        message:
          "Payment was confirmed, but delivery creation failed. Please contact support.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment confirmed, delivery requested",
    });
  } catch (error) {
    console.error("Confirm payment error:", error);

    return res.status(500).json({
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

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Get order error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch order",
    });
  }
};

export {
  createPaymentSession,
  confirmPayment,
  getOrderById,
};