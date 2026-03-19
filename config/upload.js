const multer = require('multer');
const path = require('path');

const nidStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/uploads/nid'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, 'nid-' + unique + ext);
  }
});

const nidFileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, WEBP, or PDF files are allowed for NID.'), false);
  }
};

const uploadNID = multer({
  storage: nidStorage,
  fileFilter: nidFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const cvStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/uploads/cv'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, 'cv-' + unique + ext);
  }
});

const cvFileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, or DOCX files are allowed for CV.'), false);
  }
};

const uploadCV = multer({
  storage: cvStorage,
  fileFilter: cvFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

module.exports = { uploadNID, uploadCV };
