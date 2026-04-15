const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../../config/db');
const { uploadNID } = require('../../config/upload');

// GET /api/me
router.get('/me', (req, res) => {
  if (!req.session?.user) return res.json({ user: null });
  res.json({ user: req.session.user });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials.' });
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials.' });
    const { role: expectedRole } = req.body;
    if (expectedRole && user.role !== expectedRole) {
      const labels = { seeker: 'Job Seeker', employer: 'Employer', admin: 'Admin' };
      return res.status(403).json({ error: `This account is not registered as ${labels[expectedRole] || expectedRole}. Please select the correct role tab.` });
    }
    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    res.json({ success: true, user: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

// POST /api/auth/register
router.post('/register', (req, res, next) => {
  uploadNID.single('nid_image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'File upload failed.' });
    next();
  });
}, async (req, res) => {
  const { name, email, password, confirm_password, role, phone_number, bio, company_name, company_website, nid_number } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ error: 'All fields are required.' });
  if (!nid_number || !/^\d{10}(\d{7})?$/.test(nid_number.trim())) return res.status(400).json({ error: 'A valid 10 or 17-digit NID number is required.' });
  if (!req.file) return res.status(400).json({ error: 'NID photo or scan is required.' });
  if (password !== confirm_password) return res.status(400).json({ error: 'Passwords do not match.' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  if (!['seeker', 'employer'].includes(role)) return res.status(400).json({ error: 'Invalid role selected.' });
  try {
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(409).json({ error: 'Email is already registered.' });
    const [nidExists] = await db.query('SELECT id FROM users WHERE nid_number = ?', [nid_number.trim()]);
    if (nidExists.length > 0) return res.status(409).json({ error: 'This NID number is already registered.' });
    const nidImagePath = '/uploads/nid/' + req.file.filename;
    const hash = await bcrypt.hash(password, 12);
    const [result] = await db.query(
      'INSERT INTO users (name, email, password, role, phone, bio, nid_number, nid_image, company_name, company_website) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name.trim(), email.trim().toLowerCase(), hash, role, phone_number || null, bio || null, nid_number.trim(), nidImagePath, company_name || null, company_website || null]
    );
    req.session.user = { id: result.insertId, name: name.trim(), email, role };
    res.json({ success: true, user: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

module.exports = router;
