const bcrypt = require('bcrypt');
const sequelize = require('../config/db');
const { User } = require('../models');

async function main() {
  await sequelize.authenticate();

  const users = await User.findAll();
  let updated = 0;

  for (const user of users) {
    // bcrypt hashes always start with $2b$ or $2a$ — skip already-hashed passwords
    if (user.password.startsWith('$2b$') || user.password.startsWith('$2a$')) {
      continue;
    }
    user.password = await bcrypt.hash(user.password, 10);
    await user.save();
    updated++;
  }

  console.log(`Done. Hashed ${updated} plain-text password(s). Skipped ${users.length - updated} already-hashed.`);
  await sequelize.close();
}

main().catch(async (err) => {
  console.error(err);
  await sequelize.close();
  process.exit(1);
});
