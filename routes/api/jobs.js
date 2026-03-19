const express = require('express');
const router = express.Router();
const db = require('../../config/db');

// GET /api/jobs
router.get('/', async (req, res) => {
  try {
    const { q, location, type, category, salary_min, salary_max, page = 1 } = req.query;
    const limit = 9;
    const offset = (parseInt(page) - 1) * limit;
    let where = ['j.status = "active"'];
    const params = [];
    if (q) { where.push('(j.title LIKE ? OR j.company LIKE ? OR j.description LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    if (location) { where.push('j.location LIKE ?'); params.push(`%${location}%`); }
    if (type) { where.push('j.type = ?'); params.push(type); }
    if (category) { where.push('j.category = ?'); params.push(category); }
    if (salary_min) { where.push('j.salary_max >= ?'); params.push(parseInt(salary_min)); }
    if (salary_max) { where.push('j.salary_min <= ?'); params.push(parseInt(salary_max)); }
    if (req.query.experience) { where.push('j.experience_level = ?'); params.push(req.query.experience); }
    const whereClause = 'WHERE ' + where.join(' AND ');
    const [jobs] = await db.query(
      `SELECT j.*, u.name AS employer_name FROM jobs j JOIN users u ON j.employer_id = u.id ${whereClause} ORDER BY j.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM jobs j ${whereClause}`, params);
    const [[stats]] = await db.query(`SELECT (SELECT COUNT(*) FROM jobs WHERE status='active') AS active_jobs, (SELECT COUNT(*) FROM users WHERE role='employer') AS employers, (SELECT COUNT(*) FROM users WHERE role='seeker') AS seekers`);
    res.json({ jobs, total, page: parseInt(page), pages: Math.ceil(total / limit), stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load jobs.' });
  }
});

// GET /api/jobs/meta — distinct categories and locations for filter dropdowns
router.get('/meta', async (req, res) => {
  try {
    const [categories] = await db.query(`SELECT DISTINCT category FROM jobs WHERE status='active' AND category IS NOT NULL ORDER BY category`);
    const [locations] = await db.query(`SELECT DISTINCT location FROM jobs WHERE status='active' ORDER BY location`);
    res.json({ categories: categories.map(r => r.category), locations: locations.map(r => r.location) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load meta.' });
  }
});

// GET /api/jobs/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT j.*, u.name AS employer_name, u.company_name, u.company_website, u.bio AS employer_bio FROM jobs j JOIN users u ON j.employer_id = u.id WHERE j.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Job not found.' });
    const job = rows[0];
    let alreadyApplied = false;
    if (req.session?.user?.role === 'seeker') {
      const [apps] = await db.query('SELECT id FROM applications WHERE job_id = ? AND seeker_id = ?', [job.id, req.session.user.id]);
      alreadyApplied = apps.length > 0;
    }
    const [similar] = await db.query(
      `SELECT id, title, company, location, type FROM jobs WHERE status='active' AND id != ? AND (type = ? OR location LIKE ?) ORDER BY created_at DESC LIMIT 4`,
      [job.id, job.type, `%${job.location.split(',')[0]}%`]
    );
    res.json({ job, alreadyApplied, similar });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load job.' });
  }
});

module.exports = router;
