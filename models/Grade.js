const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Grade = sequelize.define('Grade', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  student_id: { type: DataTypes.INTEGER, references: { model: 'Students', key: 'user_id' } },
  teacher_id: { type: DataTypes.INTEGER, references: { model: 'Users', key: 'id' } },
  subject_id: { type: DataTypes.INTEGER, references: { model: 'Subjects', key: 'id' } },
  grade_value: { type: DataTypes.FLOAT, allowNull: false },
  max_grade: { type: DataTypes.FLOAT, allowNull: false },
  type: { type: DataTypes.ENUM('exam','quiz','homework'), allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
}, { timestamps: true });

module.exports = Grade;