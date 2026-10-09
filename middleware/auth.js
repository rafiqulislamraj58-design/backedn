const jwt = require("jsonwebtoken");
const { getDB } = require("../config/db");

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
    req.user = decoded;
    next();
  });
};

const verifyAdmin = async (req, res, next) => {
  try {
    const user = await getDB()
      .collection("user")
      .findOne({ email: req.user.email });

    if (user?.role !== "admin") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: "Auth check failed" });
  }
};

module.exports = { verifyToken, verifyAdmin };