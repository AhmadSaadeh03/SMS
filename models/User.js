const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('admin','manager','teacher','student','parent'), allowNull: false },
  manager_scope: { type: DataTypes.ENUM('grades_1_7','grades_8_12'), allowNull: true },
}, { timestamps: true });

module.exports = User;
