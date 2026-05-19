const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Teachers_Classes = sequelize.define('Teachers_Classes', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  teacher_id: { type: DataTypes.INTEGER, references: { model: 'Users', key: 'id' } },
  class_id: { type: DataTypes.INTEGER, references: { model: 'Classes', key: 'id' } },
  subject_id: { type: DataTypes.INTEGER, references: { model: 'Subjects', key: 'id' } },
}, {
  timestamps: true,
  // Only enforce uniqueness on (class_id, subject_id) — a class can't have the same subject twice,
  // but the same teacher CAN be assigned to multiple subjects in the same class.
  indexes: [
    { unique: true, fields: ['class_id', 'subject_id'] },
  ],
});

module.exports = Teachers_Classes;