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
// TEAM CONTRIBUTIONS
// ===================================

// Joshua Barron:
// Authentication and group-related user routes.

// Bethlehem Admassu:
// Chore management routes including create, read, update, and delete.

// Jaime Tompkins:
// Expense tracking routes, expense summary, and final integration support.

// Justin Joseph:
// Grocery management, purchased toggle, and notification/reminder routes.

// Peter Phuc Phan:
// Dashboard summary route showing chores, expenses, groceries, and notifications.

// ===================================
// AUTH / GROUP ROUTES
// Joshua
// ===================================
app.post('/api/register', (req, res) => {
  const { name, email, password, group_name } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  const sql = 'INSERT INTO users (name, email, password, group_name) VALUES (?, ?, ?, ?)';

  db.run(sql, [name, email, password, group_name || null], function (err) {
    if (err) return res.status(400).json({ error: err.message });

    res.json({
      message: 'User registered successfully',
      id: this.lastID
    });
  });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const sql = 'SELECT id, name, email, group_name FROM users WHERE email = ? AND password = ?';

  db.get(sql, [email, password], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });

    if (!row) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({
      message: 'Login successful',
      user: row
    });
  });
});

app.get('/api/users', (req, res) => {
  db.all('SELECT id, name, email, group_name FROM users ORDER BY id DESC', [], (err, rows) => {
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

  if (!title) {
    return res.status(400).json({ error: 'Chore title is required.' });
  }

  const sql = 'INSERT INTO chores (title, assigned_to, status, due_date) VALUES (?, ?, ?, ?)';

  db.run(sql, [title, assigned_to || '', status || 'Pending', due_date || ''], function (err) {
    if (err) return res.status(400).json({ error: err.message });

    res.json({
      message: 'Chore added successfully',
      id: this.lastID
    });
  });
});

app.put('/api/chores/:id', (req, res) => {
  const { title, assigned_to, status, due_date } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Chore title is required.' });
  }

  const sql = 'UPDATE chores SET title = ?, assigned_to = ?, status = ?, due_date = ? WHERE id = ?';

  db.run(sql, [title, assigned_to || '', status || 'Pending', due_date || '', req.params.id], function (err) {
    if (err) return res.status(400).json({ error: err.message });

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Chore not found.' });
    }

    res.json({ message: 'Chore updated successfully' });
  });
});

app.delete('/api/chores/:id', (req, res) => {
  db.run('DELETE FROM chores WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(400).json({ error: err.message });

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Chore not found.' });
    }

    res.json({ message: 'Chore deleted successfully' });
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

  if (!title || amount === undefined || amount === '') {
    return res.status(400).json({ error: 'Expense title and amount are required.' });
  }

  const sql = 'INSERT INTO expenses (title, amount, paid_by, split_between, status) VALUES (?, ?, ?, ?, ?)';

  db.run(sql, [title, amount, paid_by || '', split_between || '', status || 'Unpaid'], function (err) {
    if (err) return res.status(400).json({ error: err.message });

    res.json({
      message: 'Expense added successfully',
      id: this.lastID
    });
  });
});

app.put('/api/expenses/:id', (req, res) => {
  const { title, amount, paid_by, split_between, status } = req.body;

  if (!title || amount === undefined || amount === '') {
    return res.status(400).json({ error: 'Expense title and amount are required.' });
  }

  const sql = 'UPDATE expenses SET title = ?, amount = ?, paid_by = ?, split_between = ?, status = ? WHERE id = ?';

  db.run(sql, [title, amount, paid_by || '', split_between || '', status || 'Unpaid', req.params.id], function (err) {
    if (err) return res.status(400).json({ error: err.message });

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Expense not found.' });
    }

    res.json({ message: 'Expense updated successfully' });
  });
});

app.delete('/api/expenses/:id', (req, res) => {
  db.run('DELETE FROM expenses WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(400).json({ error: err.message });

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Expense not found.' });
    }

    res.json({ message: 'Expense deleted successfully' });
  });
});

app.get('/api/expenses-summary', (req, res) => {
  db.all('SELECT * FROM expenses', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const total = rows.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const paid = rows.filter(expense => expense.status === 'Paid').length;
    const unpaid = rows.filter(expense => expense.status === 'Unpaid').length;

    res.json({
      total,
      count: rows.length,
      paid,
      unpaid,
      rows
    });
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

  if (!item_name) {
    return res.status(400).json({ error: 'Grocery item name is required.' });
  }

  const sql = 'INSERT INTO groceries (item_name, quantity, purchased) VALUES (?, ?, ?)';

  db.run(sql, [item_name, quantity || '', purchased ? 1 : 0], function (err) {
    if (err) return res.status(400).json({ error: err.message });

    res.json({
      message: 'Grocery item added successfully',
      id: this.lastID
    });
  });
});

app.put('/api/groceries/:id', (req, res) => {
  const { item_name, quantity, purchased } = req.body;

  if (!item_name) {
    return res.status(400).json({ error: 'Grocery item name is required.' });
  }

  const sql = 'UPDATE groceries SET item_name = ?, quantity = ?, purchased = ? WHERE id = ?';

  db.run(sql, [item_name, quantity || '', purchased ? 1 : 0, req.params.id], function (err) {
    if (err) return res.status(400).json({ error: err.message });

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Grocery item not found.' });
    }

    res.json({ message: 'Grocery item updated successfully' });
  });
});

app.delete('/api/groceries/:id', (req, res) => {
  db.run('DELETE FROM groceries WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(400).json({ error: err.message });

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Grocery item not found.' });
    }

    res.json({ message: 'Grocery item deleted successfully' });
  });
});

app.patch('/api/groceries/:id/purchase', (req, res) => {
  const { purchased } = req.body;
  const id = req.params.id;

  db.get('SELECT purchased FROM groceries WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(400).json({ error: err.message });

    if (!row) {
      return res.status(404).json({ error: 'Grocery item not found.' });
    }

    const wasPurchased = row.purchased === 1;
    const nowPurchased = purchased === true;

    db.run('UPDATE groceries SET purchased = ? WHERE id = ?', [nowPurchased ? 1 : 0, id], function (err) {
      if (err) return res.status(400).json({ error: err.message });

      if (!wasPurchased && nowPurchased) {
        db.run(
          'INSERT INTO notifications (message, type) VALUES (?, ?)',
          ['A grocery item was marked as purchased.', 'success']
        );
      }

      res.json({ message: 'Grocery purchase status updated successfully' });
    });
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

  if (!message) {
    return res.status(400).json({ error: 'Notification message is required.' });
  }

  db.run('INSERT INTO notifications (message, type) VALUES (?, ?)', [message, type || 'info'], function (err) {
    if (err) return res.status(400).json({ error: err.message });

    res.json({
      message: 'Notification created successfully',
      id: this.lastID
    });
  });
});

app.post('/api/notifications/grocery-reminders', (req, res) => {
  const sql = 'SELECT * FROM groceries WHERE purchased = 0';

  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    rows.forEach(item => {
      const message = `Reminder: ${item.item_name} is still not purchased.`;

      db.run(
        'INSERT INTO notifications (message, type) VALUES (?, ?)',
        [message, 'warning']
      );
    });

    res.json({
      message: 'Grocery reminders generated successfully',
      count: rows.length
    });
  });
});

app.post('/api/notifications/chore-reminders', (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  const sql = `
    SELECT * FROM chores
    WHERE status != 'Completed'
    AND due_date IS NOT NULL
    AND due_date != ''
    AND due_date < ?
  `;

  db.all(sql, [today], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    rows.forEach(chore => {
      const message = `Reminder: Chore "${chore.title}" is overdue.`;

      db.run(
        'INSERT INTO notifications (message, type) VALUES (?, ?)',
        [message, 'warning']
      );
    });

    res.json({
      message: 'Chore reminders generated successfully',
      count: rows.length
    });
  });
});

app.post('/api/notifications/expense-reminders', (req, res) => {
  const sql = `
    SELECT * FROM expenses
    WHERE status = 'Unpaid'
  `;

  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    rows.forEach(expense => {
      const message = `Reminder: Expense "${expense.title}" is still unpaid.`;

      db.run(
        'INSERT INTO notifications (message, type) VALUES (?, ?)',
        [message, 'warning']
      );
    });

    res.json({
      message: 'Expense reminders generated successfully',
      count: rows.length
    });
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
      dashboard.summary.unpaidExpenses = expenses.filter(e => e.status === 'Unpaid').length;
      dashboard.summary.paidExpenses = expenses.filter(e => e.status === 'Paid').length;
      dashboard.expenses = expenses.slice(0, 5);

      db.all('SELECT * FROM groceries ORDER BY id DESC', [], (err3, groceries) => {
        if (err3) return res.status(500).json({ error: err3.message });

        dashboard.summary.totalGroceries = groceries.length;
        dashboard.summary.purchasedGroceries = groceries.filter(g => g.purchased === 1).length;
        dashboard.summary.unpurchasedGroceries = groceries.filter(g => g.purchased === 0).length;
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

// ===================================
// START SERVER
// ===================================
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});