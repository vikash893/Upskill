const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: [
        'Course Admissions',
        'Billing & Payments',
        'Technical Support',
        'Faculty & Mentorship',
        'Partnership & Enterprise',
        'General Query',
      ],
      default: 'General Query',
    },
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['unread', 'read', 'in_progress', 'resolved'],
      default: 'unread',
    },
    reply: {
      type: String,
      default: '',
    },
    admin_notes: {
      type: String,
      default: '',
    },
    ip_address: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Contact', contactSchema);
