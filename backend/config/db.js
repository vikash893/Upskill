const mongoose = require("mongoose");
const dns = require("dns");

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const connectDb = async () => {
    const mongoUrl = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/uniskill_database";
    const maxPoolSize = Math.max(1, Number.parseInt(process.env.MONGO_MAX_POOL_SIZE, 10) || 50);
    const minPoolSize = Math.min(maxPoolSize, Math.max(0, Number.parseInt(process.env.MONGO_MIN_POOL_SIZE, 10) || 2));
    if (mongoose.connection.readyState === 1) return mongoose.connection;

    try {
        await mongoose.connect(mongoUrl, {
            maxPoolSize,
            minPoolSize,
            serverSelectionTimeoutMS: 8000,
            socketTimeoutMS: 45000,
            autoIndex: true
        });
        console.log(`MongoDB connected successfully (maxPoolSize: ${maxPoolSize}, minPoolSize: ${minPoolSize}).`);
        return mongoose.connection;
    } catch (error) {
        console.error("⚠️ MongoDB connection error:", error.message);
        throw error;
    }
};

module.exports = connectDb;