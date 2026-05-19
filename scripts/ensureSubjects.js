const sequelize = require('../config/db');
const { Subject } = require('../models');
const DEFAULT_SUBJECTS = require('../config/defaultSubjects');

async function ensureSubjects() {
  for (const name of DEFAULT_SUBJECTS) {
    await Subject.findOrCreate({ where: { name }, defaults: { name } });
  }

  await sequelize.query(
    `SELECT setval(pg_get_serial_sequence('"Subjects"', 'id'), COALESCE((SELECT MAX("id") FROM "Subjects"), 1))`
  );
}

if (require.main === module) {
  (async () => {
    await sequelize.authenticate();
    await ensureSubjects();
    console.log('Default subjects are ready');
    await sequelize.close();
  })().catch(async (err) => {
    console.error(err);
    await sequelize.close();
    process.exit(1);
  });
}

module.exports = ensureSubjects;
