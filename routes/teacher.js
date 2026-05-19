// routes/teacher.js
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const {
  User,
  Student,
  Class,
  Subject,
  Teachers_Classes,
  Grade,
  Attendance,
  Announcement,
  Announcement_Receiver,
} = require('../models');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);
router.use(requireRole('teacher'));

const className = (cls) => `Grade ${cls.grade_level} - ${cls.section}`;

async function getTeacherAssignments(teacherId) {
  return Teachers_Classes.findAll({
    where: { teacher_id: teacherId },
    include: [
      { model: Class, as: 'class', attributes: ['id', 'grade_level', 'section'] },
      { model: Subject, as: 'subject', attributes: ['id', 'name'] },
    ],
    order: [['class_id', 'ASC'], ['subject_id', 'ASC']],
  });
}

async function getTeacherClassIds(teacherId) {
  const rows = await Teachers_Classes.findAll({
    where: { teacher_id: teacherId },
    attributes: ['class_id'],
  });
  return [...new Set(rows.map(r => r.class_id))];
}

async function teacherOwnsClass(teacherId, classId) {
  const row = await Teachers_Classes.findOne({ where: { teacher_id: teacherId, class_id: classId } });
  return Boolean(row);
}

async function teacherOwnsSubjectInClass(teacherId, classId, subjectId) {
  const row = await Teachers_Classes.findOne({
    where: { teacher_id: teacherId, class_id: classId, subject_id: subjectId },
  });
  return Boolean(row);
}

async function getStudentInTeacherClass(teacherId, studentId) {
  const classIds = await getTeacherClassIds(teacherId);
  if (classIds.length === 0) return null;
  return Student.findOne({
    where: { user_id: studentId, class_id: classIds },
    include: [
      { model: User, as: 'profile', attributes: ['id', 'name', 'email'] },
      { model: User, as: 'parent', attributes: ['id', 'name', 'email'] },
      { model: Class, as: 'class', attributes: ['id', 'grade_level', 'section'] },
    ],
  });
}

function formatStudent(s) {
  return {
    user_id: s.user_id,
    class_id: s.class_id,
    profile: s.profile,
    parent: s.parent,
    class: s.class ? { ...s.class.dataValues, name: className(s.class) } : null,
  };
}

router.get('/overview', async (req, res) => {
  try {
    const assignments = await getTeacherAssignments(req.user.id);
    const classIds = [...new Set(assignments.map(a => a.class_id))];
    const students = classIds.length ? await Student.findAll({ where: { class_id: classIds } }) : [];
    const grades = await Grade.findAll({ where: { teacher_id: req.user.id } });
    const announcements = await Announcement.findAll({ where: { sender_id: req.user.id } });

    res.json({
      success: true,
      stats: {
        classes: classIds.length,
        subjects: assignments.length,
        students: students.length,
        grades: grades.length,
        announcements: announcements.length,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/classes', async (req, res) => {
  try {
    const assignments = await getTeacherAssignments(req.user.id);
    const classIds = [...new Set(assignments.map(a => a.class_id))];
    const students = classIds.length
      ? await Student.findAll({ where: { class_id: classIds }, attributes: ['user_id', 'class_id'] })
      : [];
    const studentCounts = students.reduce((map, s) => {
      map[s.class_id] = (map[s.class_id] || 0) + 1;
      return map;
    }, {});

    const byClass = {};
    assignments.forEach(a => {
      if (!a.class) return;
      if (!byClass[a.class.id]) {
        byClass[a.class.id] = {
          id: a.class.id,
          name: className(a.class),
          grade_level: a.class.grade_level,
          section: a.class.section,
          student_count: studentCounts[a.class.id] || 0,
          subjects: [],
        };
      }
      if (a.subject) byClass[a.class.id].subjects.push(a.subject);
    });

    res.json({ success: true, classes: Object.values(byClass) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/subjects', async (req, res) => {
  try {
    const where = { teacher_id: req.user.id };
    if (req.query.class_id) where.class_id = req.query.class_id;

    const rows = await Teachers_Classes.findAll({
      where,
      include: [
        { model: Class, as: 'class', attributes: ['id', 'grade_level', 'section'] },
        { model: Subject, as: 'subject', attributes: ['id', 'name'] },
      ],
      order: [['class_id', 'ASC'], ['subject_id', 'ASC']],
    });

    res.json({
      success: true,
      subjects: rows.map(r => ({
        class_id: r.class_id,
        class: r.class ? { ...r.class.dataValues, name: className(r.class) } : null,
        subject_id: r.subject_id,
        subject: r.subject,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/students', async (req, res) => {
  try {
    const classIds = await getTeacherClassIds(req.user.id);
    if (classIds.length === 0) return res.json({ success: true, students: [] });

    const students = await Student.findAll({
      where: { class_id: classIds },
      include: [
        { model: User, as: 'profile', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'parent', attributes: ['id', 'name', 'email'] },
        { model: Class, as: 'class', attributes: ['id', 'grade_level', 'section'] },
      ],
      order: [[{ model: Class, as: 'class' }, 'grade_level', 'ASC'], [{ model: User, as: 'profile' }, 'name', 'ASC']],
    });

    res.json({ success: true, students: students.map(formatStudent) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/classes/:id/students', async (req, res) => {
  try {
    const classId = Number(req.params.id);
    if (!await teacherOwnsClass(req.user.id, classId)) {
      return res.status(403).json({ success: false, message: 'This class is not assigned to you' });
    }

    const students = await Student.findAll({
      where: { class_id: classId },
      include: [
        { model: User, as: 'profile', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'parent', attributes: ['id', 'name', 'email'] },
        { model: Class, as: 'class', attributes: ['id', 'grade_level', 'section'] },
      ],
      order: [[{ model: User, as: 'profile' }, 'name', 'ASC']],
    });

    res.json({ success: true, students: students.map(formatStudent) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/attendance', async (req, res) => {
  try {
    const { class_id, date } = req.query;
    if (!class_id) return res.status(400).json({ success: false, message: 'class_id is required' });
    if (!await teacherOwnsClass(req.user.id, class_id)) {
      return res.status(403).json({ success: false, message: 'This class is not assigned to you' });
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    const students = await Student.findAll({ where: { class_id }, attributes: ['user_id'] });
    const studentIds = students.map(s => s.user_id);
    const attendance = studentIds.length
      ? await Attendance.findAll({ where: { date: targetDate, student_id: studentIds } })
      : [];

    res.json({ success: true, attendance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/attendance', async (req, res) => {
  try {
    const { student_id, class_id, date, status } = req.body;
    if (!student_id || !class_id || !date || !status) {
      return res.status(400).json({ success: false, message: 'student_id, class_id, date, and status are required' });
    }
    if (!['Present', 'Absent', 'Late'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be Present, Absent, or Late' });
    }
    if (!await teacherOwnsClass(req.user.id, class_id)) {
      return res.status(403).json({ success: false, message: 'This class is not assigned to you' });
    }
    const student = await Student.findOne({ where: { user_id: student_id, class_id } });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found in this class' });

    const existing = await Attendance.findOne({ where: { student_id, teacher_id: req.user.id, date } });
    if (existing) {
      await existing.update({ status });
    } else {
      await Attendance.create({ student_id, teacher_id: req.user.id, date, status });
    }
    res.json({ success: true, message: 'Attendance updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/attendance/bulk', async (req, res) => {
  try {
    const { class_id, date, records } = req.body;
    if (!class_id || !date || !Array.isArray(records)) {
      return res.status(400).json({ success: false, message: 'class_id, date, and records are required' });
    }
    if (!await teacherOwnsClass(req.user.id, class_id)) {
      return res.status(403).json({ success: false, message: 'This class is not assigned to you' });
    }

    const students = await Student.findAll({ where: { class_id }, attributes: ['user_id'] });
    const allowedStudentIds = new Set(students.map(s => Number(s.user_id)));
    let saved = 0;

    for (const record of records) {
      const studentId = Number(record.student_id);
      if (!allowedStudentIds.has(studentId)) continue;
      if (!['Present', 'Absent', 'Late'].includes(record.status)) continue;

      const existing = await Attendance.findOne({
        where: { student_id: studentId, teacher_id: req.user.id, date },
      });
      if (existing) {
        await existing.update({ status: record.status });
      } else {
        await Attendance.create({
          student_id: studentId,
          teacher_id: req.user.id,
          date,
          status: record.status,
        });
      }
      saved += 1;
    }

    res.json({ success: true, message: 'Attendance record saved', saved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/attendance/report', async (req, res) => {
  try {
    const { student_id, start_date, end_date } = req.query;
    if (!student_id) return res.status(400).json({ success: false, message: 'student_id is required' });
    const student = await getStudentInTeacherClass(req.user.id, student_id);
    if (!student) return res.status(403).json({ success: false, message: 'This student is not in your classes' });

    const where = { student_id };
    if (start_date && end_date) where.date = { [Op.between]: [start_date, end_date] };

    const records = await Attendance.findAll({ where });
    const total = records.length;
    const present = records.filter(r => r.status === 'Present').length;
    const late = records.filter(r => r.status === 'Late').length;
    const absent = records.filter(r => r.status === 'Absent').length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    res.json({ success: true, report: { present, late, absent, total, percentage } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/grades', async (req, res) => {
  try {
    const classIds = req.query.class_id ? [Number(req.query.class_id)] : await getTeacherClassIds(req.user.id);
    if (req.query.class_id && !await teacherOwnsClass(req.user.id, req.query.class_id)) {
      return res.status(403).json({ success: false, message: 'This class is not assigned to you' });
    }
    if (classIds.length === 0) return res.json({ success: true, grades: [] });

    const students = await Student.findAll({ where: { class_id: classIds }, attributes: ['user_id'] });
    const studentIds = students.map(s => s.user_id);
    const where = { teacher_id: req.user.id };
    if (studentIds.length) where.student_id = studentIds;
    if (req.query.type) where.type = req.query.type;

    const grades = studentIds.length
      ? await Grade.findAll({
          where,
          include: [
            { model: Student, as: 'student', include: [
              { model: User, as: 'profile', attributes: ['id', 'name', 'email'] },
              { model: Class, as: 'class', attributes: ['id', 'grade_level', 'section'] },
            ] },
            { model: Subject, as: 'subject', attributes: ['id', 'name'] },
          ],
          order: [['date', 'DESC'], ['id', 'DESC']],
        })
      : [];

    res.json({ success: true, grades });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/students/:id/grades', async (req, res) => {
  try {
    const student = await getStudentInTeacherClass(req.user.id, req.params.id);
    if (!student) {
      return res.status(403).json({ success: false, message: 'This student is not in your classes' });
    }

    const grades = await Grade.findAll({
      where: { student_id: req.params.id, teacher_id: req.user.id },
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name'] },
      ],
      order: [['date', 'DESC'], ['id', 'DESC']],
    });

    const summary = {
      total_items: grades.length,
      earned: 0,
      possible: 0,
      percentage: 0,
      by_type: {
        exam: { count: 0, earned: 0, possible: 0, percentage: 0 },
        quiz: { count: 0, earned: 0, possible: 0, percentage: 0 },
        homework: { count: 0, earned: 0, possible: 0, percentage: 0 },
      },
    };

    grades.forEach(g => {
      const earned = Number(g.grade_value) || 0;
      const possible = Number(g.max_grade) || 0;
      summary.earned += earned;
      summary.possible += possible;
      if (summary.by_type[g.type]) {
        summary.by_type[g.type].count += 1;
        summary.by_type[g.type].earned += earned;
        summary.by_type[g.type].possible += possible;
      }
    });

    summary.percentage = summary.possible ? Math.round((summary.earned / summary.possible) * 100) : 0;
    Object.values(summary.by_type).forEach(typeSummary => {
      typeSummary.percentage = typeSummary.possible ? Math.round((typeSummary.earned / typeSummary.possible) * 100) : 0;
    });

    res.json({
      success: true,
      student: formatStudent(student),
      grades,
      summary,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/grades', async (req, res) => {
  try {
    const { student_id, subject_id, grade_value, max_grade, type, date } = req.body;
    if (!student_id || !subject_id || grade_value == null || !max_grade || !type || !date) {
      return res.status(400).json({ success: false, message: 'student_id, subject_id, grade_value, max_grade, type, and date are required' });
    }
    if (!['exam', 'quiz', 'homework'].includes(type)) {
      return res.status(400).json({ success: false, message: 'type must be exam, quiz, or homework' });
    }

    const student = await getStudentInTeacherClass(req.user.id, student_id);
    if (!student) return res.status(403).json({ success: false, message: 'This student is not in your classes' });
    if (!await teacherOwnsSubjectInClass(req.user.id, student.class_id, subject_id)) {
      return res.status(403).json({ success: false, message: 'This subject is not assigned to you for this student class' });
    }

    const grade = await Grade.create({
      student_id,
      teacher_id: req.user.id,
      subject_id,
      grade_value,
      max_grade,
      type,
      date,
    });

    res.status(201).json({ success: true, grade });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/grades/:id', async (req, res) => {
  try {
    const grade = await Grade.findOne({ where: { id: req.params.id, teacher_id: req.user.id } });
    if (!grade) return res.status(404).json({ success: false, message: 'Grade not found' });

    const { grade_value, max_grade, type, date } = req.body;
    if (type && !['exam', 'quiz', 'homework'].includes(type)) {
      return res.status(400).json({ success: false, message: 'type must be exam, quiz, or homework' });
    }

    const updates = {};
    if (grade_value != null) updates.grade_value = grade_value;
    if (max_grade != null) updates.max_grade = max_grade;
    if (type) updates.type = type;
    if (date) updates.date = date;

    await grade.update(updates);
    res.json({ success: true, grade });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/grades/:id', async (req, res) => {
  try {
    const grade = await Grade.findOne({ where: { id: req.params.id, teacher_id: req.user.id } });
    if (!grade) return res.status(404).json({ success: false, message: 'Grade not found' });
    await grade.destroy();
    res.json({ success: true, message: 'Grade deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/announcement-recipients', async (req, res) => {
  try {
    const classIds = await getTeacherClassIds(req.user.id);
    if (classIds.length === 0) return res.json({ success: true, users: [] });

    const students = await Student.findAll({
      where: { class_id: classIds },
      include: [
        { model: User, as: 'profile', attributes: ['id', 'name', 'email', 'role'] },
        { model: User, as: 'parent', attributes: ['id', 'name', 'email', 'role'] },
        { model: Class, as: 'class', attributes: ['id', 'grade_level', 'section'] },
      ],
    });

    const users = [];
    const seen = new Set();
    students.forEach(s => {
      [
        { user: s.profile, relation: 'student', class: s.class },
        { user: s.parent, relation: 'parent', class: s.class, student: s.profile },
      ].forEach(item => {
        if (!item.user || seen.has(item.user.id)) return;
        seen.add(item.user.id);
        users.push({
          id: item.user.id,
          name: item.user.name,
          email: item.user.email,
          role: item.user.role || item.relation,
          relation: item.relation,
          class: item.class ? { ...item.class.dataValues, name: className(item.class) } : null,
          student_name: item.student?.name || null,
        });
      });
    });

    res.json({ success: true, users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/announcements', async (req, res) => {
  try {
    const announcements = await Announcement.findAll({
      where: { sender_id: req.user.id },
      include: [{ model: Announcement_Receiver, as: 'receivers', include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'] }] }],
      order: [['date', 'DESC'], ['id', 'DESC']],
    });
    res.json({ success: true, announcements });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/announcements', async (req, res) => {
  try {
    const { title, content, date, target = 'class', class_id, audience = 'both', user_ids = [] } = req.body;
    if (!title || !content || !date) {
      return res.status(400).json({ success: false, message: 'title, content, and date are required' });
    }
    if (!['class', 'specific'].includes(target)) {
      return res.status(400).json({ success: false, message: 'target must be class or specific' });
    }
    if (!['students', 'parents', 'both'].includes(audience)) {
      return res.status(400).json({ success: false, message: 'audience must be students, parents, or both' });
    }

    const classIds = await getTeacherClassIds(req.user.id);
    if (classIds.length === 0) return res.status(400).json({ success: false, message: 'You do not have assigned classes' });

    let recipientIds = [];
    if (target === 'class') {
      if (!class_id) return res.status(400).json({ success: false, message: 'class_id is required' });
      if (!classIds.includes(Number(class_id))) {
        return res.status(403).json({ success: false, message: 'This class is not assigned to you' });
      }
      const students = await Student.findAll({ where: { class_id }, attributes: ['user_id', 'parent_id'] });
      if (audience === 'students' || audience === 'both') recipientIds.push(...students.map(s => s.user_id));
      if (audience === 'parents' || audience === 'both') recipientIds.push(...students.map(s => s.parent_id).filter(Boolean));
    } else {
      if (!Array.isArray(user_ids) || user_ids.length === 0) {
        return res.status(400).json({ success: false, message: 'user_ids are required' });
      }
      const students = await Student.findAll({ where: { class_id: classIds }, attributes: ['user_id', 'parent_id'] });
      const allowed = new Set();
      students.forEach(s => {
        allowed.add(Number(s.user_id));
        if (s.parent_id) allowed.add(Number(s.parent_id));
      });
      recipientIds = user_ids.map(Number).filter(id => allowed.has(id));
      if (recipientIds.length === 0) {
        return res.status(400).json({ success: false, message: 'No valid recipients selected' });
      }
    }

    recipientIds = [...new Set(recipientIds)];
    if (recipientIds.length === 0) return res.status(400).json({ success: false, message: 'No recipients found' });

    const announcement = await Announcement.create({ sender_id: req.user.id, title, content, date });
    await Announcement_Receiver.bulkCreate(recipientIds.map(user_id => ({ announcement_id: announcement.id, user_id })));

    res.status(201).json({ success: true, announcement, recipients: recipientIds.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/announcements/:id', async (req, res) => {
  try {
    const announcement = await Announcement.findOne({ where: { id: req.params.id, sender_id: req.user.id } });
    if (!announcement) return res.status(404).json({ success: false, message: 'Announcement not found' });

    const { title, content, date } = req.body;
    const updates = {};
    if (title) updates.title = title;
    if (content) updates.content = content;
    if (date) updates.date = date;

    await announcement.update(updates);
    res.json({ success: true, announcement });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/announcements/:id', async (req, res) => {
  try {
    const announcement = await Announcement.findOne({ where: { id: req.params.id, sender_id: req.user.id } });
    if (!announcement) return res.status(404).json({ success: false, message: 'Announcement not found' });
    await Announcement_Receiver.destroy({ where: { announcement_id: announcement.id } });
    await announcement.destroy();
    res.json({ success: true, message: 'Announcement deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/assignments', async (_req, res) => {
  res.json({ success: true, assignments: [] });
});

router.post('/assignments', async (_req, res) => {
  res.status(501).json({ success: false, message: 'Assignments feature not yet implemented' });
});

module.exports = router;
