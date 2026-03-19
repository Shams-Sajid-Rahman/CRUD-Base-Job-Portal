const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET / — Home / Job listing
router.get('/', async (req, res) => {
  try {
    const { q, location, type, page = 1 } = req.query;
    const limit = 9;
    const offset = (parseInt(page) - 1) * limit;

    let where = ['j.status = "active"'];
    const params = [];

    if (q) {
      where.push('(j.title LIKE ? OR j.company LIKE ? OR j.description LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (location) {
      where.push('j.location LIKE ?');
      params.push(`%${location}%`);
    }
    if (type) {
      where.push('j.type = ?');
      params.push(type);
    }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [jobs] = await db.query(
      `SELECT j.*, u.name AS employer_name
       FROM jobs j JOIN users u ON j.employer_id = u.id
       ${whereClause} ORDER BY j.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM jobs j ${whereClause}`,
      params
    );

    const [[stats]] = await db.query(
      `SELECT
        (SELECT COUNT(*) FROM jobs WHERE status='active') AS active_jobs,
        (SELECT COUNT(*) FROM users WHERE role='employer') AS employers,
        (SELECT COUNT(*) FROM users WHERE role='seeker') AS seekers`
    );

    res.render('index', {
      title: 'JobPortal — Find Your Dream Job',
      jobs,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      q: q || '',
      location: location || '',
      type: type || '',
      stats,
    });
  } catch (err) {
    console.error(err);
    res.render('index', { title: 'JobPortal', jobs: [], total: 0, page: 1, pages: 0, q: '', location: '', type: '', stats: {} });
  }
});

// GET /jobs/:id — Job detail
router.get('/jobs/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT j.*, u.name AS employer_name, u.company_name, u.company_website, u.bio AS employer_bio
       FROM jobs j JOIN users u ON j.employer_id = u.id
       WHERE j.id = ?`,
      [req.params.id]
    );

    if (!rows.length) {
      req.flash('error', 'Job not found.');
      return res.redirect('/');
    }

    const job = rows[0];

    // Check if seeker already applied
    let alreadyApplied = false;
    if (req.session?.user?.role === 'seeker') {
      const [apps] = await db.query(
        'SELECT id FROM applications WHERE job_id = ? AND seeker_id = ?',
        [job.id, req.session.user.id]
      );
      alreadyApplied = apps.length > 0;
    }

    // Similar jobs
    const [similar] = await db.query(
      `SELECT id, title, company, location, type FROM jobs
       WHERE status='active' AND id != ? AND (type = ? OR location LIKE ?)
       ORDER BY created_at DESC LIMIT 4`,
      [job.id, job.type, `%${job.location.split(',')[0]}%`]
    );

    res.render('jobs/show', { title: job.title, job, alreadyApplied, similar });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not load job details.');
    res.redirect('/');
  }
});

module.exports = router;
