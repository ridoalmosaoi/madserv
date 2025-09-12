# madserv
{
  "name": "madserv",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "better-sqlite3": "^9.0.0"
  }
}
const express = require("express");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const db = new Database("madserv.db");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// جدول الموظفين (لو مش موجود ينشئه)
db.prepare(`
  CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    name TEXT,
    status TEXT,
    note TEXT
  )
`).run();

// API تجريبي
app.get("/api/employees", (req, res) => {
  const rows = db.prepare("SELECT * FROM employees").all();
  res.json(rows);
});

app.post("/api/employees", (req, res) => {
  const { id, name, status, note } = req.body;
  db.prepare("INSERT OR REPLACE INTO employees (id, name, status, note) VALUES (?, ?, ?, ?)")
    .run(id, name, status, note);
  res.json({ ok: true });
});

// تشغيل السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("MadServ running on port " + PORT);
});
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>MadServ</title>
</head>
<body>
  <h1>مرحباً بك في MadServ</h1>
  <p>لوحة الإدارة تعمل 🎉</p>
  <a href="/api/employees">🔗 قائمة الموظفين (JSON)</a>
</body>
</html>
node_modules
madserv.db
