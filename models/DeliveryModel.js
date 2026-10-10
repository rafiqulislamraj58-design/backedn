
import mongoose from "mongoose";

const deliverySchema = new mongoose.Schema({
  bookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Book",
    required: true,
  },

  bookTitle: {
    type: String,
    required: true,
  },

  clientName: {
    type: String,
    required: true,
  },

  clientEmail: {
    type: String,
    required: true,
  },

  librarianEmail: {
    type: String,
    required: true,
  },

  deliveryFee: {
    type: Number,
    required: true,
  },

  status: {
    type: String,
    enum: ["Pending", "Dispatched", "Delivered"],
    default: "Pending",
  },

  date: {
    type: Date,
    default: Date.now,
  },
});

const Delivery =
  mongoose.models.Delivery ||
  mongoose.model("Delivery", deliverySchema);

export default Delivery;