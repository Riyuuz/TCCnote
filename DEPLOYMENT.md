# 🚀 Panduan Deployment — Notes App ke GCP

## Arsitektur Deployment

```
[Browser User]
     │
     ▼
[App Engine] ──── Frontend (HTML/CSS/JS)
     │                  │ fetch API
     ▼                  ▼
[Cloud Run]  ──── Backend (Express.js) ──── [MySQL @ 34.172.113.167]
```

**Skenario 2**: Backend di **Cloud Run** | Frontend di **App Engine**

---

## Prasyarat

1. Akun Google Cloud dengan project aktif
2. Google Cloud SDK (`gcloud`) sudah terinstall
3. Docker Desktop terinstall (untuk build image)
4. Billing aktif di GCP project

```bash
# Login ke GCP
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

---

## LANGKAH 1 — Siapkan Database MySQL

1. Buka https://phpmyadmin.co/
2. Login: **Username**: admin | **Password**: mypassword | **Server**: 34.172.113.167
3. Buat database baru dengan nama: `notes_NIM` (contoh: `notes_123456789`)
4. Import file `backend/notes_db.sql` atau jalankan SQL berikut:

```sql
USE notes_123456789;

CREATE TABLE IF NOT EXISTS notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  judul VARCHAR(255) NOT NULL,
  isi TEXT NOT NULL,
  tanggal_dibuat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  tanggal_diperbarui TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## LANGKAH 2 — Deploy Backend ke Cloud Run

### 2a. Masuk ke folder backend
```bash
cd TCCnote/backend
```

### 2b. Edit file `.env` — isi NIM kamu
```
DB_NAME=notes_NIMKAMU   # ← ganti ini!
```

### 2c. Build dan Push image ke Google Artifact Registry

```bash
# Aktifkan layanan yang dibutuhkan
gcloud services enable run.googleapis.com artifactregistry.googleapis.com

# Buat repository Artifact Registry (sekali saja)
gcloud artifacts repositories create notes-repo \
  --repository-format=docker \
  --location=asia-southeast2 \
  --description="Notes App Docker images"

# Konfigurasi docker auth
gcloud auth configure-docker asia-southeast2-docker.pkg.dev

# Build image
docker build -t asia-southeast2-docker.pkg.dev/YOUR_PROJECT_ID/notes-repo/notes-backend:latest .

# Push ke Artifact Registry
docker push asia-southeast2-docker.pkg.dev/YOUR_PROJECT_ID/notes-repo/notes-backend:latest
```

### 2d. Deploy ke Cloud Run

```bash
gcloud run deploy notes-backend \
  --image asia-southeast2-docker.pkg.dev/YOUR_PROJECT_ID/notes-repo/notes-backend:latest \
  --platform managed \
  --region asia-southeast2 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars="DB_HOST=34.172.113.167,DB_PORT=3306,DB_USER=admin,DB_PASSWORD=mypassword,DB_NAME=notes_NIMKAMU"
```

### 2e. Catat URL Backend Cloud Run
Setelah deploy selesai, catat URL yang tampil:
```
Service URL: https://notes-backend-xxxxxxxxxx-et.a.run.app
```

---

## LANGKAH 3 — Update Frontend dengan URL Backend

Edit file `frontend/app.js` baris 6:
```js
// Ganti BACKEND_CLOUD_RUN_URL dengan URL dari langkah 2e
const API_BASE = 'https://notes-backend-xxxxxxxxxx-et.a.run.app/api';
```

---

## LANGKAH 4 — Deploy Frontend ke App Engine

### 4a. Masuk ke folder frontend
```bash
cd ../frontend
```

### 4b. Pastikan `app.yaml` sudah ada (sudah dibuat otomatis)

### 4c. Aktifkan App Engine
```bash
# Pilih region (pilih satu, tidak bisa diubah!)
gcloud app create --region=asia-southeast2
```

### 4d. Deploy ke App Engine
```bash
gcloud app deploy app.yaml --quiet
```

### 4e. Buka URL Frontend
```bash
gcloud app browse
# atau akses langsung: https://YOUR_PROJECT_ID.appspot.com
```

---

## LANGKAH 5 — Update CORS Backend (Opsional)

Setelah dapat URL App Engine, update env var backend:
```bash
gcloud run services update notes-backend \
  --region asia-southeast2 \
  --set-env-vars="FRONTEND_URL=https://YOUR_PROJECT_ID.appspot.com"
```

---

## Pengujian

### Test Backend via Postman / REST Client

| Method | URL | Body |
|--------|-----|------|
| GET | `https://BACKEND_URL/api/health` | — |
| GET | `https://BACKEND_URL/api/notes` | — |
| POST | `https://BACKEND_URL/api/notes` | `{"judul":"Test","isi":"Isi catatan"}` |
| PUT | `https://BACKEND_URL/api/notes/1` | `{"judul":"Edit","isi":"Isi baru"}` |
| DELETE | `https://BACKEND_URL/api/notes/1` | — |

### Test Frontend
1. Buka `https://YOUR_PROJECT_ID.appspot.com`
2. Coba tambah catatan baru
3. Coba edit catatan
4. Coba hapus catatan
5. Verifikasi data di phpMyAdmin

---

## Ringkasan File Konfigurasi

| File | Service | Keterangan |
|------|---------|------------|
| `backend/Dockerfile` | Cloud Run | Build image Express.js |
| `backend/.dockerignore` | Cloud Run | Exclude file tidak perlu |
| `frontend/app.yaml` | App Engine | Konfigurasi static file |

---

## Troubleshooting

**Error CORS**: Pastikan URL App Engine sudah ditambahkan ke `FRONTEND_URL` env var Cloud Run.

**Error DB Connection**: Periksa `DB_NAME` sudah sesuai NIM dan database sudah dibuat di phpMyAdmin.

**Error 403 Cloud Run**: Tambahkan flag `--allow-unauthenticated` saat deploy.

**Port Error**: Cloud Run otomatis inject `PORT=8080`, pastikan `server.js` membaca `process.env.PORT`.
