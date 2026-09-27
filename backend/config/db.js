const mongoose = require('mongoose'); 
const dns = require("dns");

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");


const connectDb = async(req , res)=> {
    try {
        mongoose.connect(process.env.MONGO_URL || "mongodb://localhost:27017/uniskill_local_database"); 
        console.log("Database connected ... ");
    } catch (error) {
        console.log("DATABASE CONNECTION ERROR");
    }
}

module.exports = connectDb ; 