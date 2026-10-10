import Delivery from "../models/DeliveryModel.js";

export const getLibrarianDeliveries = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        message: "Librarian email is required",
      });
    }

    const deliveries = await Delivery.find({
      librarianEmail: email,
    })
      .sort({ date: -1 })
      .lean();

    return res.status(200).json(deliveries);
  } catch (error) {
    console.error("Get librarian deliveries error:", error);

    return res.status(500).json({
      message: "Failed to fetch deliveries",
      error: error.message,
    });
  }
};

export const updateDeliveryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["Pending", "Dispatched", "Delivered"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid status value",
      });
    }

    const updatedDelivery = await Delivery.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!updatedDelivery) {
      return res.status(404).json({
        message: "Delivery request not found",
      });
    }

    return res.status(200).json({
      message: "Status updated successfully",
      updatedDelivery,
    });
  } catch (error) {
    console.error("Update delivery status error:", error);

    return res.status(500).json({
      message: "Failed to update status",
      error: error.message,
    });
  }
};