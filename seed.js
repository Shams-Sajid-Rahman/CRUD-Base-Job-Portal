/**
 * Seed script — creates a default admin user.
 * Usage: node seed.js
 * Default credentials: admin@jobportal.com / Admin@1234
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./config/db');

async function seed() {
  const email = 'admin@jobportal.com';
  const password = 'Admin@1234';
  const name = 'Super Admin';

  try {
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      console.log('Admin user already exists:', email);
      process.exit(0);
    }

    const hash = await bcrypt.hash(password, 12);
    await db.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hash, 'admin']
    );

    console.log('Admin user created successfully!');
    console.log('  Email   :', email);
    console.log('  Password:', password);
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
