
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- Database setup ---
const db = new Database('madserv.db');
db.pragma('journal_mode = WAL');

// Create tables if not exist
db.exec(`
CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  name TEXT,
  role TEXT,
  note TEXT
);
CREATE TABLE IF NOT EXISTS supervisors (
  id TEXT PRIMARY KEY,
  name TEXT,
  role TEXT,
  note TEXT
);
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  name TEXT,
  status TEXT,
  note TEXT
);
CREATE TABLE IF NOT EXISTS finance (
  emp_id TEXT PRIMARY KEY,
  fine INTEGER DEFAULT 0,
  deduct INTEGER DEFAULT 0,
  FOREIGN KEY(emp_id) REFERENCES employees(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS blacklist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  reason TEXT,
  status TEXT DEFAULT 'موقوف'
);
`);

// Seed once (if empty)
function seedIfEmpty() {
  const cnt = db.prepare('SELECT COUNT(*) AS c FROM employees').get().c;
  if (cnt === 0) {
    const seedAdmins = [
      {id:'A-100', name:'مدير المدينة – حيدر علي', role:'مدير عام', note:'صلاحيات كاملة'},
      {id:'A-200', name:'المديرة – مرام علي', role:'هيئة الضرائب', note:'قرارات مالية'}
    ];
    const seedSup = [
      {id:'S-300', name:'فهد العزاوي', role:'مدير قسم الاستعلامات', note:'إشعارات ومتابعة'},
      {id:'S-310', name:'حامد علي', role:'مدير قسم التقاعد', note:'قرارات تقاعد'}
    ];
    const seedEmp = [
      {id:'42135', name:'ياسر حمزة', status:'active', note:'تمت تسوية الغرامة'},
      {id:'75396', name:'موظف 11', status:'active', note:''},
      {id:'7428', name:'—', status:'active', note:'تعويض 3,000,000 من الإدارة العليا'},
      {id:'10731', name:'سديم', status:'active', note:'أُعيد التفعيل'}
    ];
    const insertA = db.prepare('INSERT INTO admins (id,name,role,note) VALUES (@id,@name,@role,@note)');
    const insertS = db.prepare('INSERT INTO supervisors (id,name,role,note) VALUES (@id,@name,@role,@note)');
    const insertE = db.prepare('INSERT INTO employees (id,name,status,note) VALUES (@id,@name,@status,@note)');
    const insertF = db.prepare('INSERT INTO finance (emp_id,fine,deduct) VALUES (@emp_id,@fine,@deduct)');
    const insertB = db.prepare('INSERT INTO blacklist (name,reason,status) VALUES (@name,@reason,@status)');
    const tx = db.transaction(() => {
      seedAdmins.forEach(x => insertA.run(x));
      seedSup.forEach(x => insertS.run(x));
      seedEmp.forEach(x => {
        insertE.run(x);
        insertF.run({emp_id:x.id, fine:0, deduct:0});
      });
      insertB.run({name:'ياسر حمزة', reason:'عدم تسديد أقساط الموبايل (950,000 دينار)', status:'تمت إزالته بعد السداد'});
    });
    tx();
  }
}
seedIfEmpty();

// --- Simple auth (demo) ---
const MASTER_PASS = '##77';
app.post('/api/login', (req, res) => {
  const { password } = req.body || {};
  if (password === MASTER_PASS) {
    return res.json({ ok: true, token: 'demo-token' });
  }
  return res.status(401).json({ ok: false, error: 'invalid_password' });
});

// --- Admins & Supervisors (read only) ---
app.get('/api/admins', (req, res) => {
  res.json(db.prepare('SELECT * FROM admins').all());
});
app.get('/api/supervisors', (req, res) => {
  res.json(db.prepare('SELECT * FROM supervisors').all());
});

// --- Employees CRUD ---
app.get('/api/employees', (req, res) => {
  const rows = db.prepare('SELECT * FROM employees').all();
  res.json(rows);
});
app.get('/api/employees/:id', (req, res) => {
  const id = req.params.id;
  const row = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
  if (!row) return res.status(404).json({error:'not_found'});
  const fin = db.prepare('SELECT * FROM finance WHERE emp_id = ?').get(id) || {fine:0, deduct:0};
  res.json({...row, finance: fin});
});
app.post('/api/employees', (req, res) => {
  const { id, name, status='active', note='' } = req.body || {};
  if (!id) return res.status(400).json({error:'id_required'});
  try {
    db.prepare('INSERT INTO employees (id,name,status,note) VALUES (?,?,?,?)').run(id,name,status,note);
    db.prepare('INSERT OR IGNORE INTO finance (emp_id,fine,deduct) VALUES (?,?,?)').run(id,0,0);
    res.json({ok:true});
  } catch(e) {
    res.status(409).json({error:'id_exists'});
  }
});
app.put('/api/employees/:id', (req, res) => {
  const id = req.params.id;
  const { name, status, note } = req.body || {};
  const st = db.prepare('UPDATE employees SET name=COALESCE(?,name), status=COALESCE(?,status), note=COALESCE(?,note) WHERE id=?').run(name, status, note, id);
  if (st.changes === 0) return res.status(404).json({error:'not_found'});
  res.json({ok:true});
});
app.put('/api/employees/:id/finance', (req, res) => {
  const id = req.params.id;
  const { fine=0, deduct=0 } = req.body || {};
  db.prepare('INSERT INTO finance (emp_id,fine,deduct) VALUES (?,?,?) ON CONFLICT(emp_id) DO UPDATE SET fine=excluded.fine, deduct=excluded.deduct').run(id, fine, deduct);
  res.json({ok:true});
});
app.post('/api/employees/:id/change-id', (req,res) => {
  const oldId = req.params.id;
  const { newId } = req.body || {};
  if (!newId) return res.status(400).json({error:'newId_required'});
  const row = db.prepare('SELECT * FROM employees WHERE id=?').get(oldId);
  if (!row) return res.status(404).json({error:'not_found'});
  const exists = db.prepare('SELECT 1 FROM employees WHERE id=?').get(newId);
  if (exists) return res.status(409).json({error:'new_id_exists'});
  const tx = db.transaction(() => {
    db.prepare('UPDATE employees SET id=? WHERE id=?').run(newId, oldId);
    db.prepare('UPDATE finance SET emp_id=? WHERE emp_id=?').run(newId, oldId);
  });
  tx();
  res.json({ok:true});
});
app.delete('/api/employees/:id', (req, res) => {
  const id = req.params.id;
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM finance WHERE emp_id=?').run(id);
    db.prepare('DELETE FROM employees WHERE id=?').run(id);
  });
  tx();
  res.json({ok:true});
});

// --- Blacklist CRUD ---
app.get('/api/blacklist', (req,res) => {
  res.json(db.prepare('SELECT * FROM blacklist ORDER BY id DESC').all());
});
app.post('/api/blacklist', (req,res) => {
  const { name, reason, status='موقوف' } = req.body || {};
  if(!name || !reason) return res.status(400).json({error:'name_and_reason_required'});
  const st = db.prepare('INSERT INTO blacklist (name,reason,status) VALUES (?,?,?)').run(name,reason,status);
  res.json({ok:true, id: st.lastInsertRowid});
});
app.delete('/api/blacklist/:id', (req,res) => {
  db.prepare('DELETE FROM blacklist WHERE id=?').run(req.params.id);
  res.json({ok:true});
});

// --- Static frontend ---
app.use('/', express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`MadServ server running on http://localhost:${PORT}`));
