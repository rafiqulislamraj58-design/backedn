const { MongoClient } = require("mongodb");
require("dotenv").config();

const client = new MongoClient(process.env.MONGO_URI);

let db;

const connectDB = async () => {
  await client.connect();

  db = client.db("bilidrop-db");

  console.log("MongoDB connected successfully");

  return db;
};

const getDB = () => {
  if (!db) {
    throw new Error("Database is not connected");
  }

  return db;
};

module.exports = connectDB;
module.exports.getDB = getDB;