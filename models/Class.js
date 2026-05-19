const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');

const Class = sequelize.define('Class', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  grade_level: { type: DataTypes.INTEGER, allowNull: false },
  section: { type: DataTypes.STRING(1), allowNull: false },
  manager_id: { type: DataTypes.INTEGER, references: { model: 'Users', key: 'id' } },
}, { timestamps: true });

module.exports = Class;