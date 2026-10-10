
import express from "express";

import {
  createPaymentSession,
  confirmPayment,
  getOrderById,
} from "../controllers/paymentController.js";

const router = express.Router();

router.post("/create-checkout-session", createPaymentSession);
router.post("/confirm", confirmPayment);
router.get("/orders/:id", getOrderById);

export default router;