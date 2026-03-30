require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('../frontend'));

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'notes_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test DB connection on startup
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Database connected successfully');
    conn.release();
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
  }
})();

// ─────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────

// GET /api/notes — Lihat semua catatan
app.get('/api/notes', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM notes ORDER BY tanggal_dibuat DESC'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/notes/:id — Lihat catatan berdasarkan ID
app.get('/api/notes/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM notes WHERE id = ?', [
      req.params.id,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ success: false, message: 'Catatan tidak ditemukan' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/notes — Tambah catatan baru
app.post('/api/notes', async (req, res) => {
  const { judul, isi } = req.body;
  if (!judul || !isi)
    return res.status(400).json({ success: false, message: 'Judul dan isi wajib diisi' });

  try {
    const [result] = await pool.query(
      'INSERT INTO notes (judul, isi) VALUES (?, ?)',
      [judul, isi]
    );
    const [rows] = await pool.query('SELECT * FROM notes WHERE id = ?', [
      result.insertId,
    ]);
    res.status(201).json({ success: true, message: 'Catatan berhasil ditambahkan', data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/notes/:id — Edit catatan
app.put('/api/notes/:id', async (req, res) => {
  const { judul, isi } = req.body;
  if (!judul || !isi)
    return res.status(400).json({ success: false, message: 'Judul dan isi wajib diisi' });

  try {
    const [result] = await pool.query(
      'UPDATE notes SET judul = ?, isi = ? WHERE id = ?',
      [judul, isi, req.params.id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ success: false, message: 'Catatan tidak ditemukan' });

    const [rows] = await pool.query('SELECT * FROM notes WHERE id = ?', [
      req.params.id,
    ]);
    res.json({ success: true, message: 'Catatan berhasil diperbarui', data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/notes/:id — Hapus catatan
app.delete('/api/notes/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM notes WHERE id = ?', [
      req.params.id,
    ]);
    if (result.affectedRows === 0)
      return res.status(404).json({ success: false, message: 'Catatan tidak ditemukan' });

    res.json({ success: true, message: 'Catatan berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server berjalan dengan baik', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});
