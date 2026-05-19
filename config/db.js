const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('school_management', 'postgres', '1234', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false,
});

module.exports = sequelize;