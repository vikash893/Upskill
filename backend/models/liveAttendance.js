const mongoose = require("mongoose");

const liveAttendanceSchema = new mongoose.Schema({
    class_id: { type: String, required: true },
    student_email: { type: String, required: true, lowercase: true },
    student_name: { type: String, required: true },
    entered_at: { type: Date, required: true },
    left_at: { type: Date, default: null },
    duration_minutes: { type: Number, default: 0 },
    status: { type: String, enum: ["present", "absent"], default: "present" }
}, { timestamps: true });

liveAttendanceSchema.index({ class_id: 1, student_email: 1 }, { unique: true });
liveAttendanceSchema.index({ student_email: 1, class_id: 1 });

module.exports = mongoose.model("LiveAttendance", liveAttendanceSchema);