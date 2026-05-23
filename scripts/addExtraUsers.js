const bcrypt = require('bcrypt');
const sequelize = require('../config/db');
const { User, Student, Class } = require('../models');

const PASSWORD = '123456';

async function ensureUser(data) {
  const [user] = await User.findOrCreate({
    where: { email: data.email },
    defaults: data,
  });
  return user;
}

async function main() {
  await sequelize.authenticate();
  const hashedPassword = await bcrypt.hash(PASSWORD, 10);

  const classes = await Class.findAll({ order: [['grade_level', 'ASC'], ['section', 'ASC']] });
  if (!classes.length) {
    throw new Error('No classes found. Run the main seed first so students can be assigned to classes.');
  }

  for (let i = 1; i <= 10; i++) {
    await ensureUser({
      name: `Extra Admin ${i}`,
      email: `admin${i}@school.com`,
      password: hashedPassword,
      role: 'admin',
    });

    await ensureUser({
      name: `Extra Manager ${i}`,
      email: `manager${i}@school.com`,
      password: hashedPassword,
      role: 'manager',
      manager_scope: i <= 10 ? 'grades_1_7' : 'grades_8_12',
    });

    await ensureUser({
      name: `Extra Teacher ${i}`,
      email: `teacher${i}@school.com`,
      password: hashedPassword,
      role: 'teacher',
    });

    const parent = await ensureUser({
      name: `Extra Parent ${i}`,
      email: `parent${i}@school.com`,
      password: hashedPassword,
      role: 'parent',
    });

    const student = await ensureUser({
      name: `Extra Student ${i}`,
      email: `student${i}@school.com`,
      password: hashedPassword,
      role: 'student',
    });

    const targetClass = classes[(i - 1) % classes.length];
    await Student.findOrCreate({
      where: { user_id: student.id },
      defaults: {
        user_id: student.id,
        class_id: targetClass.id,
        parent_id: parent.id,
      },
    });
  }

  await sequelize.query(
    `SELECT setval(pg_get_serial_sequence('"Users"', 'id'), COALESCE((SELECT MAX("id") FROM "Users"), 1))`
  );

  console.log('Added extra users: 20 admins, 20 managers, 20 teachers, 20 parents, 20 students.');
  console.log(`Default password for all extra users: ${PASSWORD}`);
  await sequelize.close();
}

main().catch(async (err) => {
  console.error(err);
  await sequelize.close();
  process.exit(1);
});
