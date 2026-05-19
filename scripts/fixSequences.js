const sequelize = require('../config/db');

async function fixSequence(table, column = 'id') {
  await sequelize.query(
    `SELECT setval(pg_get_serial_sequence('"${table}"', '${column}'), COALESCE((SELECT MAX("${column}") FROM "${table}"), 1))`
  );
}

(async () => {
  await sequelize.authenticate();
  await fixSequence('Users');
  await fixSequence('Classes');
  await fixSequence('Subjects');
  console.log('Sequences fixed');
  await sequelize.close();
})().catch(async (err) => {
  console.error(err);
  await sequelize.close();
  process.exit(1);
});
