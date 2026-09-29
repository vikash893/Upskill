const mongoose = require("mongoose");
const dns = require("dns");

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const connectDb = async () => {
    const mongoUrl = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/uniskill_database";
    try {
        await mongoose.connect(mongoUrl, {
            maxPoolSize: 50,
            minPoolSize: 10,
            serverSelectionTimeoutMS: 8000,
            socketTimeoutMS: 45000,
            autoIndex: true
        });
        console.log("MongoDB connected successfully with connection pooling (maxPoolSize: 50).");
    } catch (error) {
        console.error("⚠️ MongoDB connection error:", error.message);
    }
};

module.exports = connectDb;