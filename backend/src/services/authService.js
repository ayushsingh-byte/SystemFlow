const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const crypto = require('crypto');
const db = require('../db');
const { sendVerificationEmail, sendPasswordResetEmail } = require('./emailService');

function generateToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

async function register(email, password, name) {
  const norm = email.toLowerCase().trim();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(norm);
  if (existing) {
    const err = new Error('Email already in use');
    err.status = 409;
    throw err;
  }

  const hash = await bcrypt.hash(password, 12);
  const id = uuid();
  const verificationToken = crypto.randomBytes(32).toString('hex');

  db.prepare(
    'INSERT INTO users (id, email, password, name, verification_token) VALUES (?, ?, ?, ?, ?)'
  ).run(id, norm, hash, name.trim(), verificationToken);

  sendVerificationEmail(norm, verificationToken, name.trim()).catch(err =>
    console.error('[Email] Failed to send verification email:', err.message)
  );

  const user = db.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?').get(id);
  return {
    user,
    token: generateToken(id),
    message: 'Check your email for a verification link.',
  };
}

async function login(email, password) {
  const norm = email.toLowerCase().trim();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(norm);

  if (!user) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    throw err;
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    throw err;
  }

  const { password: _, ...safe } = user;
  return { user: safe, token: generateToken(user.id) };
}

function getUserById(id) {
  return db.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?').get(id);
}

function verifyEmail(token) {
  const user = db.prepare('SELECT * FROM users WHERE verification_token = ?').get(token);
  if (!user) {
    const err = new Error('Invalid or expired verification token');
    err.status = 400;
    throw err;
  }

  db.prepare(
    'UPDATE users SET email_verified = 1, verification_token = NULL WHERE id = ?'
  ).run(user.id);

  return { message: 'Email verified' };
}

async function forgotPassword(email) {
  const norm = email.toLowerCase().trim();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(norm);

  if (user) {
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    db.prepare(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?'
    ).run(resetToken, expires, user.id);

    sendPasswordResetEmail(norm, resetToken, user.name).catch(err =>
      console.error('[Email] Failed to send password reset email:', err.message)
    );
  }

  return { message: 'If that email exists, a reset link has been sent' };
}

async function resetPassword(token, newPassword) {
  const now = new Date().toISOString();
  const user = db.prepare(
    'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > ?'
  ).get(token, now);

  if (!user) {
    const err = new Error('Invalid or expired reset token');
    err.status = 400;
    throw err;
  }

  const hash = await bcrypt.hash(newPassword, 12);

  db.prepare(
    'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?'
  ).run(hash, user.id);

  return { message: 'Password reset successfully' };
}

function logout() {
  // TODO: implement token blacklist or switch to short-lived access + refresh tokens
  return { message: 'Logged out' };
}

module.exports = {
  register,
  login,
  generateToken,
  verifyToken,
  getUserById,
  verifyEmail,
  forgotPassword,
  resetPassword,
  logout,
};
