/* ===================================================
   CatatanKu — app.js
   Komunikasi dengan Express.js backend API
=================================================== */

const API_BASE = 'http://localhost:3000/api';

let editId = null;
let hapusId = null;

// ── Utility ──────────────────────────────────────

function formatTanggal(isoString) {
  const d = new Date(isoString);
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function tampilAlert(pesan, tipe = 'success') {
  const box = document.getElementById('alertBox');
  box.textContent = pesan;
  box.className = `alert ${tipe}`;
  box.style.display = 'block';
  setTimeout(() => { box.style.display = 'none'; }, 3500);
}

function setLoadingButton(loading) {
  const btn = document.getElementById('btnSimpan');
  btn.disabled = loading;
  btn.innerHTML = loading
    ? '<span class="btn-icon">⏳</span> Menyimpan…'
    : '<span class="btn-icon">＋</span> Simpan Catatan';
}

// ── Fetch semua catatan ───────────────────────────

async function muatCatatan() {
  const grid    = document.getElementById('notesGrid');
  const loading = document.getElementById('loadingState');
  const empty   = document.getElementById('emptyState');
  const count   = document.getElementById('notesCount');

  grid.innerHTML = '';
  loading.style.display = 'block';
  empty.style.display   = 'none';

  try {
    const res  = await fetch(`${API_BASE}/notes`);
    const json = await res.json();
    loading.style.display = 'none';

    if (!json.success || json.data.length === 0) {
      empty.style.display = 'block';
      count.textContent   = '0 catatan';
      return;
    }

    count.textContent = `${json.data.length} catatan`;

    json.data.forEach((note, i) => {
      const card = document.createElement('div');
      card.className = 'note-card';
      card.style.animationDelay = `${i * 0.06}s`;
      card.innerHTML = `
        <div class="note-card-header">
          <div class="note-judul">${escapeHTML(note.judul)}</div>
          <div class="note-actions">
            <button class="btn btn-edit" onclick="mulaiEdit(${note.id}, \`${escapeAttr(note.judul)}\`, \`${escapeAttr(note.isi)}\`)">✏️ Edit</button>
            <button class="btn btn-hapus" onclick="konfirmasiHapus(${note.id})">🗑️</button>
          </div>
        </div>
        <div class="note-isi">${escapeHTML(note.isi)}</div>
        <div class="note-footer">
          <span class="note-date">🕒 ${formatTanggal(note.tanggal_dibuat)}</span>
        </div>
      `;
      grid.appendChild(card);
    });

  } catch (err) {
    loading.style.display = 'none';
    empty.style.display   = 'block';
    empty.querySelector('p').innerHTML = '⚠️ Gagal memuat catatan.<br/>Pastikan server backend berjalan.';
    console.error(err);
  }
}

// ── Tambah / Edit catatan ─────────────────────────

async function simpanCatatan() {
  const judul = document.getElementById('inputJudul').value.trim();
  const isi   = document.getElementById('inputIsi').value.trim();

  if (!judul) return tampilAlert('Judul tidak boleh kosong!', 'error');
  if (!isi)   return tampilAlert('Isi catatan tidak boleh kosong!', 'error');

  setLoadingButton(true);

  try {
    const url    = editId ? `${API_BASE}/notes/${editId}` : `${API_BASE}/notes`;
    const method = editId ? 'PUT' : 'POST';

    const res  = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ judul, isi }),
    });
    const json = await res.json();

    if (json.success) {
      tampilAlert(json.message, 'success');
      resetForm();
      await muatCatatan();
    } else {
      tampilAlert(json.message || 'Terjadi kesalahan', 'error');
    }
  } catch (err) {
    tampilAlert('Gagal terhubung ke server.', 'error');
    console.error(err);
  } finally {
    setLoadingButton(false);
  }
}

// ── Edit ──────────────────────────────────────────

function mulaiEdit(id, judul, isi) {
  editId = id;
  document.getElementById('inputJudul').value = judul;
  document.getElementById('inputIsi').value   = isi;
  document.getElementById('formLabel').textContent = '✏️ Edit Catatan';
  document.getElementById('btnSimpan').innerHTML = '<span class="btn-icon">💾</span> Perbarui';
  document.getElementById('btnBatal').style.display = 'inline-flex';

  document.querySelector('.form-panel').scrollIntoView({ behavior: 'smooth', block: 'center' });
  document.getElementById('inputJudul').focus();
}

function batalEdit() {
  resetForm();
  tampilAlert('Edit dibatalkan.', 'error');
}

function resetForm() {
  editId = null;
  document.getElementById('inputJudul').value = '';
  document.getElementById('inputIsi').value   = '';
  document.getElementById('formLabel').textContent = 'Catatan Baru';
  document.getElementById('btnSimpan').innerHTML = '<span class="btn-icon">＋</span> Simpan Catatan';
  document.getElementById('btnBatal').style.display = 'none';
}

// ── Hapus ─────────────────────────────────────────

function konfirmasiHapus(id) {
  hapusId = id;
  const overlay = document.getElementById('modalOverlay');
  overlay.classList.add('active');

  document.getElementById('btnKonfirmasiHapus').onclick = async () => {
    tutupModal();
    await hapusCatatan(hapusId);
  };
}

function tutupModal() {
  document.getElementById('modalOverlay').classList.remove('active');
  hapusId = null;
}

async function hapusCatatan(id) {
  try {
    const res  = await fetch(`${API_BASE}/notes/${id}`, { method: 'DELETE' });
    const json = await res.json();

    if (json.success) {
      tampilAlert(json.message, 'success');
      await muatCatatan();
    } else {
      tampilAlert(json.message || 'Gagal menghapus.', 'error');
    }
  } catch (err) {
    tampilAlert('Gagal terhubung ke server.', 'error');
    console.error(err);
  }
}

// ── Security helpers ──────────────────────────────

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(str) {
  return String(str).replace(/`/g, '\\`').replace(/\$/g, '\\$');
}

// ── Keyboard shortcut ─────────────────────────────
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') simpanCatatan();
  if (e.key === 'Escape') { batalEdit(); tutupModal(); }
});

// ── Init ──────────────────────────────────────────
muatCatatan();
