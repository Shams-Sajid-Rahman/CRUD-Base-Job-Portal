const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { isGuest, isAuthenticated } = require('../middleware/auth');
const { uploadNID } = require('../config/upload');

// GET /auth/register
router.get('/register', isGuest, (req, res) => {
  res.render('auth/register', { title: 'Create Account' });
});

// POST /auth/register
router.post('/register', isGuest, (req, res, next) => {
  uploadNID.single('nid_image')(req, res, (err) => {
    if (err) {
      req.flash('error', err.message || 'File upload failed.');
      return res.redirect('/auth/register');
    }
    next();
  });
}, async (req, res) => {
  const { name, email, password, confirm_password, role, company_name, nid_number } = req.body;

  if (!name || !email || !password || !role) {
    req.flash('error', 'All fields are required.');
    return res.redirect('/auth/register');
  }

  if (!nid_number || !/^\d{10}(\d{7})?$/.test(nid_number.trim())) {
    req.flash('error', 'A valid 10 or 17-digit NID number is required.');
    return res.redirect('/auth/register');
  }

  if (!req.file) {
    req.flash('error', 'NID photo or scan is required.');
    return res.redirect('/auth/register');
  }

  if (password !== confirm_password) {
    req.flash('error', 'Passwords do not match.');
    return res.redirect('/auth/register');
  }

  if (password.length < 6) {
    req.flash('error', 'Password must be at least 6 characters.');
    return res.redirect('/auth/register');
  }

  if (!['seeker', 'employer'].includes(role)) {
    req.flash('error', 'Invalid role selected.');
    return res.redirect('/auth/register');
  }

  try {
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      req.flash('error', 'Email is already registered.');
      return res.redirect('/auth/register');
    }

    const [nidExists] = await db.query('SELECT id FROM users WHERE nid_number = ?', [nid_number.trim()]);
    if (nidExists.length > 0) {
      req.flash('error', 'This NID number is already registered.');
      return res.redirect('/auth/register');
    }

    const nidImagePath = '/uploads/nid/' + req.file.filename;
    const hash = await bcrypt.hash(password, 12);
    const [result] = await db.query(
      'INSERT INTO users (name, email, password, role, nid_number, nid_image, company_name) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name.trim(), email.trim().toLowerCase(), hash, role, nid_number.trim(), nidImagePath, company_name || null]
    );

    req.session.user = { id: result.insertId, name: name.trim(), email, role };
    req.flash('success', `Welcome, ${name}! Your account has been created.`);

    if (role === 'employer') return res.redirect('/employer/dashboard');
    res.redirect('/seeker/dashboard');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Registration failed. Please try again.');
    res.redirect('/auth/register');
  }
});

// GET /auth/login
router.get('/login', isGuest, (req, res) => {
  res.render('auth/login', { title: 'Sign In' });
});

// POST /auth/login
router.post('/login', isGuest, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    req.flash('error', 'Email and password are required.');
    return res.redirect('/auth/login');
  }

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (rows.length === 0) {
      req.flash('error', 'Invalid credentials.');
      return res.redirect('/auth/login');
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      req.flash('error', 'Invalid credentials.');
      return res.redirect('/auth/login');
    }

    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    req.flash('success', `Welcome back, ${user.name}!`);

    if (user.role === 'admin') return res.redirect('/admin/dashboard');
    if (user.role === 'employer') return res.redirect('/employer/dashboard');
    res.redirect('/seeker/dashboard');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Login failed. Please try again.');
    res.redirect('/auth/login');
  }
});

// GET /auth/logout
router.get('/logout', isAuthenticated, (req, res) => {
  req.session.destroy(() => {
    res.redirect('/auth/login');
  });
});

module.exports = router;
