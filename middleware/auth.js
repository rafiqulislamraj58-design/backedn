
import jwt from "jsonwebtoken";
import { getDB } from "../config/db.js";

export const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      success: false,
      message: "JWT_SECRET is not configured",
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    req.user = decoded;
    next();
  });
};

export const verifyAdmin = async (req, res, next) => {
  try {
    const user = await getDB()
      .collection("user")
      .findOne({ email: req.user.email });

    if (user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    next();
  } catch (error) {
    console.error("Auth check failed:", error);

    return res.status(500).json({
      success: false,
      message: "Auth check failed",
    });
  }
};