# Download paket GDD dan prototype terbaru

[**Unduh aetheria-gdd-prototype.zip**](https://github.com/fiqqx/tes/raw/refs/heads/downloads/aetheria-gdd-156eb80a/aetheria-gdd-prototype.zip) — 3,26 MB.

Ekstrak seluruh ZIP terlebih dahulu. Windows: instal Python 3 bila belum ada, lalu klik dua kali `MULAI-WINDOWS.bat`. macOS/Linux: jalankan `python3 jalankan.py` dari folder hasil ekstraksi.

Buka `http://127.0.0.1:8000/progression-lab.html` untuk lab Upgrade/Refine/Enchant/MVP. Halaman `http://127.0.0.1:8000/` menampilkan game solo utama. Biarkan terminal terbuka selama bermain. Tidak perlu npm atau database untuk menjalankan aplikasi.

[GDD lengkap](docs/AETHERIA-GDD.md) · [Panduan prototype](docs/PROTOTYPE-README.md) · [Modul sistem](systems/equipment-progression.js)

SHA-256 ZIP: `156eb80a4bc323a5454e27d38ee73e1a60c6f17bf4501d6fcf036a211d7f412f`

---

# Aetheria Chronicles

RPG fantasi orisinal berbasis browser, terinspirasi mekanik MMORPG. Mainkan petualangan solo dengan ilustrasi dunia dan boss lokal, tanpa instalasi package atau koneksi ke layanan eksternal.

## Menjalankan

Ekstrak seluruh ZIP, lalu jalankan server lokal dengan salah satu cara berikut.

Untuk autosave dengan alamat yang konsisten, gunakan server lokal:

- **Windows:** instal Python 3, lalu klik dua kali `MULAI-WINDOWS.bat`.
- **macOS / Linux:** dari folder game jalankan `python3 jalankan.py`.

Browser terbuka otomatis pada `http://127.0.0.1:8000/`. Biarkan terminal terbuka selama bermain; tekan Ctrl+C untuk berhenti. Jika port terpakai, gunakan `python3 jalankan.py --port 8001` (Windows: `py -3 jalankan.py --port 8001`).

Tidak ada proses build atau package tambahan. Sebagai alternatif, `index.html` dapat dibuka langsung jika browser mengizinkan file lokal; penyimpanan progres dari file lokal bisa berbeda antarbrowser. Petunjuk lengkap tersedia di `PANDUAN.txt`.

## Fitur

- Tiga wilayah petualangan dengan batas level, EXP, Zeny, dan material.
- Enam equipment terpasang dengan stat yang memengaruhi combat power.
- Refinement hingga +15, peluang sukses, biaya material, serta Protection Stone.
- Tiga MVP dengan pertarungan berbasis giliran, cooldown skill, critical hit, healing, potion, dan reward.
- Quest harian yang direset setiap hari UTC dan achievement dengan hadiah sekali klaim.
- Merchant, welcome mail, kontribusi guild companion, dan peringkat lokal.
- Nama karakter yang bisa diubah, ekspor save, reset progres, dan autosave di `localStorage`.
- Tampilan responsif, navigasi keyboard, dan dukungan reduced motion.

Mulai dari **Adventure** untuk mengumpulkan bekal, buka **Refinement** untuk meningkatkan equipment, lalu tantang **Verdant Warden** di **MVP Hunt**. Ambil reward melalui **Quest Log** dan surat di bagian atas layar.

Progres tersimpan per browser pada key `aetheria-save-v1`. Gunakan browser dan alamat (termasuk port) yang sama untuk melanjutkan. Ekspor save lewat profil sebelum menghapus data browser; ekspor menyediakan backup JSON dan belum dilengkapi fitur impor. Guild dan peringkat menggunakan companion NPC lokal; game ini tidak menggunakan server multiplayer.

## Validasi

```sh
node --check engine.js
node --check script.js
node tests/engine.test.cjs
node tests/daily.test.cjs
```

Engine dapat diuji menggunakan penyimpanan, waktu, dan random number generator yang diinjeksi. Pengujian browser saat pengembangan memverifikasi eksplorasi, quest, achievement, refine, pembelian, mail, combat MVP, mundur, guild, persistensi progres, dan navigasi ponsel.

## Struktur

- `index.html` — kerangka aplikasi.
- `styles.css` — layout, tema, dan komponen responsif.
- `engine.js` — state, aturan game, dan penyimpanan.
- `script.js` — tampilan, navigasi, dialog, dan interaksi.
- `assets/` — ilustrasi dunia, boss, dan equipment orisinal.


## GDD dan lab progression versi baru

[GDD lengkap](docs/AETHERIA-GDD.md) menjelaskan rancangan MMORPG 3D, probabilitas, ekonomi, dan target balancing orisinal.

Setelah menjalankan server, buka `progression-lab.html` pada alamat yang sama. Lab mandiri memperagakan Upgrade 100%, Refine +15 dengan damage/repair, Safe Refine, dua jenis proteksi, Enchant tiga slot dengan lock, serta kalkulator drop MVP berbobot kontribusi. Saldo lab adalah resource simulasi dan tidak mengubah save game utama.

Kode ada di `systems/equipment-progression.js`, dengan ekspor browser dan CommonJS. Uji modul menggunakan:

```sh
node tests/progression.test.cjs
```

Angka lab/GDD adalah rancangan baru dan belum dimigrasikan ke engine demo solo. Life skills, Exchange, socket skill kartu, dan server 3D masih berupa spesifikasi GDD.
