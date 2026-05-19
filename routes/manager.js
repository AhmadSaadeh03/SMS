// routes/manager.js
const express = require('express');
const router = express.Router();
const { User, Student, Class, Subject, Teachers_Classes, Grade, Attendance, Announcement, Announcement_Receiver } = require('../models');
const sequelize = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const DEFAULT_SUBJECTS = require('../config/defaultSubjects');
const { Op } = require('sequelize');

router.use(verifyToken);
router.use(requireRole('manager'));

const className = (cls) => `Grade ${cls.grade_level} - ${cls.section}`;
const MANAGER_SCOPES = {
  grades_1_7: { [Op.between]: [1, 7] },
  grades_8_12: { [Op.between]: [8, 12] },
};

async function getManagerGradeWhere(req) {
  const manager = await User.findByPk(req.user.id, { attributes: ['id', 'manager_scope'] });
  const scope = manager?.manager_scope || 'grades_1_7';
  return MANAGER_SCOPES[scope] || MANAGER_SCOPES.grades_1_7;
}

async function getManagerScope(req) {
  const manager = await User.findByPk(req.user.id, { attributes: ['id', 'manager_scope'] });
  return manager?.manager_scope || 'grades_1_7';
}

function gradeAllowedByScope(gradeLevel, scope) {
  const grade = Number(gradeLevel);
  if (scope === 'grades_8_12') return grade >= 8 && grade <= 12;
  return grade >= 1 && grade <= 7;
}

async function getScopedClass(req, classId) {
  return Class.findOne({
    where: { id: classId, grade_level: await getManagerGradeWhere(req) },
  });
}

// ─── GET ALL CLASSES ──────────────────────────────────────────────────────────
// GET /manager/classes
router.get('/classes', async (req, res) => {
  try {
    const classes = await Class.findAll({
      where: { grade_level: await getManagerGradeWhere(req) },
      order: [['grade_level', 'ASC'], ['section', 'ASC']],
    });

    const studentCounts = await Student.findAll({
      attributes: ['class_id', [sequelize.fn('COUNT', sequelize.col('user_id')), 'count']],
      group: ['class_id'],
    });
    const countMap = Object.fromEntries(studentCounts.map(s => [s.class_id, parseInt(s.dataValues.count)]));

    const result = classes.map(cls => ({
      id: cls.id,
      grade_level: cls.grade_level,
      section: cls.section,
      name: className(cls),
      student_count: countMap[cls.id] || 0,
    }));

    res.json({ success: true, classes: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET CLASS DETAIL ─────────────────────────────────────────────────────────
// GET /manager/classes/:id
router.get('/classes/:id', async (req, res) => {
  try {
    const cls = await getScopedClass(req, req.params.id);
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });

    const students = await Student.findAll({
      where: { class_id: req.params.id },
      include: [{ model: User, as: 'profile', attributes: ['id', 'name', 'email'] }],
    });

    const assignments = await Teachers_Classes.findAll({
      where: { class_id: req.params.id },
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name'] },
        { model: User,    as: 'teacher', attributes: ['id', 'name', 'email'] },
      ],
    });

    res.json({
      success: true,
      class: { id: cls.id, grade_level: cls.grade_level, section: cls.section, name: className(cls) },
      students,
      assignments,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET ALL STUDENTS ─────────────────────────────────────────────────────────
// GET /manager/students
router.get('/students', async (req, res) => {
  try {
    const students = await Student.findAll({
      include: [
        { model: User,  as: 'profile', attributes: ['id', 'name', 'email'] },
        { model: Class, as: 'class', attributes: ['id', 'grade_level', 'section'], where: { grade_level: await getManagerGradeWhere(req) } },
      ],
      order: [[{ model: Class, as: 'class' }, 'grade_level', 'ASC']],
    });

    const result = students.map(s => ({
      user_id: s.user_id,
      profile: s.profile,
      class: s.class ? { ...s.class.dataValues, name: className(s.class) } : null,
    }));

    res.json({ success: true, students: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── MOVE STUDENT TO ANOTHER CLASS ───────────────────────────────────────────
// GET /manager/students/:userId/records
router.get('/students/:userId/records', async (req, res) => {
  try {
    const student = await Student.findOne({
      where: { user_id: req.params.userId },
      include: [
        { model: User, as: 'profile', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'parent', attributes: ['id', 'name', 'email'] },
        { model: Class, as: 'class', attributes: ['id', 'grade_level', 'section'], where: { grade_level: await getManagerGradeWhere(req) } },
      ],
    });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const grades = await Grade.findAll({
      where: { student_id: req.params.userId },
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name'] },
        { model: User, as: 'teacher', attributes: ['id', 'name', 'email'] },
      ],
      order: [['date', 'DESC'], ['id', 'DESC']],
    });

    const attendance = await Attendance.findAll({
      where: { student_id: req.params.userId },
      include: [{ model: User, as: 'teacher', attributes: ['id', 'name', 'email'] }],
      order: [['date', 'DESC'], ['id', 'DESC']],
    });

    const gradeSummary = { count: grades.length, earned: 0, possible: 0, percentage: 0 };
    grades.forEach(g => {
      gradeSummary.earned += Number(g.grade_value) || 0;
      gradeSummary.possible += Number(g.max_grade) || 0;
    });
    gradeSummary.percentage = gradeSummary.possible ? Math.round((gradeSummary.earned / gradeSummary.possible) * 100) : 0;

    const attendanceSummary = {
      total: attendance.length,
      present: attendance.filter(a => a.status === 'Present').length,
      absent: attendance.filter(a => a.status === 'Absent').length,
      late: attendance.filter(a => a.status === 'Late').length,
      excused: attendance.filter(a => a.status === 'Excused').length,
    };
    attendanceSummary.percentage = attendanceSummary.total ? Math.round((attendanceSummary.present / attendanceSummary.total) * 100) : 0;

    res.json({
      success: true,
      student: {
        user_id: student.user_id,
        profile: student.profile,
        parent: student.parent,
        class: student.class ? { ...student.class.dataValues, name: className(student.class) } : null,
      },
      grades,
      attendance,
      summaries: { grades: gradeSummary, attendance: attendanceSummary },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /manager/students/:userId/move  { class_id }
router.put('/students/:userId/move', async (req, res) => {
  try {
    const { class_id } = req.body;
    if (!class_id) return res.status(400).json({ success: false, message: 'class_id is required' });

    const cls = await getScopedClass(req, class_id);
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });

    const student = await Student.findOne({
      where: { user_id: req.params.userId },
      include: [{ model: Class, as: 'class', attributes: ['id', 'grade_level'], where: { grade_level: await getManagerGradeWhere(req) } }],
    });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    await student.update({ class_id });
    res.json({ success: true, message: 'Student moved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET ALL ASSIGNMENTS ──────────────────────────────────────────────────────
// GET /manager/assignments
router.get('/assignments', async (req, res) => {
  try {
    const assignments = await Teachers_Classes.findAll({
      include: [
        { model: Class, as: 'class', attributes: ['id', 'grade_level', 'section'], where: { grade_level: await getManagerGradeWhere(req) } },
        { model: Subject, as: 'subject', attributes: ['id', 'name'] },
        { model: User,    as: 'teacher', attributes: ['id', 'name', 'email'] },
      ],
      order: [['class_id', 'ASC'], ['subject_id', 'ASC']],
    });

    const result = assignments.map(a => ({
      id: a.id,
      teacher_id: a.teacher_id,
      class_id: a.class_id,
      subject_id: a.subject_id,
      class: a.class ? { ...a.class.dataValues, name: className(a.class) } : null,
      subject: a.subject,
      teacher: a.teacher,
    }));

    res.json({ success: true, assignments: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── ADD SUBJECT TO CLASS (optionally assign teacher) ─────────────────────────
// POST /manager/assignments  { class_id, subject_id, teacher_id? }
router.post('/assignments', async (req, res) => {
  try {
    const { class_id, subject_id, teacher_id } = req.body;
    if (!class_id || !subject_id) {
      return res.status(400).json({ success: false, message: 'class_id and subject_id are required' });
    }
    const cls = await getScopedClass(req, class_id);
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });

    const exists = await Teachers_Classes.findOne({ where: { class_id, subject_id } });
    if (exists) {
      return res.status(400).json({ success: false, message: 'This subject is already added to this class' });
    }

    if (teacher_id) {
      const teacher = await User.findOne({ where: { id: teacher_id, role: 'teacher' } });
      if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    const assignment = await Teachers_Classes.create({
      class_id,
      subject_id,
      teacher_id: teacher_id || null,
    });

    res.status(201).json({ success: true, assignment });
  } catch (err) {
    console.error(err);
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ success: false, message: 'This subject is already assigned to this class.' });
    }
    res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// ─── ASSIGN / UPDATE TEACHER ON AN ASSIGNMENT ────────────────────────────────
// PUT /manager/assignments/:id  { teacher_id }
router.put('/assignments/:id', async (req, res) => {
  try {
    const assignment = await Teachers_Classes.findByPk(req.params.id, {
      include: [{ model: Class, as: 'class', attributes: ['id', 'grade_level', 'section'] }],
    });
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    const allowedClass = await getScopedClass(req, assignment.class_id);
    if (!allowedClass) return res.status(403).json({ success: false, message: 'This assignment is outside your grade range' });

    const { teacher_id } = req.body;

    if (teacher_id) {
      const teacher = await User.findOne({ where: { id: teacher_id, role: 'teacher' } });
      if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    await assignment.update({ teacher_id: teacher_id || null });
    res.json({ success: true, assignment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── REMOVE SUBJECT/ASSIGNMENT FROM CLASS ────────────────────────────────────
// DELETE /manager/assignments/:id
router.delete('/assignments/:id', async (req, res) => {
  try {
    const assignment = await Teachers_Classes.findByPk(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    const allowedClass = await getScopedClass(req, assignment.class_id);
    if (!allowedClass) return res.status(403).json({ success: false, message: 'This assignment is outside your grade range' });

    await assignment.destroy();
    res.json({ success: true, message: 'Assignment removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── LIST ALL TEACHERS ────────────────────────────────────────────────────────
// GET /manager/teachers
router.get('/teachers', async (_req, res) => {
  try {
    const teachers = await User.findAll({
      where: { role: 'teacher' },
      attributes: ['id', 'name', 'email'],
      order: [['name', 'ASC']],
    });
    res.json({ success: true, teachers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /manager/users?role=student|parent|teacher
router.get('/users', async (req, res) => {
  try {
    const allowedRoles = ['student', 'parent', 'teacher'];
    const where = {};
    if (req.query.role) {
      if (!allowedRoles.includes(req.query.role)) {
        return res.status(400).json({ success: false, message: 'Managers can only message students, parents, and teachers' });
      }
      where.role = req.query.role;
    } else {
      where.role = allowedRoles;
    }

    const users = await User.findAll({
      where,
      attributes: ['id', 'name', 'email', 'role'],
      order: [['role', 'ASC'], ['name', 'ASC']],
    });
    res.json({ success: true, users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /manager/announcements
// Body: { title, content, date, target: 'all'|'role'|'specific', role?, user_ids? }
router.post('/announcements', async (req, res) => {
  try {
    const { title, content, date, target, role, user_ids } = req.body;
    const allowedRoles = ['student', 'parent', 'teacher'];

    if (!title || !content || !date || !target) {
      return res.status(400).json({ success: false, message: 'title, content, date, and target are required' });
    }

    if (!['all', 'role', 'specific'].includes(target)) {
      return res.status(400).json({ success: false, message: 'target must be all, role, or specific' });
    }

    let recipientIds = [];
    if (target === 'all') {
      const users = await User.findAll({ where: { role: allowedRoles }, attributes: ['id'] });
      recipientIds = users.map(u => u.id);
    } else if (target === 'role') {
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ success: false, message: 'Role must be student, parent, or teacher' });
      }
      const users = await User.findAll({ where: { role }, attributes: ['id'] });
      recipientIds = users.map(u => u.id);
    } else {
      if (!Array.isArray(user_ids) || user_ids.length === 0) {
        return res.status(400).json({ success: false, message: 'Choose at least one recipient' });
      }
      const users = await User.findAll({
        where: { id: user_ids, role: allowedRoles },
        attributes: ['id'],
      });
      recipientIds = users.map(u => u.id);
      const missing = user_ids.filter(id => !recipientIds.includes(id));
      if (missing.length) {
        return res.status(400).json({ success: false, message: 'Some selected users were not found or are not allowed recipients' });
      }
    }

    if (!recipientIds.length) {
      return res.status(400).json({ success: false, message: 'No recipients found' });
    }

    const announcement = await sequelize.transaction(async (t) => {
      const created = await Announcement.create({ sender_id: req.user.id, title, content, date }, { transaction: t });
      await Announcement_Receiver.bulkCreate(
        recipientIds.map(user_id => ({ announcement_id: created.id, user_id })),
        { transaction: t }
      );
      return created;
    });

    res.status(201).json({ success: true, announcement, recipient_count: recipientIds.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /manager/announcements/sent
router.get('/announcements/sent', async (req, res) => {
  try {
    const announcements = await Announcement.findAll({
      where: { sender_id: req.user.id },
      include: [{
        model: Announcement_Receiver,
        as: 'receivers',
        include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'] }],
      }],
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
    });
    res.json({ success: true, announcements });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /manager/announcements/inbox
router.get('/announcements/inbox', async (req, res) => {
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

    const announcements = receivers
      .map(r => r.announcement)
      .filter(a => a?.sender?.role === 'admin');

    res.json({ success: true, announcements });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /manager/announcements/:id
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

// ─── CREATE CLASS ─────────────────────────────────────────────────────────────
// POST /manager/classes  { grade_level, section }
router.post('/classes', async (req, res) => {
  try {
    const { grade_level, section } = req.body;
    if (!grade_level || !section) {
      return res.status(400).json({ success: false, message: 'grade_level and section are required' });
    }
    if (!gradeAllowedByScope(grade_level, await getManagerScope(req))) {
      return res.status(403).json({ success: false, message: 'This grade is outside your manager range' });
    }

    const exists = await Class.findOne({ where: { grade_level, section } });
    if (exists) {
      return res.status(400).json({ success: false, message: 'A class with this grade level and section already exists' });
    }

    const cls = await Class.create({ grade_level, section, manager_id: req.user.id });
    res.status(201).json({ success: true, class: { ...cls.dataValues, name: className(cls) } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── DELETE CLASS ─────────────────────────────────────────────────────────────
// DELETE /manager/classes/:id
router.delete('/classes/:id', async (req, res) => {
  try {
    const cls = await getScopedClass(req, req.params.id);
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });

    const studentCount = await Student.count({ where: { class_id: req.params.id } });
    if (studentCount > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete a class that still has students' });
    }

    await Teachers_Classes.destroy({ where: { class_id: req.params.id } });
    await cls.destroy();
    res.json({ success: true, message: 'Class deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── LIST ALL SUBJECTS ────────────────────────────────────────────────────────
// GET /manager/subjects
router.get('/subjects', async (_req, res) => {
  try {
    const subjects = await Subject.findAll();
    const order = new Map(DEFAULT_SUBJECTS.map((name, index) => [name.toLowerCase(), index]));
    subjects.sort((a, b) => {
      const aOrder = order.has(a.name.toLowerCase()) ? order.get(a.name.toLowerCase()) : 999;
      const bOrder = order.has(b.name.toLowerCase()) ? order.get(b.name.toLowerCase()) : 999;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.name.localeCompare(b.name);
    });
    res.json({ success: true, subjects: subjects.map(s => ({ id: s.id, name: s.name })) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── CREATE SUBJECT ───────────────────────────────────────────────────────────
// POST /manager/subjects  { name }
router.post('/subjects', async (req, res) => {
  res.status(403).json({ success: false, message: 'Subjects are fixed by the system.' });
});

// ─── DELETE SUBJECT ───────────────────────────────────────────────────────────
// DELETE /manager/subjects/:id
router.delete('/subjects/:id', async (req, res) => {
  res.status(403).json({ success: false, message: 'Subjects are fixed by the system.' });
});

// ─── CLASS SETUP REPORT ───────────────────────────────────────────────────────
// GET /manager/reports/classes
router.get('/reports/classes', async (req, res) => {
  try {
    const classes = await Class.findAll({
      where: { grade_level: await getManagerGradeWhere(req) },
      order: [['grade_level', 'ASC'], ['section', 'ASC']],
    });

    const assignments = await Teachers_Classes.findAll({
      include: [
        { model: Class, as: 'class', attributes: ['id', 'grade_level', 'section'], where: { grade_level: await getManagerGradeWhere(req) } },
        { model: Subject, as: 'subject', attributes: ['id', 'name'] },
        { model: User,    as: 'teacher', attributes: ['id', 'name'] },
      ],
    });

    const studentCounts = await Student.findAll({
      attributes: ['class_id', [sequelize.fn('COUNT', sequelize.col('user_id')), 'count']],
      group: ['class_id'],
    });
    const countMap = Object.fromEntries(studentCounts.map(s => [s.class_id, parseInt(s.dataValues.count)]));

    const report = classes.map(cls => {
      const classAssignments = assignments.filter(a => a.class_id === cls.id);
      return {
        id: cls.id,
        name: className(cls),
        grade_level: cls.grade_level,
        section: cls.section,
        student_count: countMap[cls.id] || 0,
        subjects: classAssignments.map(a => ({
          assignment_id: a.id,
          subject_id: a.subject_id,
          subject_name: a.subject?.name || '',
          teacher_id: a.teacher_id,
          teacher_name: a.teacher?.name || null,
        })),
        total_subjects: classAssignments.length,
        assigned_subjects: classAssignments.filter(a => a.teacher_id).length,
      };
    });

    res.json({ success: true, report });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
