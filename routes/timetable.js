// routes/timetable.js
const express = require('express');
const router  = express.Router();
const { Op }  = require('sequelize');
const { verifyToken } = require('../middleware/auth');
const { Timetable, Class, Subject, User, Student, Teachers_Classes } = require('../models');

router.use(verifyToken);

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday'];

// ── scope helpers (mirrors manager.js) ────────────────────────────────────────
const MANAGER_SCOPES = {
  grades_1_7:  { [Op.between]: [1,  7] },
  grades_8_12: { [Op.between]: [8, 12] },
};

async function getManagerGradeWhere(req) {
  const manager = await User.findByPk(req.user.id, { attributes: ['manager_scope'] });
  const scope   = manager?.manager_scope || 'grades_1_7';
  return MANAGER_SCOPES[scope] || MANAGER_SCOPES.grades_1_7;
}

// Returns the class only if it falls within this manager's grade range
async function getScopedClass(req, classId) {
  const gradeWhere = await getManagerGradeWhere(req);
  return Class.findOne({ where: { id: classId, grade_level: gradeWhere } });
}

// ── shared helper ─────────────────────────────────────────────────────────────
async function getClassTimetable(classId) {
  return Timetable.findAll({
    where: { class_id: classId },
    include: [
      { model: Class,   as: 'class',   attributes: ['id','grade_level','section'] },
      { model: Subject, as: 'subject', attributes: ['id','name'] },
      { model: User,    as: 'teacher', attributes: ['id','name','email'] },
    ],
    order: [['day','ASC'],['start_time','ASC']],
  });
}

// ── GET /timetable/meta  (manager only) ───────────────────────────────────────
// Returns subjects and scoped classes for the add-slot form
router.get('/meta', async (req, res) => {
  try {
    if (req.user.role !== 'manager')
      return res.status(403).json({ success: false, message: 'Access denied' });

    const gradeWhere = await getManagerGradeWhere(req);

    const [subjects, classes] = await Promise.all([
      Subject.findAll({ order: [['name','ASC']] }),
      Class.findAll({ where: { grade_level: gradeWhere }, order: [['grade_level','ASC'],['section','ASC']] }),
    ]);

    res.json({ success: true, subjects, classes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /timetable  ───────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { role } = req.user;

    // Manager — need class_id param, must be in scope
    if (role === 'manager') {
      const { class_id } = req.query;
      if (!class_id) return res.status(400).json({ success: false, message: 'class_id is required' });

      const cls = await getScopedClass(req, class_id);
      if (!cls) return res.status(403).json({ success: false, message: 'This class is outside your grade range' });

      const slots = await getClassTimetable(class_id);
      return res.json({ success: true, slots });
    }

    // Teacher — own schedule across all assigned classes
    if (role === 'teacher') {
      const slots = await Timetable.findAll({
        where: { teacher_id: req.user.id },
        include: [
          { model: Class,   as: 'class',   attributes: ['id','grade_level','section'] },
          { model: Subject, as: 'subject', attributes: ['id','name'] },
        ],
        order: [['day','ASC'],['start_time','ASC']],
      });
      return res.json({ success: true, slots });
    }

    // Student — own class timetable
    if (role === 'student') {
      const student = await Student.findOne({ where: { user_id: req.user.id }, attributes: ['class_id'] });
      if (!student) return res.status(404).json({ success: false, message: 'Student record not found' });
      const slots = await getClassTimetable(student.class_id);
      return res.json({ success: true, slots });
    }

    // Parent — child's timetable via ?student_id=X
    if (role === 'parent') {
      const { student_id } = req.query;
      if (!student_id) return res.status(400).json({ success: false, message: 'student_id is required' });
      const student = await Student.findOne({
        where: { user_id: student_id, parent_id: req.user.id },
        attributes: ['class_id'],
      });
      if (!student) return res.status(404).json({ success: false, message: 'Child not found' });
      const slots = await getClassTimetable(student.class_id);
      return res.json({ success: true, slots });
    }

    return res.status(403).json({ success: false, message: 'Access denied' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /timetable  (manager only) ───────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    if (req.user.role !== 'manager')
      return res.status(403).json({ success: false, message: 'Access denied' });

    const { class_id, subject_id, day, start_time, end_time } = req.body;
    if (!class_id || !subject_id || !day || !start_time || !end_time)
      return res.status(400).json({ success: false, message: 'All fields are required' });
    if (!DAYS.includes(day))
      return res.status(400).json({ success: false, message: 'Invalid day' });
    if (start_time >= end_time)
      return res.status(400).json({ success: false, message: 'end_time must be after start_time' });

    // Scope check — manager may only touch classes in their grade range
    const cls = await getScopedClass(req, class_id);
    if (!cls) return res.status(403).json({ success: false, message: 'This class is outside your grade range' });

    // Auto-resolve teacher from the class-subject assignment
    const assignment = await Teachers_Classes.findOne({ where: { class_id, subject_id } });
    if (!assignment || !assignment.teacher_id)
      return res.status(400).json({ success: false, message: 'No teacher is assigned to this subject in this class. Assign a teacher first in Class Assignments.' });

    const conflict = await Timetable.findOne({ where: { class_id, day, start_time } });
    if (conflict)
      return res.status(409).json({ success: false, message: `A slot already exists at ${start_time} on ${day} for this class` });

    const slot = await Timetable.create({ class_id, subject_id, teacher_id: assignment.teacher_id, day, start_time, end_time });
    res.status(201).json({ success: true, slot });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── PUT /timetable/:id  (manager only) ────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'manager')
      return res.status(403).json({ success: false, message: 'Access denied' });

    const slot = await Timetable.findByPk(req.params.id);
    if (!slot) return res.status(404).json({ success: false, message: 'Slot not found' });

    // Scope check
    const cls = await getScopedClass(req, slot.class_id);
    if (!cls) return res.status(403).json({ success: false, message: 'This class is outside your grade range' });

    const { subject_id, teacher_id, day, start_time, end_time } = req.body;
    const newDay  = day        || slot.day;
    const newTime = start_time || slot.start_time;

    if (day || start_time) {
      const conflict = await Timetable.findOne({ where: { class_id: slot.class_id, day: newDay, start_time: newTime } });
      if (conflict && conflict.id !== slot.id)
        return res.status(409).json({ success: false, message: `A slot already exists at ${newTime} on ${newDay}` });
    }

    const updates = {};
    if (subject_id) updates.subject_id = subject_id;
    if (teacher_id) updates.teacher_id = teacher_id;
    if (day)        updates.day        = day;
    if (start_time) updates.start_time = start_time;
    if (end_time)   updates.end_time   = end_time;

    await slot.update(updates);
    res.json({ success: true, slot });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── DELETE /timetable/:id  (manager only) ─────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'manager')
      return res.status(403).json({ success: false, message: 'Access denied' });

    const slot = await Timetable.findByPk(req.params.id);
    if (!slot) return res.status(404).json({ success: false, message: 'Slot not found' });

    // Scope check
    const cls = await getScopedClass(req, slot.class_id);
    if (!cls) return res.status(403).json({ success: false, message: 'This class is outside your grade range' });

    await slot.destroy();
    res.json({ success: true, message: 'Slot deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
