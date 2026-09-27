const mongoose = require('mongoose'); 

const userSchema = new mongoose.Schema({
    name: { type: String, required: true }, 
    phone: { type: String, default: "" }, 
    email: { type: String, required: true, unique: true }, 
    photo: { type: String, default: null }, 
    password: { type: String, default: null },
    google_id: { type: String, default: null },
    auth_provider: { type: String, enum: ["local", "google"], default: "local" }
}, {
    timestamps: true
});

module.exports = mongoose.model("user", userSchema); 
