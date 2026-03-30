# 🚀 Panduan Setup & Deployment — CatatanKu Notes App

> Tugas 2 · Fullstack Notes App · Express.js + MySQL + GCP VM

---

## 📁 Struktur Proyek

```
notes-app/
├── backend/
│   ├── server.js          # Express.js server utama
│   ├── notes_db.sql       # Schema + seed database
│   ├── package.json
│   └── .env.example       # Contoh konfigurasi environment
└── frontend/
    ├── index.html
    ├── style.css
    └── app.js
```

---

## BAGIAN 1 — Setup Lokal

### 1.1 Prasyarat
- Node.js v18+ dan npm
- MySQL 8.x (lokal)

### 1.2 Setup Database Lokal

```bash
# Login ke MySQL
mysql -u root -p

# Jalankan script SQL (buat database + tabel + data contoh)
mysql -u root -p < backend/notes_db.sql

# Verifikasi
mysql -u root -p -e "USE notes_db; SELECT * FROM notes;"
```

### 1.3 Setup Backend

```bash
cd backend

# Salin file environment
cp .env.example .env

# Edit sesuai konfigurasi lokal Anda
nano .env
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=<password_mysql_anda>
# DB_NAME=notes_db
# PORT=3000

# Install dependencies
npm install

# Jalankan server
npm start
# → 🚀 Server berjalan di http://localhost:3000
```

### 1.4 Buka Frontend di Browser

Buka file `frontend/index.html` langsung di browser, atau serve via:

```bash
# Alternatif: gunakan live-server
npx live-server frontend --port=8080
```

> **Catatan:** Backend (Express.js) melayani static file frontend.
> Jika backend berjalan di port 3000, buka `http://localhost:3000`

---

## BAGIAN 2 — Pengujian API (Postman / REST Client)

### Endpoint yang Tersedia

| Method | URL                       | Deskripsi              |
|--------|---------------------------|------------------------|
| GET    | /api/notes                | Lihat semua catatan    |
| GET    | /api/notes/:id            | Lihat catatan by ID    |
| POST   | /api/notes                | Tambah catatan baru    |
| PUT    | /api/notes/:id            | Edit catatan           |
| DELETE | /api/notes/:id            | Hapus catatan          |
| GET    | /api/health               | Health check server    |

### Contoh Request

#### GET semua catatan
```
GET http://localhost:3000/api/notes
```

#### POST tambah catatan
```
POST http://localhost:3000/api/notes
Content-Type: application/json

{
  "judul": "Catatan Baru",
  "isi": "Ini isi dari catatan saya."
}
```

#### PUT edit catatan
```
PUT http://localhost:3000/api/notes/1
Content-Type: application/json

{
  "judul": "Judul Diperbarui",
  "isi": "Isi yang sudah diedit."
}
```

#### DELETE hapus catatan
```
DELETE http://localhost:3000/api/notes/1
```

---

## BAGIAN 3 — Migrasi Database ke GCP

### 3.1 Export Database Lokal ke .sql

```bash
mysqldump -u root -p notes_db > notes_db_export.sql

# Verifikasi file hasil export
cat notes_db_export.sql
```

### 3.2 Pilihan A — Cloud SQL (GCP Managed MySQL)

#### a. Buat Instance Cloud SQL
1. Buka: https://console.cloud.google.com/sql
2. Klik **Create Instance** → pilih **MySQL**
3. Isi:
   - Instance ID: `notes-db-instance`
   - Password root: (buat password kuat)
   - Region: `asia-southeast2` (Jakarta)
   - Database version: MySQL 8.0
4. Klik **Create**

#### b. Buat Database
```
Instance > Databases > Create Database: notes_db
```

#### c. Import file .sql ke Cloud SQL
```bash
# Upload file ke Cloud Storage terlebih dahulu
gsutil cp notes_db_export.sql gs://<your-bucket>/

# Import via Console:
# SQL Instance → Import → pilih file dari GCS → database: notes_db
```

#### d. Konfigurasi Koneksi
- Catat **Public IP** instance Cloud SQL
- Tambahkan IP publik server/laptop Anda di: **Connections > Authorized Networks**

---

### 3.3 Pilihan B — MySQL di GCP VM (Recommended untuk Tugas Ini)

#### a. Buat VM di GCP

```
GCP Console → Compute Engine → VM instances → Create Instance

Nama      : notes-app-vm
Region    : asia-southeast2 (Jakarta)
Zone      : asia-southeast2-a
Machine   : e2-medium (2 vCPU, 4 GB RAM)
OS        : Ubuntu 22.04 LTS
Disk      : 20 GB SSD
Firewall  : ✅ Allow HTTP traffic
             ✅ Allow HTTPS traffic
```

#### b. Tambah Firewall Rule untuk port 3000
```
VPC Network → Firewall → Create Firewall Rule

Nama            : allow-port-3000
Direction       : Ingress
Target tags     : http-server
Source IP       : 0.0.0.0/0
Protocols/ports : TCP 3000, 80
```

#### c. SSH ke VM & Install Dependencies

```bash
# SSH via browser Console atau:
gcloud compute ssh notes-app-vm --zone=asia-southeast2-a

# Update sistem
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MySQL
sudo apt install -y mysql-server
sudo mysql_secure_installation

# Install nginx (untuk serve frontend — bonus)
sudo apt install -y nginx

# Verifikasi
node --version   # v18.x.x
mysql --version  # mysql  Ver 8.x
```

#### d. Setup MySQL di VM

```bash
# Login MySQL sebagai root
sudo mysql

# Buat user khusus untuk aplikasi
CREATE USER 'notesuser'@'localhost' IDENTIFIED BY 'StrongPassword123!';
CREATE DATABASE notes_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON notes_db.* TO 'notesuser'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### e. Upload & Import Database

```bash
# Dari laptop lokal — copy file sql ke VM
gcloud compute scp notes_db_export.sql notes-app-vm:~ --zone=asia-southeast2-a

# Di dalam VM — import ke MySQL
mysql -u notesuser -p notes_db < notes_db_export.sql

# Verifikasi
mysql -u notesuser -p -e "USE notes_db; SELECT * FROM notes;"
```

#### f. Deploy Aplikasi ke VM

```bash
# Upload kode aplikasi ke VM
gcloud compute scp --recurse ./notes-app notes-app-vm:~ --zone=asia-southeast2-a

# Di VM: masuk ke folder backend
cd ~/notes-app/backend
cp .env.example .env
nano .env
# DB_HOST=localhost
# DB_USER=notesuser
# DB_PASSWORD=StrongPassword123!
# DB_NAME=notes_db
# PORT=3000

# Install dependencies
npm install

# Install PM2 untuk menjalankan server di background
sudo npm install -g pm2

# Jalankan server dengan PM2
pm2 start server.js --name "notes-app"
pm2 save
pm2 startup
```

---

## BAGIAN 4 — Deploy Frontend via Nginx (Bonus)

```bash
# Di VM — copy frontend ke folder nginx
sudo cp -r ~/notes-app/frontend/* /var/www/html/

# Ubah API_BASE di app.js agar mengarah ke IP publik VM
# Edit /var/www/html/app.js:
#   const API_BASE = 'http://<EXTERNAL_IP>:3000/api';

sudo nano /var/www/html/app.js
# Ganti: const API_BASE = 'http://localhost:3000/api';
# Dengan: const API_BASE = 'http://<EXTERNAL_IP_VM>:3000/api';

# Restart nginx
sudo systemctl restart nginx

# Cek status
sudo systemctl status nginx
```

> Akses aplikasi via browser: `http://<EXTERNAL_IP_VM>`

---

## BAGIAN 5 — Struktur Tabel Database

```sql
CREATE TABLE notes (
  id             INT          NOT NULL AUTO_INCREMENT,
  judul          VARCHAR(255) NOT NULL,
  isi            TEXT         NOT NULL,
  tanggal_dibuat DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

| Kolom           | Tipe         | Keterangan                        |
|-----------------|--------------|-----------------------------------|
| id              | INT (AI, PK) | Primary key auto-increment        |
| judul           | VARCHAR(255) | Judul catatan, wajib diisi        |
| isi             | TEXT         | Isi catatan, wajib diisi          |
| tanggal_dibuat  | DATETIME     | Otomatis terisi saat data dibuat  |

---

## Checklist Pengumpulan ✅

- [ ] Struktur tabel database (lihat Bagian 5)
- [ ] Screenshot: Aplikasi berjalan lokal (`http://localhost:3000`)
- [ ] Screenshot: Database lokal sebelum migrasi (`SHOW TABLES; SELECT * FROM notes;`)
- [ ] Screenshot: Proses migrasi `.sql` (export + import)
- [ ] Screenshot: Database di Cloud SQL / MySQL VM (`SELECT * FROM notes;`)
- [ ] Screenshot: Pengujian endpoint Postman (GET, POST, PUT, DELETE)
- [ ] (Bonus) Screenshot: Frontend diakses via IP Publik VM
