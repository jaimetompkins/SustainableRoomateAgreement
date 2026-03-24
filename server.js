const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===================================
// DATABASE SETUP
// Keeping database setup in one file
// so the project stays simple.
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
    due_date TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    amount REAL NOT NULL,
    paid_by TEXT,
    split_between TEXT,
    status TEXT DEFAULT 'Unpaid'
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS groceries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_name TEXT NOT NULL,
    quantity TEXT,
    purchased INTEGER DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info'
  )`);
});

// ===================================
// TEAM TODO NOTES
// ===================================

// TODO Joshua:
// - finish register logic
// - finish login logic
// - add create group logic
// - add join group logic
// - make sure users only see their own group data

// TODO Bethlehem:
// - add chore edit logic
// - add chore delete logic
// - add assign chore logic
// - add update chore status logic
// - optional: add rotating/random chore assignment

// TODO Jaime:
// - add expense split logic
// - add balance calculation logic
// - make expense summary cleaner
// - do final integration and make sure the full app still runs

// TODO Justin:
// - add grocery edit logic
// - add grocery delete logic
// - add purchased toggle logic
// - add notifications/reminders logic

// TODO Peter:
// - make dashboard summary better
// - show totals for chores, expenses, groceries, and notifications
// - help with final cleanup and bug fixing

// ===================================
// AUTH / GROUP ROUTES
// Joshua
// ===================================
app.post('/api/register', (req, res) => {
  const { name, email, password, group_name } = req.body;
  const sql = 'INSERT INTO users (name, email, password, group_name) VALUES (?, ?, ?, ?)';

  db.run(sql, [name, email, password, group_name || null], function (err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ message: 'User registered', id: this.lastID });
  });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const sql = 'SELECT * FROM users WHERE email = ? AND password = ?';

  db.get(sql, [email, password], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ message: 'Login successful', user: row });
  });
});

app.get('/api/users', (req, res) => {
  db.all('SELECT id, name, email, group_name FROM users', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ===================================
// CHORE ROUTES
// Bethlehem
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

app.put('/api/chores/:id', (req, res) => {
  const { title, assigned_to, status, due_date } = req.body;
  const sql = 'UPDATE chores SET title = ?, assigned_to = ?, status = ?, due_date = ? WHERE id = ?';

  db.run(sql, [title, assigned_to, status, due_date, req.params.id], function (err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ message: 'Chore updated' });
  });
});

app.delete('/api/chores/:id', (req, res) => {
  db.run('DELETE FROM chores WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ message: 'Chore deleted' });
  });
});

// ===================================
// EXPENSE ROUTES
// Jaime
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

app.put('/api/expenses/:id', (req, res) => {
  const { title, amount, paid_by, split_between, status } = req.body;
  const sql = 'UPDATE expenses SET title = ?, amount = ?, paid_by = ?, split_between = ?, status = ? WHERE id = ?';

  db.run(sql, [title, amount, paid_by, split_between, status, req.params.id], function (err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ message: 'Expense updated' });
  });
});

app.delete('/api/expenses/:id', (req, res) => {
  db.run('DELETE FROM expenses WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ message: 'Expense deleted' });
  });
});

app.get('/api/expenses-summary', (req, res) => {
  db.all('SELECT * FROM expenses', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const total = rows.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    res.json({ total, count: rows.length, rows });
  });
});

// ===================================
// GROCERY ROUTES
// Justin
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

app.put('/api/groceries/:id', (req, res) => {
  const { item_name, quantity, purchased } = req.body;
  const sql = 'UPDATE groceries SET item_name = ?, quantity = ?, purchased = ? WHERE id = ?';

  db.run(sql, [item_name, quantity, purchased ? 1 : 0, req.params.id], function (err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ message: 'Grocery item updated' });
  });
});

app.delete('/api/groceries/:id', (req, res) => {
  db.run('DELETE FROM groceries WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ message: 'Grocery item deleted' });
  });
});

// ===================================
// NOTIFICATION ROUTES
// Justin
// ===================================
app.get('/api/notifications', (req, res) => {
  db.all('SELECT * FROM notifications ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/notifications', (req, res) => {
  const { message, type } = req.body;
  db.run('INSERT INTO notifications (message, type) VALUES (?, ?)', [message, type || 'info'], function (err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ message: 'Notification created', id: this.lastID });
  });
});

// ===================================
// DASHBOARD ROUTES
// Peter
// ===================================
app.get('/api/dashboard', (req, res) => {
  const dashboard = {
    summary: {}
  };

  db.all('SELECT * FROM chores ORDER BY id DESC', [], (err, chores) => {
    if (err) return res.status(500).json({ error: err.message });

    dashboard.summary.totalChores = chores.length;
    dashboard.summary.completedChores = chores.filter(c => c.status === 'Completed').length;
    dashboard.summary.pendingChores = chores.filter(c => c.status === 'Pending').length;
    dashboard.summary.inProgressChores = chores.filter(c => c.status === 'In Progress').length;
    dashboard.chores = chores.slice(0, 5);

    db.all('SELECT * FROM expenses ORDER BY id DESC', [], (err2, expenses) => {
      if (err2) return res.status(500).json({ error: err2.message });

      dashboard.summary.totalExpenses = expenses.length;
      dashboard.summary.totalExpenseAmount = expenses.reduce(
        (sum, expense) => sum + Number(expense.amount || 0),
        0
      );
      dashboard.expenses = expenses.slice(0, 5);

      db.all('SELECT * FROM groceries ORDER BY id DESC', [], (err3, groceries) => {
        if (err3) return res.status(500).json({ error: err3.message });

        dashboard.summary.totalGroceries = groceries.length;
        dashboard.summary.purchasedGroceries = groceries.filter(g => g.purchased === 1).length;
        dashboard.groceries = groceries.slice(0, 5);

        db.all('SELECT * FROM notifications ORDER BY id DESC', [], (err4, notifications) => {
          if (err4) return res.status(500).json({ error: err4.message });

          dashboard.summary.totalNotifications = notifications.length;
          dashboard.notifications = notifications.slice(0, 5);

          res.json(dashboard);
        });
      });
    });
  });
});
