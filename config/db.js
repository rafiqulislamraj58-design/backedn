
import { MongoClient } from "mongodb";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const mongoURI = process.env.MONGO_URI;

const client = new MongoClient(
  mongoURI || "mongodb://127.0.0.1:27017"
);

let db;
let isConnected = false;

const connectDB = async () => {
  if (!mongoURI) {
    throw new Error("MONGO_URI is missing from .env");
  }

  if (isConnected) {
    return db;
  }

  try {
    await client.connect();

    db = client.db("bilidrop-db");

    await mongoose.connect(mongoURI, {
      dbName: "bilidrop-db",
      serverSelectionTimeoutMS: 10000,
    });

    isConnected = true;

    console.log("MongoDB native driver connected successfully");
    console.log("Mongoose connected successfully");

    return db;
  } catch (error) {
    console.error("Database connection failed:", error);
    throw error;
  }
};

const getDB = () => {
  if (!isConnected || !db) {
    throw new Error("Database is not connected");
  }

  return db;
};

export { getDB };
export default connectDB;