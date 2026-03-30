-- ============================================================
--  notes_db — Schema & Sample Data
--  Gunakan file ini untuk setup lokal maupun migrasi ke Cloud SQL / VM
-- ============================================================

CREATE DATABASE IF NOT EXISTS notes_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE notes_db;

-- Tabel utama
CREATE TABLE IF NOT EXISTS notes (
  id            INT          NOT NULL AUTO_INCREMENT,
  judul         VARCHAR(255) NOT NULL,
  isi           TEXT         NOT NULL,
  tanggal_dibuat DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data contoh
INSERT INTO notes (judul, isi) VALUES
  ('Selamat Datang', 'Ini adalah catatan pertama Anda. Mulai tambahkan catatan baru!'),
  ('Daftar Belanja', 'Susu, Telur, Roti, Mentega, Kopi'),
  ('Ide Proyek', 'Membuat aplikasi notes fullstack menggunakan Express.js dan MySQL, lalu deploy ke GCP.');
