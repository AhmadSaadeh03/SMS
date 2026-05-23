require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/db');
const ensureSubjects = require('./scripts/ensureSubjects');


// Initialize Express app
const app = express();

// Middleware FIRST (before routes)
app.use(cors()); // Allows frontend (React) to talk to backend
app.use(express.json());//Allows frontend (React) to talk to backend 
// for example if json send {"email" :"ahmed@school.com"} , the back end recieve req.body.email
app.use(express.urlencoded({ extended: true }));





// Routes
const authRoute = require("./routes/auth");
const studentsRoute = require("./routes/students");
const adminRoute = require("./routes/admin");
const teacherRoute  = require("./routes/teacher");
const managerRoute  = require("./routes/manager");
const parentRoute    = require("./routes/parent");
const studentRoute   = require("./routes/student");
const timetableRoute = require("./routes/timetable");
app.use("/login", authRoute); // POST to http://localhost:5000/login
app.use("/api/login", authRoute); // POST to http://localhost:5000/api/login (for compatibility)
app.use("/students", studentsRoute); // GET to http://localhost:5000/students
app.use("/admin", adminRoute);
app.use("/teacher", teacherRoute);
app.use("/teachers", teacherRoute);
app.use("/manager", managerRoute);
app.use("/parent", parentRoute);
app.use("/student", studentRoute);
app.use("/timetable", timetableRoute);


// Basic health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'Server is running' });
});

// Connect to database and start server
const PORT = process.env.PORT || 5000;

sequelize.authenticate()
  .then(async () => {
    console.log('Database connected successfully!');
    await ensureSubjects();
    console.log('Default subjects are ready');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });
