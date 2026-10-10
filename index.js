
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

import connectDB from "./config/db.js";
import bookRoutes from "./routes/bookRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import deliveryRoutes from "./routes/deliveryRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

// CORS Configuration
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

// Middleware
app.use(express.json());
app.use(cookieParser());

// Root Route
app.get("/", (req, res) => {
  res.status(200).send("BiblioDrop Server Running");
});

// JWT Token Route
app.post("/jwt", (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email required",
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "JWT_SECRET is not configured",
      });
    }

    const token = jwt.sign(
      { email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res
      .cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite:
          process.env.NODE_ENV === "production" ? "none" : "lax",
      })
      .status(200)
      .json({
        success: true,
        message: "JWT token created successfully",
      });
  } catch (error) {
    console.error("JWT creation failed:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create JWT token",
    });
  }
});

// API Routes
app.use("/books", bookRoutes);
app.use("/payments", paymentRoutes);
app.use("/deliveries", deliveryRoutes);
app.use("/api/admin", adminRoutes);
app.use("/reviews", reviewRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

// Start Server
const startServer = async () => {
  try {
    await connectDB();

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
};

startServer();