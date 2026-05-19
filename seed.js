const bcrypt = require('bcrypt');
const sequelize = require('./config/db');
const { User, Student, Class, Subject } = require('./models');
const DEFAULT_SUBJECTS = require('./config/defaultSubjects');

const seedData = async () => {
  try {
    // Sync all models (drops & recreates tables)
    await sequelize.sync({ force: true });
    console.log('Database synced!');

    // USERS
    const [
      hAdmin, hManager, hAhmed, hSara, hJohn, hAli, hLina, hOmar, hNora
    ] = await Promise.all([
      bcrypt.hash('admin123',   10),
      bcrypt.hash('manager123', 10),
      bcrypt.hash('ahmed123',   10),
      bcrypt.hash('sara123',    10),
      bcrypt.hash('john123',    10),
      bcrypt.hash('ali123',     10),
      bcrypt.hash('lina123',    10),
      bcrypt.hash('omar123',    10),
      bcrypt.hash('nora123',    10),
    ]);

    await User.bulkCreate([
      { id: 1, name: "Admin One",      email: "admin@school.com",   password: hAdmin,   role: "admin"   },
      { id: 2, name: "Manager Mike",   email: "manager@school.com", password: hManager, role: "manager", manager_scope: "grades_1_7" },
      { id: 3, name: "Teacher Ahmed",  email: "ahmed@school.com",   password: hAhmed,   role: "teacher" },
      { id: 4, name: "Teacher Sara",   email: "sara@school.com",    password: hSara,    role: "teacher" },
      { id: 5, name: "Parent John",    email: "john@school.com",    password: hJohn,    role: "parent"  },
      { id: 6, name: "Student Ali",    email: "ali@school.com",     password: hAli,     role: "student" },
      { id: 7, name: "Student Lina",   email: "lina@school.com",    password: hLina,    role: "student" },
      { id: 8, name: "Student Omar",   email: "omar@school.com",    password: hOmar,    role: "student" },
      { id: 9, name: "Student Nora",   email: "nora@school.com",    password: hNora,    role: "student" },
    ]);
    await sequelize.query(`SELECT setval(pg_get_serial_sequence('"Users"', 'id'), (SELECT MAX(id) FROM "Users"))`);

    // CLASSES — grades 1-12, sections A-C (36 classes total)
    const sections = ["A", "B", "C"];
    const classRows = [];
    let classId = 1;
    for (let grade = 1; grade <= 12; grade++) {
      for (const section of sections) {
        classRows.push({ id: classId++, grade_level: grade, section, manager_id: null });
      }
    }
    await Class.bulkCreate(classRows);
    await sequelize.query(`SELECT setval(pg_get_serial_sequence('"Classes"', 'id'), (SELECT MAX(id) FROM "Classes"))`);

    // SUBJECTS
    await Subject.bulkCreate(DEFAULT_SUBJECTS.map((name, index) => ({ id: index + 1, name })));
    await sequelize.query(`SELECT setval(pg_get_serial_sequence('"Subjects"', 'id'), (SELECT MAX(id) FROM "Subjects"))`);

    // STUDENTS — spread across different grade levels, no parent assigned yet
    // With 3 sections per grade: grade N section A = id (N-1)*3 + 1
    await Student.bulkCreate([
      { user_id: 6, class_id: 1,  parent_id: null }, // Grade 1-A
      { user_id: 7, class_id: 7,  parent_id: null }, // Grade 3-A
      { user_id: 8, class_id: 16, parent_id: null }, // Grade 6-A
      { user_id: 9, class_id: 25, parent_id: null }, // Grade 9-A
    ]);

    // No Teachers_Classes, Grades, Attendance, or Announcements — start fresh

    console.log('Seed complete!');
    console.log('');
    console.log('Accounts:');
    console.log('  admin@school.com   / admin123');
    console.log('  manager@school.com / manager123');
    console.log('  ahmed@school.com   / ahmed123  (teacher, no classes assigned)');
    console.log('  sara@school.com    / sara123   (teacher, no classes assigned)');
    process.exit();
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
};

seedData();
