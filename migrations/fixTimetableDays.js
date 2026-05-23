/**
 * Run once to update the Timetables table ENUM from Mon-Fri to Sun-Thu.
 *   node migrations/fixTimetableDays.js
 */
const sequelize = require('../config/db');

(async () => {
  const t = await sequelize.transaction();
  try {
    // 1. Drop the table (no real data yet — it was just created)
    await sequelize.query('DROP TABLE IF EXISTS "Timetables" CASCADE;', { transaction: t });

    // 2. Drop the old ENUM type if it exists
    await sequelize.query('DROP TYPE IF EXISTS "enum_Timetables_day";', { transaction: t });

    // 3. Recreate the ENUM with the correct values
    await sequelize.query(`
      CREATE TYPE "enum_Timetables_day"
        AS ENUM ('Sunday','Monday','Tuesday','Wednesday','Thursday');
    `, { transaction: t });

    // 4. Recreate the Timetables table
    await sequelize.query(`
      CREATE TABLE "Timetables" (
        id          SERIAL PRIMARY KEY,
        class_id    INTEGER NOT NULL REFERENCES "Classes"(id) ON DELETE CASCADE,
        subject_id  INTEGER NOT NULL REFERENCES "Subjects"(id) ON DELETE CASCADE,
        teacher_id  INTEGER NOT NULL REFERENCES "Users"(id)   ON DELETE CASCADE,
        day         "enum_Timetables_day" NOT NULL,
        start_time  VARCHAR(5) NOT NULL,
        end_time    VARCHAR(5) NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT timetable_class_day_time_unique UNIQUE (class_id, day, start_time)
      );
    `, { transaction: t });

    await t.commit();
    console.log('✅ Timetables table recreated with Sun–Thu days.');
  } catch (err) {
    await t.rollback();
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
})();
