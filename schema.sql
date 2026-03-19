-- Job Portal Database Schema
-- Run: mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS job_portal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE job_portal;

-- Users table (all roles)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('seeker', 'employer', 'admin') NOT NULL DEFAULT 'seeker',
  phone VARCHAR(20),
  bio TEXT,
  nid_number VARCHAR(20) UNIQUE,
  nid_image VARCHAR(255),
  company_name VARCHAR(150),
  company_website VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employer_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  company VARCHAR(150) NOT NULL,
  location VARCHAR(150) NOT NULL,
  type ENUM('full-time', 'part-time', 'contract', 'remote', 'internship') NOT NULL DEFAULT 'full-time',
  salary_min INT,
  salary_max INT,
  description TEXT NOT NULL,
  requirements TEXT,
  benefits TEXT,
  category VARCHAR(100) DEFAULT 'General',
  experience_level ENUM('entry', 'mid', 'senior', 'lead', 'any') DEFAULT 'any',
  status ENUM('active', 'closed', 'draft') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employer_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_status (status),
  INDEX idx_employer (employer_id),
  INDEX idx_created (created_at)
);

-- Applications table
CREATE TABLE IF NOT EXISTS applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_id INT NOT NULL,
  seeker_id INT NOT NULL,
  cover_letter TEXT,
  cv_file VARCHAR(255),
  status ENUM('pending', 'reviewed', 'shortlisted', 'rejected', 'hired') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (seeker_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_application (job_id, seeker_id),
  INDEX idx_seeker (seeker_id),
  INDEX idx_job (job_id)
);
