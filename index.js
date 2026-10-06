const express = require("express");
const { MongoClient } = require("mongodb");
require("dotenv").config();

const app = express();

const port = process.env.PORT || 3000;

console.log("Mongo URI:", process.env.MONGO_URI);

const client = new MongoClient(process.env.MONGO_URI);

app.use(express.json());

app.get("/", (req, res) => {
  res.send("BiblioDrop Server Running");
});

const startServer = async () => {
  try {
    await client.connect();

    console.log("MongoDB connected successfully");

    const db = client.db("bilidrop-db");

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error);
  }
};

startServer();
