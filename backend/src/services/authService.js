const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const db = require('../db');

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

  db.prepare('INSERT INTO users (id, email, password, name) VALUES (?, ?, ?, ?)').run(id, norm, hash, name.trim());

  const user = db.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?').get(id);
  return { user, token: generateToken(id) };
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

module.exports = { register, login, generateToken, verifyToken, getUserById };
