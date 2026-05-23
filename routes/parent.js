// routes/parent.js
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { User, Student, Class, Subject, Teachers_Classes, Grade, Attendance, Announcement, Announcement_Receiver } = require('../models');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);
router.use(requireRole('parent'));

const className = (cls) => `Grade ${cls.grade_level} - ${cls.section}`;

// Helper: find a child that belongs to the logged-in parent; returns null if not found / not theirs
async function getOwnChild(parentId, studentId) {
  return Student.findOne({ where: { user_id: studentId, parent_id: parentId } });
}

function gradePercentage(grade) {
  const max = Number(grade.max_grade);
  return max ? Math.round((Number(grade.grade_value) / max) * 100) : 0;
}

function summarizeGrades(grades) {
  const earned = grades.reduce((sum, g) => sum + Number(g.grade_value || 0), 0);
  const possible = grades.reduce((sum, g) => sum + Number(g.max_grade || 0), 0);
  return {
    count: grades.length,
    earned,
    possible,
    percentage: possible ? Math.round((earned / possible) * 100) : 0,
    exams: grades.filter(g => g.type === 'exam').length,
    quizzes: grades.filter(g => g.type === 'quiz').length,
    homework: grades.filter(g => g.type === 'homework').length,
  };
}

// Keep only the latest record per date (records must be sorted date DESC, id DESC)
function deduplicateAttendance(records) {
  const seen = new Set();
  return records.filter(r => {
    if (seen.has(r.date)) return false;
    seen.add(r.date);
    return true;
  });
}

function summarizeAttendance(records) {
  const total = records.length;
  const present = records.filter(r => r.status === 'Present').length;
  const absent = records.filter(r => r.status === 'Absent').length;
  const late = records.filter(r => r.status === 'Late').length;
  const excused = records.filter(r => r.status === 'Excused').length;
  return { total, present, absent, late, excused, percentage: total ? Math.round((present / total) * 100) : 0 };
}

function formatGrade(g) {
  return {
    id: g.id,
    subject_id: g.subject_id,
    subject_name: g.subject?.name || '',
    teacher_id: g.teacher_id,
    teacher_name: g.teacher?.name || null,
    teacher_email: g.teacher?.email || null,
    type: g.type,
    grade_value: g.grade_value,
    max_grade: g.max_grade,
    percentage: gradePercentage(g),
    date: g.date,
  };
}

function formatAttendance(a) {
  return {
    id: a.id,
    date: a.date,
    status: a.status,
    teacher_id: a.teacher_id,
    teacher_name: a.teacher?.name || null,
    teacher_email: a.teacher?.email || null,
  };
}

async function getChildDetails(parentId, studentId) {
  const student = await Student.findOne({
    where: { user_id: studentId, parent_id: parentId },
    include: [
      { model: User, as: 'profile', attributes: ['id', 'name', 'email'] },
      { model: Class, as: 'class', attributes: ['id', 'grade_level', 'section'] },
    ],
  });
  if (!student) return null;

  const [assignments, grades, attendance] = await Promise.all([
    Teachers_Classes.findAll({
      where: { class_id: student.class_id },
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name'] },
        { model: User, as: 'teacher', attributes: ['id', 'name', 'email'] },
      ],
      order: [[{ model: Subject, as: 'subject' }, 'name', 'ASC']],
    }),
    Grade.findAll({
      where: { student_id: studentId },
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name'] },
        { model: User, as: 'teacher', attributes: ['id', 'name', 'email'] },
      ],
      order: [['date', 'DESC'], ['id', 'DESC']],
    }),
    Attendance.findAll({
      where: { student_id: studentId },
      include: [{ model: User, as: 'teacher', attributes: ['id', 'name', 'email'] }],
      order: [['date', 'DESC'], ['id', 'DESC']],
    }),
  ]);

  return {
    user_id: student.user_id,
    profile: student.profile,
    class: student.class ? { ...student.class.dataValues, name: className(student.class) } : null,
    subjects: assignments.map(a => ({
      subject_id: a.subject_id,
      subject_name: a.subject?.name || '',
      teacher_id: a.teacher_id,
      teacher_name: a.teacher?.name || null,
      teacher_email: a.teacher?.email || null,
    })),
    grades: grades.map(formatGrade),
    attendance: deduplicateAttendance(attendance).map(formatAttendance),
    summaries: {
      grades: summarizeGrades(grades),
      attendance: summarizeAttendance(deduplicateAttendance(attendance)),
    },
  };
}

// GET /parent/overview
// Full parent dashboard: all children with subjects, marks, attendance, and announcements.
router.get('/overview', async (req, res) => {
  try {
    const children = await Student.findAll({
      where: { parent_id: req.user.id },
      attributes: ['user_id'],
      order: [['user_id', 'ASC']],
    });

    const details = await Promise.all(children.map(child => getChildDetails(req.user.id, child.user_id)));
    const inbox = await Announcement_Receiver.findAll({
      where: { user_id: req.user.id },
      include: [{
        model: Announcement,
        as: 'announcement',
        include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'email', 'role'] }],
      }],
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      parent: { id: req.user.id, name: req.user.name, email: req.user.email },
      children: details.filter(Boolean),
      announcements: inbox.map(r => r.announcement).filter(Boolean),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET /parent/children ─────────────────────────────────────────────────────
// Lists all children of the logged-in parent (basic info)
router.get('/children', async (req, res) => {
  try {
    const children = await Student.findAll({
      where: { parent_id: req.user.id },
      include: [
        { model: User,  as: 'profile', attributes: ['id', 'name', 'email'] },
        { model: Class, as: 'class',   attributes: ['id', 'grade_level', 'section'] },
      ],
    });

    const result = children.map(s => ({
      user_id: s.user_id,
      profile: s.profile,
      class: s.class ? { ...s.class.dataValues, name: className(s.class) } : null,
    }));

    res.json({ success: true, children: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET /parent/children/:studentId ─────────────────────────────────────────
// Full profile for one child: personal info + class + every subject with its teacher
router.get('/children/:studentId', async (req, res) => {
  try {
    const child = await getChildDetails(req.user.id, req.params.studentId);
    if (!child) return res.status(404).json({ success: false, message: 'Child not found' });
    res.json({ success: true, child });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET /parent/children/:studentId/grades ───────────────────────────────────
// All marks grouped by subject.
// Optional query: subject_id, type (exam|quiz|homework)
router.get('/children/:studentId/grades', async (req, res) => {
  try {
    const child = await getOwnChild(req.user.id, req.params.studentId);
    if (!child) return res.status(404).json({ success: false, message: 'Child not found' });

    const where = {
      student_id: req.params.studentId,
    };
    if (req.query.subject_id) where.subject_id = req.query.subject_id;
    if (req.query.type) where.type = req.query.type;

    const grades = await Grade.findAll({
      where,
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name'] },
        { model: User,    as: 'teacher', attributes: ['id', 'name', 'email'] },
      ],
      order: [['date', 'DESC'], ['id', 'DESC']],
    });

    // Group by subject for easier consumption by the frontend
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
      bySubject[key].grades.push(formatGrade(g));
    }

    res.json({ success: true, summary: summarizeGrades(grades), grades_by_subject: Object.values(bySubject), grades: grades.map(formatGrade) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET /parent/children/:studentId/attendance ───────────────────────────────
// Query params (optional): start_date, end_date, status
router.get('/children/:studentId/attendance', async (req, res) => {
  try {
    const child = await getOwnChild(req.user.id, req.params.studentId);
    if (!child) return res.status(404).json({ success: false, message: 'Child not found' });

    const where = { student_id: req.params.studentId };
    const { start_date, end_date, status } = req.query;

    if (start_date && end_date) {
      where.date = { [Op.between]: [start_date, end_date] };
    } else if (start_date) {
      where.date = { [Op.gte]: start_date };
    } else if (end_date) {
      where.date = { [Op.lte]: end_date };
    }
    if (status) where.status = status;

    const raw = await Attendance.findAll({
      where,
      include: [{ model: User, as: 'teacher', attributes: ['id', 'name', 'email'] }],
      order: [['date', 'DESC'], ['id', 'DESC']],
    });
    const records = deduplicateAttendance(raw);

    res.json({
      success: true,
      summary: summarizeAttendance(records),
      records: records.map(formatAttendance),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET /parent/announcements ────────────────────────────────────────────────
// Announcements sent directly to this parent.
router.get('/announcements', async (req, res) => {
  try {
    const receivers = await Announcement_Receiver.findAll({
      where: { user_id: req.user.id },
      include: [{
        model: Announcement,
        as: 'announcement',
        include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'email', 'role'] }],
      }],
      order: [['createdAt', 'DESC']],
    });

    res.json({ success: true, announcements: receivers.map(r => r.announcement).filter(Boolean) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
