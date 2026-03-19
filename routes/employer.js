const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { isAuthenticated, isEmployer } = require('../middleware/auth');

router.use(isAuthenticated, isEmployer);

// GET /employer/dashboard
router.get('/dashboard', async (req, res) => {
  const employerId = req.session.user.id;
  try {
    const [jobs] = await db.query(
      `SELECT j.*,
        (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS app_count
       FROM jobs j WHERE j.employer_id = ? ORDER BY j.created_at DESC`,
      [employerId]
    );

    const [[stats]] = await db.query(
      `SELECT
        COUNT(*) AS total_jobs,
        SUM(status='active') AS active_jobs,
        SUM(status='closed') AS closed_jobs,
        (SELECT COUNT(*) FROM applications a JOIN jobs j ON a.job_id = j.id WHERE j.employer_id = ?) AS total_applications
       FROM jobs WHERE employer_id = ?`,
      [employerId, employerId]
    );

    res.render('employer/dashboard', { title: 'Employer Dashboard', jobs, stats });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load dashboard.');
    res.redirect('/');
  }
});

// GET /employer/jobs/create
router.get('/jobs/create', (req, res) => {
  res.render('employer/create-job', { title: 'Post a New Job' });
});

// POST /employer/jobs
router.post('/jobs', async (req, res) => {
  const { title, company, location, type, salary_min, salary_max, description, requirements, benefits, experience_level, status } = req.body;

  if (!title || !company || !location || !type || !description) {
    req.flash('error', 'Please fill in all required fields.');
    return res.redirect('/employer/jobs/create');
  }

  try {
    await db.query(
      `INSERT INTO jobs (employer_id, title, company, location, type, salary_min, salary_max, description, requirements, benefits, experience_level, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.session.user.id,
        title.trim(), company.trim(), location.trim(), type,
        salary_min || null, salary_max || null,
        description.trim(),
        requirements?.trim() || null,
        benefits?.trim() || null,
        experience_level || 'any',
        status || 'active',
      ]
    );
    req.flash('success', 'Job posted successfully!');
    res.redirect('/employer/dashboard');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to post job.');
    res.redirect('/employer/jobs/create');
  }
});

// GET /employer/jobs/:id/edit
router.get('/jobs/:id/edit', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM jobs WHERE id = ? AND employer_id = ?',
      [req.params.id, req.session.user.id]
    );
    if (!rows.length) {
      req.flash('error', 'Job not found.');
      return res.redirect('/employer/dashboard');
    }
    res.render('employer/edit-job', { title: 'Edit Job', job: rows[0] });
  } catch (err) {
    req.flash('error', 'Failed to load job.');
    res.redirect('/employer/dashboard');
  }
});

// PUT /employer/jobs/:id
router.put('/jobs/:id', async (req, res) => {
  const { title, company, location, type, salary_min, salary_max, description, requirements, benefits, experience_level, status } = req.body;

  try {
    const [result] = await db.query(
      `UPDATE jobs SET title=?, company=?, location=?, type=?, salary_min=?, salary_max=?,
       description=?, requirements=?, benefits=?, experience_level=?, status=?
       WHERE id=? AND employer_id=?`,
      [
        title.trim(), company.trim(), location.trim(), type,
        salary_min || null, salary_max || null,
        description.trim(),
        requirements?.trim() || null,
        benefits?.trim() || null,
        experience_level || 'any',
        status,
        req.params.id,
        req.session.user.id,
      ]
    );

    if (result.affectedRows === 0) {
      req.flash('error', 'Job not found or not authorized.');
    } else {
      req.flash('success', 'Job updated successfully!');
    }
    res.redirect('/employer/dashboard');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to update job.');
    res.redirect(`/employer/jobs/${req.params.id}/edit`);
  }
});

// DELETE /employer/jobs/:id
router.delete('/jobs/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM jobs WHERE id = ? AND employer_id = ?', [req.params.id, req.session.user.id]);
    req.flash('success', 'Job deleted successfully.');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to delete job.');
  }
  res.redirect('/employer/dashboard');
});

// GET /employer/jobs/:id/applicants
router.get('/jobs/:id/applicants', async (req, res) => {
  try {
    const [jobRows] = await db.query(
      'SELECT * FROM jobs WHERE id = ? AND employer_id = ?',
      [req.params.id, req.session.user.id]
    );
    if (!jobRows.length) {
      req.flash('error', 'Job not found.');
      return res.redirect('/employer/dashboard');
    }

    const [applicants] = await db.query(
      `SELECT a.*, u.name, u.email, u.phone, u.bio
       FROM applications a JOIN users u ON a.seeker_id = u.id
       WHERE a.job_id = ? ORDER BY a.created_at DESC`,
      [req.params.id]
    );

    res.render('employer/applicants', {
      title: 'Applicants — ' + jobRows[0].title,
      job: jobRows[0],
      applicants,
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load applicants.');
    res.redirect('/employer/dashboard');
  }
});

// PUT /employer/applications/:id/status — update applicant status
router.put('/applications/:id/status', async (req, res) => {
  const { status, job_id } = req.body;
  const allowed = ['pending', 'reviewed', 'shortlisted', 'rejected', 'hired'];
  if (!allowed.includes(status)) {
    req.flash('error', 'Invalid status.');
    return res.redirect(`/employer/jobs/${job_id}/applicants`);
  }
  try {
    await db.query(
      `UPDATE applications a
       JOIN jobs j ON a.job_id = j.id
       SET a.status = ?
       WHERE a.id = ? AND j.employer_id = ?`,
      [status, req.params.id, req.session.user.id]
    );
    req.flash('success', 'Applicant status updated.');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to update status.');
  }
  res.redirect(`/employer/jobs/${job_id}/applicants`);
});

module.exports = router;
