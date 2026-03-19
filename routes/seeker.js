const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { isAuthenticated, isSeeker } = require('../middleware/auth');

router.use(isAuthenticated, isSeeker);

// GET /seeker/dashboard
router.get('/dashboard', async (req, res) => {
  const seekerId = req.session.user.id;
  try {
    const [applications] = await db.query(
      `SELECT a.*, j.title, j.company, j.location, j.type, j.status AS job_status
       FROM applications a JOIN jobs j ON a.job_id = j.id
       WHERE a.seeker_id = ? ORDER BY a.created_at DESC LIMIT 5`,
      [seekerId]
    );

    const [[stats]] = await db.query(
      `SELECT
        COUNT(*) AS total,
        SUM(a.status='pending') AS pending,
        SUM(a.status='shortlisted') AS shortlisted,
        SUM(a.status='hired') AS hired
       FROM applications a WHERE a.seeker_id = ?`,
      [seekerId]
    );

    const [recentJobs] = await db.query(
      `SELECT * FROM jobs WHERE status='active' ORDER BY created_at DESC LIMIT 6`
    );

    res.render('seeker/dashboard', { title: 'Seeker Dashboard', applications, stats, recentJobs });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load dashboard.');
    res.redirect('/');
  }
});

// GET /seeker/applications
router.get('/applications', async (req, res) => {
  const seekerId = req.session.user.id;
  try {
    const [applications] = await db.query(
      `SELECT a.*, j.title, j.company, j.location, j.type, j.salary_min, j.salary_max, j.status AS job_status
       FROM applications a JOIN jobs j ON a.job_id = j.id
       WHERE a.seeker_id = ? ORDER BY a.created_at DESC`,
      [seekerId]
    );
    res.render('seeker/applications', { title: 'My Applications', applications });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load applications.');
    res.redirect('/seeker/dashboard');
  }
});

// POST /seeker/apply/:jobId
router.post('/apply/:jobId', async (req, res) => {
  const { cover_letter } = req.body;
  const jobId = req.params.jobId;
  const seekerId = req.session.user.id;

  try {
    // Verify job is active
    const [jobRows] = await db.query('SELECT id, title FROM jobs WHERE id = ? AND status = "active"', [jobId]);
    if (!jobRows.length) {
      req.flash('error', 'This job is not available for applications.');
      return res.redirect('/');
    }

    await db.query(
      'INSERT INTO applications (job_id, seeker_id, cover_letter) VALUES (?, ?, ?)',
      [jobId, seekerId, cover_letter?.trim() || null]
    );

    req.flash('success', `Successfully applied to "${jobRows[0].title}"!`);
    res.redirect(`/jobs/${jobId}`);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      req.flash('error', 'You have already applied for this job.');
    } else {
      console.error(err);
      req.flash('error', 'Failed to submit application.');
    }
    res.redirect(`/jobs/${jobId}`);
  }
});

// DELETE /seeker/applications/:id — withdraw application
router.delete('/applications/:id', async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM applications WHERE id = ? AND seeker_id = ? AND status = "pending"',
      [req.params.id, req.session.user.id]
    );
    if (result.affectedRows === 0) {
      req.flash('error', 'Cannot withdraw this application (already reviewed).');
    } else {
      req.flash('success', 'Application withdrawn.');
    }
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to withdraw application.');
  }
  res.redirect('/seeker/applications');
});

module.exports = router;
