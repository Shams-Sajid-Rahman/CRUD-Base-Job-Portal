exports.isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) return next();
  req.flash('error', 'Please log in to continue.');
  res.redirect('/auth/login');
};

exports.isGuest = (req, res, next) => {
  if (req.session && req.session.user) return res.redirect('/');
  next();
};

exports.isEmployer = (req, res, next) => {
  if (req.session?.user?.role === 'employer') return next();
  req.flash('error', 'Access denied. Employers only.');
  res.redirect('/');
};

exports.isSeeker = (req, res, next) => {
  if (req.session?.user?.role === 'seeker') return next();
  req.flash('error', 'Access denied. Job seekers only.');
  res.redirect('/');
};

exports.isAdmin = (req, res, next) => {
  if (req.session?.user?.role === 'admin') return next();
  req.flash('error', 'Access denied. Admins only.');
  res.redirect('/');
};

// Inject session user into every view
exports.setLocals = (req, res, next) => {
  res.locals.currentUser = req.session?.user || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
};
