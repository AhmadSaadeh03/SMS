const User = require('./User');
const Student = require('./Student');
const Class = require('./Class');
const Subject = require('./Subject');
const Teachers_Classes = require('./Teachers_Classes');
const Grade = require('./Grade');
const Attendance = require('./Attendance');
const Announcement = require('./Announcement');
const Announcement_Receiver = require('./Announcement_Receiver');
const Timetable = require('./Timetable');

// Associations

// Student → User (student info)
Student.belongsTo(User, { foreignKey: 'user_id', as: 'profile' });  // alias is 'profile'
User.hasOne(Student, { foreignKey: 'user_id', as: 'studentProfile' });

// Student → Parent
Student.belongsTo(User, { foreignKey: 'parent_id', as: 'parent' }); 
User.hasMany(Student, { foreignKey: 'parent_id', as: 'children' });

// Student → Class
Student.belongsTo(Class, { foreignKey: 'class_id', as: 'class' });
Class.hasMany(Student, { foreignKey: 'class_id', as: 'students' });

// Teacher → Class → Subject
User.belongsToMany(Class, { through: Teachers_Classes, foreignKey: 'teacher_id' });
Class.belongsToMany(User, { through: Teachers_Classes, foreignKey: 'class_id' });
Teachers_Classes.belongsTo(Class,   { foreignKey: 'class_id',   as: 'class'   });
Class.hasMany(Teachers_Classes,      { foreignKey: 'class_id' });
Teachers_Classes.belongsTo(Subject,  { foreignKey: 'subject_id', as: 'subject' });
Subject.hasMany(Teachers_Classes,    { foreignKey: 'subject_id' });
Teachers_Classes.belongsTo(User,     { foreignKey: 'teacher_id', as: 'teacher' });
User.hasMany(Teachers_Classes,       { foreignKey: 'teacher_id' });

// Grades
Grade.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });
Grade.belongsTo(User, { foreignKey: 'teacher_id', as: 'teacher' });
Grade.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });

Attendance.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });
Attendance.belongsTo(User, { foreignKey: 'teacher_id', as: 'teacher' });

Announcement.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });
Announcement.hasMany(Announcement_Receiver, { foreignKey: 'announcement_id', as: 'receivers' });
Announcement_Receiver.belongsTo(Announcement, { foreignKey: 'announcement_id', as: 'announcement' });
Announcement_Receiver.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Timetable
Timetable.belongsTo(Class,   { foreignKey: 'class_id',   as: 'class'   });
Timetable.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });
Timetable.belongsTo(User,    { foreignKey: 'teacher_id', as: 'teacher' });
Class.hasMany(Timetable,     { foreignKey: 'class_id' });

module.exports = {
  User, Student, Class, Subject,
  Teachers_Classes, Grade, Attendance,
  Announcement, Announcement_Receiver, Timetable
};