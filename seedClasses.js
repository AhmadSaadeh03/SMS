// seedClasses.js
const sequelize = require('./config/db');
const Class = require('./models/Class'); // import only Class for now

const seedClasses = async () => {
  try {
    // Make sure database is connected
    await sequelize.authenticate();
    console.log("Database connected successfully!");

    // Sections per grade
    const sections = ["A", "B", "C"];
    const classesToCreate = [];

    // Create grades 1–12
    for (let grade = 1; grade <= 12; grade++) {
      sections.forEach((section) => {
        classesToCreate.push({
          grade_level: grade,
          section: section,
          manager_id: 2, // example: default manager, can change later
        });
      });
    }

    // Sync the auto-increment sequence with the current max id to avoid conflicts
    await sequelize.query(`SELECT setval('"Classes_id_seq"', COALESCE((SELECT MAX(id) FROM "Classes"), 0) + 1, false);`);

    // Insert missing classes — skip ones that already exist
    let created = 0;
    for (const cls of classesToCreate) {
      const [, wasCreated] = await Class.findOrCreate({
        where: { grade_level: cls.grade_level, section: cls.section },
        defaults: cls,
      });
      if (wasCreated) created++;
    }
    console.log(`Done! ${created} new classes created, ${classesToCreate.length - created} already existed.`);
    process.exit();
  } catch (err) {
    console.error("Seeding classes failed:", err);
    process.exit(1);
  }
};

seedClasses();