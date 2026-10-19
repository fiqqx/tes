# Menjalankan GDD dan prototype

1. Ekstrak seluruh paket ZIP ke satu folder.
2. Windows: instal Python 3 lalu klik `MULAI-WINDOWS.bat`. macOS/Linux: jalankan `python3 jalankan.py` dari folder proyek.
3. Browser membuka game solo yang sudah ada. Untuk lab baru, ganti path alamat menjadi `/progression-lab.html` pada host dan port yang sama.
4. Baca `docs/AETHERIA-GDD.md` untuk desain lengkap, rumus, tabel, dan arsitektur produksi.

Contoh alamat lokal setelah server menyatakan port 8000: `http://127.0.0.1:8000/progression-lab.html`.

Lab memakai resource uji, RNG browser, dan data sesi terpisah. Reset lab hanya menghapus percobaan sesi lab; save game utama tetap tersimpan di browser. Tiga equipment contoh mulai U40/+4 agar risiko Refine dapat langsung diuji.

Alur eksperimen: Upgrade +1 → coba Refine normal/proteksi/Safe → bila damaged gunakan duplikat uji untuk repair → roll Enchant Lumina → kunci satu slot → pindah Emberfall → bandingkan tiga party MVP. Tombol rare drop memakai gate 1%; tombol tes penerima mengasumsikan rare sudah muncul dan dilabeli sebagai simulasi bersyarat.

Modul: `systems/equipment-progression.js` berisi Equipment, UpgradeSystem, RefineSystem, EnchantSystem, MVPDropCalculator. Komentar fungsi utama dan contoh pemakaian tersedia di modul/GDD. Node.js hanya diperlukan untuk menjalankan unit test:

```sh
node tests/progression.test.cjs
node tests/engine.test.cjs
node tests/daily.test.cjs
```

Ini prototype aturan dan UI; game 3D online, profession, Exchange, spawn server, dan card skill lengkap memerlukan implementasi lanjutan sesuai GDD. Versi ini tidak mengubah tabel progression demo solo atau salinan ZIP yang sebelumnya diunggah ke GitHub.
