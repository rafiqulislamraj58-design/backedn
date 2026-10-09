const { MongoClient } = require("mongodb");
const mongoose = require("mongoose");
require("dotenv").config();

const mongoURI = process.env.MONGO_URI;
const client = new MongoClient(mongoURI || "mongodb://127.0.0.1:27017");

let db;
let isConnected = false;

const connectDB = async () => {
if (!mongoURI) {
throw new Error("MONGO_URI is missing from .env");
}

if (isConnected) {
return db;
}

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
};

const getDB = () => {
if (!isConnected || !db) {
throw new Error("Database is not connected");
}

return db;
};

module.exports = connectDB;
module.exports.getDB = getDB;
