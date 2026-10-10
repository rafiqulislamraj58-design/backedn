
import express from "express";

import {
  getLibrarianDeliveries,
  updateDeliveryStatus,
} from "../controllers/deliveryController.js";

const router = express.Router();

router.get("/librarian", getLibrarianDeliveries);
router.patch("/:id/status", updateDeliveryStatus);

export default router;