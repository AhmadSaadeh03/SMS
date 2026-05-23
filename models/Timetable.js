const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Timetable = sequelize.define('Timetable', {
  id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  class_id:   { type: DataTypes.INTEGER, allowNull: false },
  subject_id: { type: DataTypes.INTEGER, allowNull: false },
  teacher_id: { type: DataTypes.INTEGER, allowNull: false },
  day: {
    type: DataTypes.ENUM('Sunday','Monday','Tuesday','Wednesday','Thursday'),
    allowNull: false,
  },
  start_time: { type: DataTypes.STRING(5), allowNull: false }, // "08:00"
  end_time:   { type: DataTypes.STRING(5), allowNull: false }, // "09:00"
}, {
  timestamps: true,
  indexes: [
    { unique: true, fields: ['class_id', 'day', 'start_time'], name: 'timetable_class_day_time_unique' },
  ],
});

module.exports = Timetable;
