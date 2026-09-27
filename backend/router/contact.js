const express = require('express');
const router = express.Router();
const Contact = require('../models/contact');
const Course = require('../models/courses');
const User = require('../models/user');
const Teacher = require('../models/teacher');
const LiveClass = require('../models/liveClass');
const Logger = require('../models/logger');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

// 1. PUBLIC: Submit contact form query
router.post('/contact/submit', async (req, res) => {
  try {
    const { name, email, phone, subject, category, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, subject, and message are required fields.',
      });
    }

    const newContact = new Contact({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : '',
      subject: subject.trim(),
      category: category || 'General Query',
      message: message.trim(),
      status: 'unread',
      ip_address: req.ip || req.connection.remoteAddress || '',
    });

    await newContact.save();

    // Log the contact inquiry in audit logs
    try {
      await Logger.create({
        admin_email: 'system',
        action: `Contact Query received from ${name} (${email}): "${subject}"`,
        method: 'POST',
        endpoint: '/api/contact/submit',
      });
    } catch (e) {
      // Non-blocking log failure
    }

    return res.status(201).json({
      success: true,
      message: 'Your message has been sent directly to the UniSkill Admin team. We will review and respond promptly!',
      inquiry_id: newContact._id,
    });
  } catch (error) {
    console.error('Contact submit error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit contact query. Please try again later.',
      error: error.message,
    });
  }
});

// 2. PUBLIC: Real platform stats directly fetched from database
router.get('/public/platform-stats', async (req, res) => {
  try {
    const [coursesCount, studentsCount, teachersCount, liveClassesCount, realTeachers] = await Promise.all([
      Course.countDocuments(),
      User.countDocuments(),
      Teacher.countDocuments(),
      LiveClass.countDocuments(),
      Teacher.find({}, 'name email course_assigned phone').limit(8).lean(),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        total_courses: coursesCount,
        total_students: studentsCount,
        total_teachers: teachersCount,
        total_live_classes: liveClassesCount,
      },
      faculty: realTeachers || [],
    });
  } catch (error) {
    console.error('Platform stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch platform metrics',
      error: error.message,
    });
  }
});

// 3. ADMIN: Get all user inquiries with filter and search
router.get('/admin/inquiries', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const { status, search, limit = 50, page = 1 } = req.query;
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { subject: { $regex: q, $options: 'i' } },
        { message: { $regex: q, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [inquiries, totalCount, unreadCount] = await Promise.all([
      Contact.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Contact.countDocuments(filter),
      Contact.countDocuments({ status: 'unread' }),
    ]);

    return res.status(200).json({
      success: true,
      inquiries,
      totalCount,
      unreadCount,
      currentPage: Number(page),
      totalPages: Math.ceil(totalCount / Number(limit)) || 1,
    });
  } catch (error) {
    console.error('Admin get inquiries error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch inquiries',
      error: error.message,
    });
  }
});

// 4. ADMIN: Update inquiry status or save reply / admin notes
router.patch('/admin/inquiries/:id', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reply, admin_notes } = req.body;

    const updateFields = {};
    if (status) updateFields.status = status;
    if (reply !== undefined) updateFields.reply = reply;
    if (admin_notes !== undefined) updateFields.admin_notes = admin_notes;

    const updated = await Contact.findByIdAndUpdate(id, updateFields, { new: true });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Inquiry updated successfully',
      inquiry: updated,
    });
  } catch (error) {
    console.error('Admin update inquiry error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update inquiry',
      error: error.message,
    });
  }
});

// 5. ADMIN: Delete inquiry
router.delete('/admin/inquiries/:id', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Contact.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Inquiry deleted successfully',
    });
  } catch (error) {
    console.error('Admin delete inquiry error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete inquiry',
      error: error.message,
    });
  }
});

module.exports = router;
