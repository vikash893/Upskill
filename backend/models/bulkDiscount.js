const mongoose = require('mongoose');

const tierSchema = new mongoose.Schema({
    minimum_courses: { type: Number, required: true, min: 2, max: 100 },
    discount_percent: { type: Number, required: true, min: 0, max: 100 },
}, { _id: false });

const bulkDiscountSchema = new mongoose.Schema({
    setting_key: { type: String, default: 'global', unique: true },
    tiers: { type: [tierSchema], default: [] },
    updated_by: { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model('BulkDiscount', bulkDiscountSchema);
