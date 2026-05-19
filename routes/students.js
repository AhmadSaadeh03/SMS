const express = require('express');
const router = express.Router();

const { Student } = require('../models');

router.get('/', async (req, res) => {
  const students = await Student.findAll();
  res.json(students);
});

router.get

module.exports = router;
