const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');
const Class = require('./Class');

const Student = sequelize.define('Student', {
  user_id: { type: DataTypes.INTEGER, primaryKey: true, references: { model: 'Users', key: 'id' } },
  class_id: { type: DataTypes.INTEGER, references: { model: 'Classes', key: 'id' } },
  parent_id: { type: DataTypes.INTEGER, references: { model: 'Users', key: 'id' } },
}, { timestamps: true });

module.exports = Student;