// routes/admin.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { User, Student, Class, Grade, Attendance, Teachers_Classes, Subject, Announcement, Announcement_Receiver } = require('../models');
const sequelize = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

// Protect all admin routes — admin only
router.use(verifyToken);
router.use(requireRole('admin'));

// ─── CREATE USER ─────────────────────────────────────────────────────────────
// POST /admin/users
router.post('/users', async (req, res) => {
  try {
    const {
      name, email, password, role,
      // student-specific
      class_id, existingParentEmail, parentName, parentEmail, parentPassword, manager_scope,
    } = req.body;
    const cleanEmail = email?.trim().toLowerCase();
    const cleanExistingParentEmail = existingParentEmail?.trim().toLowerCase();
    const cleanParentEmail = parentEmail?.trim().toLowerCase();

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: "name, email, password, and role are required" });
    }

    if (role === 'manager' && !['grades_1_7', 'grades_8_12'].includes(manager_scope)) {
      return res.status(400).json({ success: false, message: "manager_scope is required for managers" });
    }

    const existingUser = await User.findOne({ where: { email: cleanEmail } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: `Email "${cleanEmail}" already exists` });
    }

    // ── Student ──
    if (role === 'student') {
      if (!class_id) {
        return res.status(400).json({ success: false, message: "class_id is required for students" });
      }

      const matchingClass = await Class.findByPk(class_id);
      if (!matchingClass) {
        return res.status(400).json({ success: false, message: `Class not found.` });
      }

      // Validate parent info before touching the DB
      if (!cleanExistingParentEmail && (!parentName || !parentEmail || !parentPassword)) {
        return res.status(400).json({ success: false, message: "Parent info is required for new student" });
      }

      if (cleanExistingParentEmail) {
        const existingParent = await User.findOne({ where: { email: cleanExistingParentEmail, role: 'parent' } });
        if (!existingParent) {
          return res.status(400).json({ success: false, message: `No parent found with email "${cleanExistingParentEmail}"` });
        }
      } else {
        const existingParentEmailUser = await User.findOne({ where: { email: cleanParentEmail } });
        if (existingParentEmailUser) {
          return res.status(400).json({ success: false, message: `Parent email "${cleanParentEmail}" already exists` });
        }
      }

      // Wrap all inserts in a transaction — if any step fails, everything rolls back
      const [hashedPassword, hashedParentPassword] = await Promise.all([
        bcrypt.hash(password, 10),
        parentPassword ? bcrypt.hash(parentPassword, 10) : Promise.resolve(null),
      ]);

      const newUser = await sequelize.transaction(async (t) => {
        let parentUserId;

        if (cleanExistingParentEmail) {
          const existingParent = await User.findOne({ where: { email: cleanExistingParentEmail, role: 'parent' }, transaction: t });
          parentUserId = existingParent.id;
        } else {
          const newParent = await User.create(
            { name: parentName.trim(), email: cleanParentEmail, password: hashedParentPassword, role: 'parent' },
            { transaction: t }
          );
          parentUserId = newParent.id;
        }

        const student = await User.create({ name: name.trim(), email: cleanEmail, password: hashedPassword, role }, { transaction: t });
        await Student.create({ user_id: student.id, class_id, parent_id: parentUserId }, { transaction: t });
        return student;
      });

      return res.json({ success: true, user: newUser });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // ── Teacher ──
    if (role === 'teacher') {
      const newUser = await User.create({ name: name.trim(), email: cleanEmail, password: hashedPassword, role });
      return res.json({ success: true, user: newUser });
    }

    // ── Parent / Manager / Admin ──
    const newUser = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      role,
      manager_scope: role === 'manager' ? manager_scope : null,
    });
    return res.json({ success: true, user: newUser });

  } catch (err) {
    console.error(err);
    if (err.name === 'SequelizeUniqueConstraintError') {
      const fields = err.fields ? Object.keys(err.fields).join(', ') : 'unique field';
      return res.status(400).json({ success: false, message: `A record with this ${fields} already exists` });
    }
    if (err.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({ success: false, message: "Invalid class ID — class does not exist" });
    }
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── LIST USERS ──────────────────────────────────────────────────────────────
// GET /admin/users?role=student
router.get('/users', async (req, res) => {
  try {
    const where = {};
    if (req.query.role) where.role = req.query.role;

    const users = await User.findAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── LIST STUDENTS (with class + parent info) ─────────────────────────────────
// GET /admin/students
router.get('/students', async (_req, res) => {
  try {
    const students = await Student.findAll({
      include: [
        { model: User, as: 'profile', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'parent', attributes: ['id', 'name', 'email'] },
        { model: Class, as: 'class', attributes: ['id', 'name'] }
      ]
    });
    res.json({ success: true, students });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── LIST TEACHERS (with classes + subjects) ──────────────────────────────────
// GET /admin/teachers
router.get('/teachers', async (_req, res) => {
  try {
    const teachers = await User.findAll({
      where: { role: 'teacher' },
      attributes: { exclude: ['password'] },
      include: [{
        model: Class,
        attributes: ['id', 'name'],
        through: {
          model: Teachers_Classes,
          attributes: ['subject_id']
        }
      }]
    });
    res.json({ success: true, teachers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── GET SINGLE USER ─────────────────────────────────────────────────────────
// GET /admin/users/:id
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── UPDATE USER ─────────────────────────────────────────────────────────────
// PUT /admin/users/:id
router.put('/users/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const { name, email, password, role, manager_scope } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (password) updates.password = await bcrypt.hash(password, 10);
    if (role) {
      updates.role = role;
      updates.manager_scope = role === 'manager' ? manager_scope : null;
    }
    if (role === 'manager' && !['grades_1_7', 'grades_8_12'].includes(manager_scope)) {
      return res.status(400).json({ success: false, message: "manager_scope is required for managers" });
    }

    await user.update(updates);

    const updated = await User.findByPk(user.id, { attributes: { exclude: ['password'] } });
    res.json({ success: true, user: updated });
  } catch (err) {
    console.error(err);
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── DELETE USER ─────────────────────────────────────────────────────────────
// DELETE /admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (user.id === req.user.id) {
      return res.status(400).json({ success: false, message: "You cannot delete your own account" });
    }

    await sequelize.transaction(async (t) => {
      if (user.role === 'student') {
        await Grade.destroy({ where: { student_id: user.id }, transaction: t });
        await Attendance.destroy({ where: { student_id: user.id }, transaction: t });
        await Student.destroy({ where: { user_id: user.id }, transaction: t });
      }

      if (user.role === 'teacher') {
        await Grade.destroy({ where: { teacher_id: user.id }, transaction: t });
        await Attendance.destroy({ where: { teacher_id: user.id }, transaction: t });
        await Teachers_Classes.destroy({ where: { teacher_id: user.id }, transaction: t });
      }

      if (user.role === 'parent') {
        // Unlink children — set their parent_id to null
        await Student.update({ parent_id: null }, { where: { parent_id: user.id }, transaction: t });
      }

      await user.destroy({ transaction: t });
    });

    res.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── LIST CLASSES ─────────────────────────────────────────────────────────────
// GET /admin/classes
router.get('/classes', async (_req, res) => {
  try {
    const classes = await Class.findAll({ order: [['grade_level', 'ASC'], ['section', 'ASC']] });
    res.json({ success: true, classes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── STUDENT DETAILS ──────────────────────────────────────────────────────────
// GET /admin/students/:userId
router.get('/students/:userId', async (req, res) => {
  try {
    const student = await Student.findOne({
      where: { user_id: req.params.userId },
      include: [
        { model: User, as: 'profile', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'parent', attributes: ['id', 'name', 'email'] },
        { model: Class, as: 'class', attributes: ['id', 'grade_level', 'section'] },
      ],
    });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, student });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── PARENT CHILDREN ──────────────────────────────────────────────────────────
// GET /admin/parents/:userId/children
router.get('/parents/:userId/children', async (req, res) => {
  try {
    const children = await Student.findAll({
      where: { parent_id: req.params.userId },
      include: [
        { model: User, as: 'profile', attributes: ['id', 'name', 'email'] },
        { model: Class, as: 'class', attributes: ['id', 'grade_level', 'section'] },
      ],
    });
    res.json({ success: true, children });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── TEACHER DETAILS ──────────────────────────────────────────────────────────
// GET /admin/teachers/:userId
router.get('/teachers/:userId', async (req, res) => {
  try {
    const teacher = await User.findOne({
      where: { id: req.params.userId, role: 'teacher' },
      attributes: { exclude: ['password'] },
      include: [{
        model: Class,
        attributes: ['id', 'grade_level', 'section'],
        through: { model: Teachers_Classes, attributes: [] },
      }],
    });
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });
    res.json({ success: true, teacher });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── SEND ANNOUNCEMENT ────────────────────────────────────────────────────────
// POST /admin/announcements
// Body: { title, content, date, target: 'all'|'role'|'specific', role?, user_ids? }
router.post('/announcements', async (req, res) => {
  try {
    const { title, content, date, target, role, user_ids } = req.body;

    if (!title || !content || !date || !target) {
      return res.status(400).json({ success: false, message: 'title, content, date, and target are required' });
    }

    if (!['all', 'role', 'specific'].includes(target)) {
      return res.status(400).json({ success: false, message: 'target must be "all", "role", or "specific"' });
    }

    if (target === 'role' && !role) {
      return res.status(400).json({ success: false, message: 'role is required when target is "role"' });
    }

    if (target === 'specific' && (!Array.isArray(user_ids) || !user_ids.length)) {
      return res.status(400).json({ success: false, message: 'user_ids array is required when target is "specific"' });
    }

    let recipientIds = [];

    if (target === 'all') {
      const users = await User.findAll({ attributes: ['id'] });
      recipientIds = users.map(u => u.id);
    } else if (target === 'role') {
      const validRoles = ['admin', 'manager', 'teacher', 'student', 'parent'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ success: false, message: `role must be one of: ${validRoles.join(', ')}` });
      }
      const users = await User.findAll({ where: { role }, attributes: ['id'] });
      recipientIds = users.map(u => u.id);
    } else {
      // target === 'specific'
      const users = await User.findAll({ where: { id: user_ids }, attributes: ['id'] });
      const foundIds = users.map(u => u.id);
      const missingIds = user_ids.filter(id => !foundIds.includes(id));
      if (missingIds.length) {
        return res.status(400).json({ success: false, message: `Users not found: ${missingIds.join(', ')}` });
      }
      recipientIds = foundIds;
    }

    if (!recipientIds.length) {
      return res.status(400).json({ success: false, message: 'No recipients found for this announcement' });
    }

    const announcement = await sequelize.transaction(async (t) => {
      const created = await Announcement.create(
        { sender_id: req.user.id, title, content, date },
        { transaction: t }
      );
      const receivers = recipientIds.map(uid => ({ announcement_id: created.id, user_id: uid }));
      await Announcement_Receiver.bulkCreate(receivers, { transaction: t });
      return created;
    });

    res.status(201).json({ success: true, announcement, recipient_count: recipientIds.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── LIST ADMIN ANNOUNCEMENTS ─────────────────────────────────────────────────
// GET /admin/announcements
router.get('/announcements', async (req, res) => {
  try {
    const announcements = await Announcement.findAll({
      where: { sender_id: req.user.id },
      include: [{
        model: Announcement_Receiver,
        as: 'receivers',
        include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'] }],
      }],
      order: [['date', 'DESC']],
    });

    res.json({ success: true, announcements });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET SINGLE ANNOUNCEMENT ──────────────────────────────────────────────────
// GET /admin/announcements/:id
router.get('/announcements/:id', async (req, res) => {
  try {
    const announcement = await Announcement.findOne({
      where: { id: req.params.id, sender_id: req.user.id },
      include: [{
        model: Announcement_Receiver,
        as: 'receivers',
        include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'] }],
      }],
    });

    if (!announcement) return res.status(404).json({ success: false, message: 'Announcement not found' });

    res.json({ success: true, announcement });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── DELETE ANNOUNCEMENT ──────────────────────────────────────────────────────
// DELETE /admin/announcements/:id
router.delete('/announcements/:id', async (req, res) => {
  try {
    const announcement = await Announcement.findOne({ where: { id: req.params.id, sender_id: req.user.id } });
    if (!announcement) return res.status(404).json({ success: false, message: 'Announcement not found' });

    await sequelize.transaction(async (t) => {
      await Announcement_Receiver.destroy({ where: { announcement_id: announcement.id }, transaction: t });
      await announcement.destroy({ transaction: t });
    });

    res.json({ success: true, message: 'Announcement deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
