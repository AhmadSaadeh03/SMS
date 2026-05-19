const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Attendance = sequelize.define('Attendance', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  student_id: { type: DataTypes.INTEGER, references: { model: 'Students', key: 'user_id' } },
  teacher_id: { type: DataTypes.INTEGER, references: { model: 'Users', key: 'id' } },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  status: { type: DataTypes.ENUM('Present','Absent','Late','Excused'), allowNull: false },
}, { timestamps: true });

module.exports = Attendance;