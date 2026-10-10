import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";

const handleError = (res, error, message) => {
  console.error(message, error);
  res.status(500).json({ success: false, message });
};

const getStats = async (req, res) => {
  try {
    const db = getDB();

    const [
      totalUsers,
      totalBooks,
      totalDeliveries,
      pendingBooks,
      revenueAgg,
      byCategory,
    ] = await Promise.all([
      db.collection("user").countDocuments(),
      db.collection("books").countDocuments(),
      db.collection("deliveries").countDocuments(),
      db.collection("books").countDocuments({ status: "pending" }),
      db
        .collection("orders")
        .aggregate([
          { $match: { paymentStatus: "paid" } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ])
        .toArray(),
      db
        .collection("books")
        .aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }])
        .toArray(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalBooks,
        totalDeliveries,
        pendingBooks,
        totalRevenue: revenueAgg[0]?.total || 0,
        byCategory: byCategory.map((c) => ({
          name: c._id || "Other",
          value: c.count,
        })),
      },
    });
  } catch (error) {
    handleError(res, error, "Failed to fetch stats");
  }
};

const getAnalytics = async (req, res) => {
  try {
    const db = getDB();

    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleString("en-US", { month: "short" }),
      });
    }

    const [
      revenueAgg,
      deliveryStatus,
      bookStatus,
      userRoles,
      topLibrarians,
      topBooks,
    ] = await Promise.all([
      db
        .collection("orders")
        .aggregate([
          { $match: { paymentStatus: "paid" } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
              revenue: { $sum: "$amount" },
              orders: { $sum: 1 },
            },
          },
        ])
        .toArray(),
      db
        .collection("deliveries")
        .aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }])
        .toArray(),
      db
        .collection("books")
        .aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }])
        .toArray(),
      db
        .collection("user")
        .aggregate([
          {
            $group: {
              _id: { $ifNull: ["$role", "user"] },
              count: { $sum: 1 },
            },
          },
        ])
        .toArray(),
      db
        .collection("deliveries")
        .aggregate([
          { $match: { status: "Delivered" } },
          { $group: { _id: "$librarianEmail", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 },
        ])
        .toArray(),
      db
        .collection("deliveries")
        .aggregate([
          { $group: { _id: "$bookTitle", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 },
        ])
        .toArray(),
    ]);

    const revenueMap = Object.fromEntries(revenueAgg.map((r) => [r._id, r]));

    const monthlyRevenue = months.map((m) => ({
      month: m.label,
      revenue: revenueMap[m.key]?.revenue || 0,
      orders: revenueMap[m.key]?.orders || 0,
    }));

    res.status(200).json({
      success: true,
      data: {
        monthlyRevenue,
        deliveriesByStatus: deliveryStatus.map((d) => ({
          name: d._id || "Unknown",
          value: d.count,
        })),
        booksByStatus: bookStatus.map((b) => ({
          name: b._id || "Unknown",
          value: b.count,
        })),
        usersByRole: userRoles.map((u) => ({
          name: u._id,
          value: u.count,
        })),
        topLibrarians: topLibrarians.map((l) => ({
          email: l._id,
          count: l.count,
        })),
        topBooks: topBooks.map((b) => ({
          title: b._id,
          count: b.count,
        })),
      },
    });
  } catch (error) {
    handleError(res, error, "Failed to fetch analytics");
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await getDB().collection("user").find().toArray();
    res.status(200).json({ success: true, users });
  } catch (error) {
    handleError(res, error, "Failed to fetch users");
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user ID" });
    }

    if (!["user", "librarian", "admin"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    const users = getDB().collection("user");
    const target = await users.findOne({ _id: new ObjectId(id) });

    if (!target) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (target.email === req.user.email) {
      return res
        .status(400)
        .json({ success: false, message: "You cannot change your own role" });
    }

    await users.updateOne({ _id: target._id }, { $set: { role } });

    res.status(200).json({ success: true, message: "Role updated" });
  } catch (error) {
    handleError(res, error, "Failed to update role");
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user ID" });
    }

    const db = getDB();
    const target = await db
      .collection("user")
      .findOne({ _id: new ObjectId(id) });

    if (!target) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (target.email === req.user.email) {
      return res
        .status(400)
        .json({ success: false, message: "You cannot delete yourself" });
    }

    const userId = target._id;
    const userIdStr = String(target._id);

    await Promise.all([
      db.collection("user").deleteOne({ _id: userId }),
      db
        .collection("session")
        .deleteMany({ userId: { $in: [userId, userIdStr] } }),
      db
        .collection("account")
        .deleteMany({ userId: { $in: [userId, userIdStr] } }),
    ]);

    res.status(200).json({ success: true, message: "User deleted" });
  } catch (error) {
    handleError(res, error, "Failed to delete user");
  }
};

const getAdminBooks = async (req, res) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};

    const books = await getDB()
      .collection("books")
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({ success: true, books });
  } catch (error) {
    handleError(res, error, "Failed to fetch books");
  }
};

const setBookStatus = (status, successMessage) => async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid book ID" });
    }

    const result = await getDB()
      .collection("books")
      .updateOne(
        { _id: new ObjectId(id) },
        { $set: { status, updatedAt: new Date() } }
      );

    if (result.matchedCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Book not found" });
    }

    res.status(200).json({ success: true, message: successMessage });
  } catch (error) {
    handleError(res, error, "Failed to update book");
  }
};

const approveBook = setBookStatus("published", "Book approved and published");
const unpublishBookAdmin = setBookStatus("unpublished", "Book unpublished");

const deleteBookAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid book ID" });
    }

    const result = await getDB()
      .collection("books")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Book not found" });
    }

    res.status(200).json({ success: true, message: "Book deleted" });
  } catch (error) {
    handleError(res, error, "Failed to delete book");
  }
};

const getTransactions = async (req, res) => {
  try {
    const db = getDB();

    const orders = await db
      .collection("orders")
      .find({ paymentStatus: "paid" })
      .sort({ createdAt: -1 })
      .toArray();

    const bookIds = orders.map((o) => o.bookId);

    const books = await db
      .collection("books")
      .find({ _id: { $in: bookIds } })
      .project({ librarianEmail: 1 })
      .toArray();

    const librarianByBook = Object.fromEntries(
      books.map((b) => [String(b._id), b.librarianEmail])
    );

    const transactions = orders.map((o) => ({
      transactionId: o.stripeSessionId || String(o._id),
      userEmail: o.customerEmail,
      librarianEmail: librarianByBook[String(o.bookId)] || "N/A",
      amount: o.amount,
      date: o.createdAt,
    }));

    res.status(200).json({ success: true, transactions });
  } catch (error) {
    handleError(res, error, "Failed to fetch transactions");
  }
};

export {
  getStats,
  getAnalytics,
  getUsers,
  updateUserRole,
  deleteUser,
  getAdminBooks,
  approveBook,
  unpublishBookAdmin,
  deleteBookAdmin,
  getTransactions,
};