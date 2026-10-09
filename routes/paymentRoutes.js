const express = require("express");

const {
  createPaymentSession,
  confirmPayment,
  getOrderById,
} = require("../controllers/paymentController");

const router = express.Router();

router.post("/create-checkout-session", createPaymentSession);

router.post("/confirm", confirmPayment);

router.get("/orders/:id", getOrderById);

module.exports = router;