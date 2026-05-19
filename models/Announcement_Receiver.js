const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Announcement_Receiver = sequelize.define('Announcement_Receiver', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  announcement_id: { type: DataTypes.INTEGER, references: { model: 'Announcements', key: 'id' } },
  user_id: { type: DataTypes.INTEGER, references: { model: 'Users', key: 'id' } },
}, { timestamps: true });

module.exports = Announcement_Receiver;