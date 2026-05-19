// routes/student.js
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { User, Student, Class, Subject, Teachers_Classes, Grade, Attendance, Announcement } = require('../models');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);
router.use(requireRole('student'));

const className = (cls) => `Grade ${cls.grade_level} - ${cls.section}`;

// ─── GET /student/profile ─────────────────────────────────────────────────────
// Own profile: personal info + class + subjects with teachers
router.get('/profile', async (req, res) => {
  try {
    const student = await Student.findOne({
      where: { user_id: req.user.id },
      include: [
        { model: User,  as: 'profile', attributes: ['id', 'name', 'email'] },
        { model: Class, as: 'class',   attributes: ['id', 'grade_level', 'section'] },
      ],
    });
    if (!student) return res.status(404).json({ success: false, message: 'Student record not found' });

    const assignments = await Teachers_Classes.findAll({
      where: { class_id: student.class_id },
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name'] },
        { model: User,    as: 'teacher', attributes: ['id', 'name'] },
      ],
    });

    const subjects = assignments.map(a => ({
      subject_id:   a.subject_id,
      subject_name: a.subject?.name || '',
      teacher_id:   a.teacher_id,
      teacher_name: a.teacher?.name || null,
    }));

    res.json({
      success: true,
      profile: student.profile,
      class: student.class ? { ...student.class.dataValues, name: className(student.class) } : null,
      subjects,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET /student/grades ──────────────────────────────────────────────────────
// Own grades, grouped by subject.
// Optional query: type (exam|quiz|homework), subject_id
router.get('/grades', async (req, res) => {
  try {
    const where = { student_id: req.user.id };
    if (req.query.type)       where.type       = req.query.type;
    if (req.query.subject_id) where.subject_id = req.query.subject_id;

    const grades = await Grade.findAll({
      where,
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name'] },
        { model: User,    as: 'teacher', attributes: ['id', 'name'] },
      ],
      order: [['date', 'DESC']],
    });

    // Group by subject
    const bySubject = {};
    for (const g of grades) {
      const key = g.subject_id;
      if (!bySubject[key]) {
        bySubject[key] = {
          subject_id:   g.subject_id,
          subject_name: g.subject?.name || '',
          grades: [],
        };
      }
      bySubject[key].grades.push({
        id:           g.id,
        type:         g.type,
        grade_value:  g.grade_value,
        max_grade:    g.max_grade,
        percentage:   Math.round((g.grade_value / g.max_grade) * 100),
        date:         g.date,
        teacher_name: g.teacher?.name || null,
      });
    }

    res.json({ success: true, grades_by_subject: Object.values(bySubject) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET /student/attendance ──────────────────────────────────────────────────
// Own attendance records + summary.
// Optional query: start_date, end_date, status
router.get('/attendance', async (req, res) => {
  try {
    const where = { student_id: req.user.id };
    const { start_date, end_date, status } = req.query;

    if (start_date && end_date) {
      where.date = { [Op.between]: [start_date, end_date] };
    } else if (start_date) {
      where.date = { [Op.gte]: start_date };
    } else if (end_date) {
      where.date = { [Op.lte]: end_date };
    }
    if (status) where.status = status;

    const records = await Attendance.findAll({ where, order: [['date', 'DESC']] });

    const total      = records.length;
    const present    = records.filter(r => r.status === 'Present').length;
    const absent     = records.filter(r => r.status === 'Absent').length;
    const late       = records.filter(r => r.status === 'Late').length;
    const excused    = records.filter(r => r.status === 'Excused').length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    res.json({
      success: true,
      summary: { total, present, absent, late, excused, percentage },
      records,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET /student/announcements ───────────────────────────────────────────────
// Announcements from teachers who teach the student's class
router.get('/announcements', async (req, res) => {
  try {
    const student = await Student.findOne({ where: { user_id: req.user.id }, attributes: ['class_id'] });
    if (!student) return res.status(404).json({ success: false, message: 'Student record not found' });

    const assignments = await Teachers_Classes.findAll({
      where: { class_id: student.class_id },
      attributes: ['teacher_id'],
    });

    const teacherIds = [...new Set(assignments.map(a => a.teacher_id).filter(Boolean))];
    if (!teacherIds.length) return res.json({ success: true, announcements: [] });

    const announcements = await Announcement.findAll({
      where: { sender_id: teacherIds },
      include: [{ model: User, as: 'sender', attributes: ['id', 'name'] }],
      order: [['date', 'DESC']],
    });

    res.json({ success: true, announcements });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
