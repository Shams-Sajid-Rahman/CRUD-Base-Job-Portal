require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const path = require('path');
const { setLocals } = require('./middleware/auth');

const app = express();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Body parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Method override for PUT/DELETE from HTML forms
app.use(methodOverride('_method'));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'jobportal_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }, // 24 hours
}));

// Flash messages
app.use(flash());

// Set locals for all views
app.use(setLocals);

// API routes (JSON — for plain HTML frontend)
app.get('/api/me', (req, res) => {
  res.json({ user: req.session?.user || null });
});
app.use('/api/auth', require('./routes/api/auth'));
app.use('/api/jobs', require('./routes/api/jobs'));
app.use('/api/seeker', require('./routes/api/seeker'));
app.use('/api/employer', require('./routes/api/employer'));
app.use('/api/admin', require('./routes/api/admin'));

// Root path → serve the static index page (search + job listings)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// EJS routes (legacy — kept for backward compatibility)
app.use('/', require('./routes/jobs'));
app.use('/auth', require('./routes/auth'));
app.use('/employer', require('./routes/employer'));
app.use('/seeker', require('./routes/seeker'));
app.use('/admin', require('./routes/admin'));

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { title: '404 - Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('500', { title: '500 - Server Error', error: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Job Portal running at http://localhost:${PORT}`);
});
