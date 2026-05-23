const bcrypt = require('bcrypt');
const sequelize = require('./config/db');
const { User, Class, Subject } = require('./models');
const DEFAULT_SUBJECTS = require('./config/defaultSubjects');

const seedData = async () => {
  try {
    await sequelize.sync({ force: true });
    console.log('Database wiped and recreated.');

    // Admin user
    const hAdmin = await bcrypt.hash('admin123', 10);
    await User.bulkCreate([
      { id: 1, name: "Admin", email: "admin@school.com", password: hAdmin, role: "admin" },
    ]);
    await sequelize.query(`SELECT setval(pg_get_serial_sequence('"Users"', 'id'), (SELECT MAX(id) FROM "Users"))`);

    // Classes — grades 1-12, sections A-C (36 total)
    const classRows = [];
    let classId = 1;
    for (let grade = 1; grade <= 12; grade++) {
      for (const section of ["A", "B", "C"]) {
        classRows.push({ id: classId++, grade_level: grade, section, manager_id: null });
      }
    }
    await Class.bulkCreate(classRows);
    await sequelize.query(`SELECT setval(pg_get_serial_sequence('"Classes"', 'id'), (SELECT MAX(id) FROM "Classes"))`);

    // Subjects
    await Subject.bulkCreate(DEFAULT_SUBJECTS.map((name, i) => ({ id: i + 1, name })));
    await sequelize.query(`SELECT setval(pg_get_serial_sequence('"Subjects"', 'id'), (SELECT MAX(id) FROM "Subjects"))`);

    console.log('Done.');
    console.log('  admin@school.com / admin123');
    process.exit();
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
};

seedData();
