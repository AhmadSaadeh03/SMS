const sequelize = require('../config/db');

(async () => {
  await sequelize.authenticate();

  await sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_Users_manager_scope') THEN
        CREATE TYPE "enum_Users_manager_scope" AS ENUM ('grades_1_7', 'grades_8_12');
      END IF;
    END
    $$;
  `);

  await sequelize.query(`
    ALTER TABLE "Users"
    ADD COLUMN IF NOT EXISTS "manager_scope" "enum_Users_manager_scope";
  `);

  await sequelize.query(`
    UPDATE "Users"
    SET "manager_scope" = 'grades_1_7'
    WHERE "role" = 'manager' AND "manager_scope" IS NULL;
  `);

  console.log('Manager scope column is ready');
  await sequelize.close();
})().catch(async (err) => {
  console.error(err);
  await sequelize.close();
  process.exit(1);
});
