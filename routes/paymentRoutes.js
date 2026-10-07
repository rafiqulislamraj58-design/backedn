const express = require("express");

const {
  createPaymentSession,
  getOrderById,
} = require("../controllers/paymentController");

const router = express.Router();

router.post("/create-checkout-session", createPaymentSession);

router.get("/orders/:id", getOrderById);

module.exports = router;