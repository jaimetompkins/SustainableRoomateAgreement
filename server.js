const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===================================
// DATABASE SETUP
// ===================================
const db = new sqlite3.Database(path.join(__dirname, 'roommate.db'));

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    group_name TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS chores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    assigned_to TEXT,
    status TEXT DEFAULT 'Pending',
    due_date TEXT,
    group_name TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    amount REAL NOT NULL,
    paid_by TEXT,
    split_between TEXT,
    status TEXT DEFAULT 'Unpaid',
    group_name TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS groceries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_name TEXT NOT NULL,
    quantity TEXT,
    purchased INTEGER DEFAULT 0,
    group_name TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    group_name TEXT
  )`);
});

// ===================================
// JOSHUA: AUTH / GROUP ROUTES
// ===================================

app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body;
  const sql = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
  db.run(sql, [name, email, password], function (err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ message: 'User registered successfully', id: this.lastID });
  });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const sql = 'SELECT id, name, email, group_name FROM users WHERE email = ? AND password = ?';
  db.get(sql, [email, password], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ message: 'Login successful', user: row });
  });
});

app.post('/api/group/create', (req, res) => {
  const { userId } = req.body;
  const groupCode = 'ROOM-' + Math.floor(1000 + Math.random() * 9000); 
  const sql = 'UPDATE users SET group_name = ? WHERE id = ?';
  db.run(sql, [groupCode, userId], function(err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ message: 'Household created', group_name: groupCode });
  });
});

app.post('/api/group/join', (req, res) => {
  const { userId, group_name } = req.body;
  const sql = 'UPDATE users SET group_name = ? WHERE id = ?';
  db.run(sql, [group_name, userId], function(err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ message: 'Joined household successfully', group_name });
  });
});

// ===================================
// BETHLEHEM: CHORE ROUTES
// ===================================
app.get('/api/chores', (req, res) => {
  db.all('SELECT * FROM chores ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/chores', (req, res) => {
  const { title, assigned_to, status, due_date } = req.body;
  const sql = 'INSERT INTO chores (title, assigned_to, status, due_date) VALUES (?, ?, ?, ?)';
  db.run(sql, [title, assigned_to || '', status || 'Pending', due_date || ''], function (err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ message: 'Chore added', id: this.lastID });
  });
});

// ===================================
// JAIME: EXPENSE ROUTES
// ===================================
app.get('/api/expenses', (req, res) => {
  db.all('SELECT * FROM expenses ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/expenses', (req, res) => {
  const { title, amount, paid_by, split_between, status } = req.body;
  const sql = 'INSERT INTO expenses (title, amount, paid_by, split_between, status) VALUES (?, ?, ?, ?, ?)';
  db.run(sql, [title, amount, paid_by || '', split_between || '', status || 'Unpaid'], function (err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ message: 'Expense added', id: this.lastID });
  });
});

// ===================================
// JUSTIN: GROCERY & NOTIFICATION ROUTES
// ===================================
app.get('/api/groceries', (req, res) => {
  db.all('SELECT * FROM groceries ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/groceries', (req, res) => {
  const { item_name, quantity, purchased } = req.body;
  const sql = 'INSERT INTO groceries (item_name, quantity, purchased) VALUES (?, ?, ?)';
  db.run(sql, [item_name, quantity || '', purchased ? 1 : 0], function (err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ message: 'Grocery item added', id: this.lastID });
  });
});

app.get('/api/notifications', (req, res) => {
  db.all('SELECT * FROM notifications ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ===================================
// PETER: DASHBOARD ROUTES
// ===================================
app.get('/api/dashboard', (req, res) => {
  const dashboard = {};
  db.all('SELECT * FROM chores LIMIT 5', [], (err, chores) => {
    dashboard.chores = chores;
    db.all('SELECT * FROM expenses LIMIT 5', [], (err2, expenses) => {
      dashboard.expenses = expenses;
      res.json(dashboard);
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});