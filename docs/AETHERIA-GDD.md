# Aetheria Chronicles — Game Design Document

**Versi:** 0.2, rancangan untuk vertical slice dan pengujian ekonomi.  
**Genre:** MMORPG 3D anime fantasy, real-time combat, open-field cooperative bosses.  
**Platform target:** Android/iOS dan PC; cross-play dengan server regional.  
**Status angka:** Seluruh angka, resep, drop rate, serta nama dunia di bawah adalah usulan balancing orisinal. Dokumen ini tidak mengklaim formula resmi *Ragnarok X: Next Generation*. Lumina, Emberfall, dan Frostveil berfungsi sebagai kota stat dasar, persentase, dan stat spesialis.

## 1. Visi, pemain, dan batas implementasi

Pemain menjadi pengelana yang menumbuhkan karakter lewat petualangan sosial, pekerjaan produksi, serta keputusan investasi equipment. Gaya visual berupa karakter anime berproporsi ringan, siluet kelas terbaca, lingkungan cel-shaded yang hangat, dan efek skill yang tetap terbaca pada layar ponsel.

**Janji pengalaman:** setiap sesi memberi progres pasti, setiap build memiliki pilihan, dan kemenangan boss merupakan hasil kontribusi seluruh party.

| Pilar desain | Keputusan sistem | Indikator keberhasilan awal |
|---|---|---|
| Progres harian dapat diprediksi | Upgrade 100%, quest, token boss | Pemain bisa merencanakan satu milestone mingguan tanpa rare drop |
| Build lebih penting daripada satu angka power | Enchant, card, class synergy | Minimal tiga build layak per kelas dalam playtest endgame |
| Kerja sama bernilai | Skor MVP damage/tank/healing | Party support kompetitif tanpa harus mengejar last hit |
| Dunia membutuhkan profesi | Hasil gathering dipakai di tiga pilar gear | Seluruh profesi memiliki pembeli dan kegunaan internal |
| Ekonomi dapat dijelaskan | Mata uang terpisah, escrow, tax, harga terikat referensi | Setiap Crystal masuk/keluar bisa ditelusuri dari ledger |

Target sesi aktif 30–60 menit/hari, dengan AFK terukur sebagai pelengkap. Mode portrait tidak menjadi target vertical slice; landscape menggunakan joystick kiri, target lock, skill kanan, dan dodge. PC menggunakan WASD/mouse serta hotkey 1–6. Target awal 30 FPS pada perangkat minimum yang ditentukan lewat profiling; 60 FPS menjadi opsi, bukan jaminan sebelum diuji.

Ruang lingkup vertical slice: satu kota, satu field, lima kelas, enam slot gear, satu MVP, satu Mini, empat life skills, dan Exchange terbatas material. Target produksi diperluas setelah loop serta ekonomi tervalidasi. Dokumen ini mendesain game 3D online; aplikasi Aetheria yang sudah ada adalah demo solo Web. Modul baru yang menyertai GDD merupakan simulasi aturan, bukan server MMO atau konversi demo menjadi game 3D.

## 2. Kelas, combat, dan loop

| Kelas orisinal | Peran | Stat utama | Kontribusi khas |
|---|---|---|---|
| Vanguard | Tank / melee | STR, VIT | Mitigasi, penjagaan target boss |
| Arcanist | Ranged magic | INT, DEX | Burst AoE, elemental counter |
| Ranger | Ranged physical | DEX, AGI | Damage berkelanjutan dan interrupt |
| Shade | Melee burst | STR, AGI, LUK | Damage pada fase lemah, reposition |
| Luminary | Healer / support | INT, VIT, DEX | Effective heal, cleanse, shield |

Base level target 1–99; job progression menggunakan cabang skill dan role, bukan pengali damage tanpa batas. Gear level tidak menggantikan level karakter. Rasio damage/defense dan HP boss ditentukan dari target *time to kill* (TTK), bukan hanya combat power.

Contoh formula combat yang mudah dituning:

```text
Damage non-critical = floor(max(1, SkillCoefficient × ATK × 1000/(1000 + DEF_target)
                                × ElementMultiplier))
Damage critical     = floor(Damage non-critical × (1.50 + CritDamageBonus))
AttackRate           = min(2.5, 1 + AGI/200) serangan per detik
CastTime             = max(0.30, BaseCastTime / (1 + DEX/150)) detik
```

Semua pengali mempunyai satuan jelas. `CritDamageBonus=0.30` berarti critical 1.80×, bukan 30×. Probabilitas critical memiliki batas desain 60% di PvE dan 40% di PvP; stat yang melebihi batas tidak menciptakan peluang lebih dari 100%. PvP memakai koefisien terpisah, tanpa mengubah stat yang tampil pada gear.

```text
Quest / AFK yang memenuhi syarat
            ↓
Odin + Zeny + EXP       Pertarungan biasa / boss
            ↓                    ↓
Kill ber-Odin → Stamina     Card / token / material
            ↓                    ↓
Mining + Fishing + Gardening → Smelting
            ↓
Upgrade pasti → Enchant build → Refine berisiko
            ↓
Awakening + sinergi card → field dan boss lebih menantang
            ↓
Jual surplus di Exchange → beli kebutuhan build → ulangi
```

## 3. Perbandingan tiga pilar gear

Enam slot wajib untuk Awakening: Weapon, Armor, Shield, Boots, Ring, Necklace. Slot terakhir adalah Accessory untuk aturan biaya; slot armor/shield/boots masuk keluarga Armor. Model kode menggunakan tipe `Weapon`, `Armor`, `Accessory`.

| Aspek | Upgrade / Strengthening | Enchantment | Refine |
|---|---|---|---|
| Tujuan | Kenaikan flat stat yang pasti | Identitas build dan sub-stat | Tambahan persentase pada base gear |
| Batas | Level 0–200 | Tiga slot per item | +0–+15 |
| Peluang | 100% | Weighted RNG pada stat dan nilai | 100% sampai +4, turun sesudahnya |
| Material | Phracon / Oridecon Fragment | Stone dari kota tertentu | Oridecon / Elunium |
| Risiko | Tidak ada kegagalan | Hasil baru dapat kurang cocok | Tetap, turun 1, atau damaged |
| Perlindungan | Tidak diperlukan | Lock satu slot, biaya 2× | Blessed Ore, Protection Stone, Safe Refine |
| Waktu investasi | Fondasi harian | Optimasi menengah/panjang | Pengejaran power opsional jangka panjang |
| Keterikatan | Transfer hanya lewat aturan inheritance | Menempel pada item | Menempel pada item; tidak menghapus Upgrade |

Masing-masing level disimpan terpisah. Upgrade tidak menambah peluang Refine, Enchant tidak mempercepat drop rate card, dan Crystal tidak menjadi syarat untuk progres dasar.

## 4. Urutan perhitungan stat dan Awakening

Untuk satu equipment dan satu stat flat:

```text
GearFlat(U)        = BaseStat + UpgradeGrowth × U
R(r)               = 0.03r + 0.003r²
GearRefined        = GearFlat(U) × (1 + R(r))
FlatSubtotal       = CharacterBase + ΣGearRefined + EnchantFlat + CardFlat
FinalStat          = floor(FlatSubtotal × (1 + AwakeningBonus) × (1 + ΣPercentBonus))
```

`R(0)=0`, `R(4)=0.168`, `R(8)=0.432`, `R(12)=0.792`, `R(15)=1.125`. Refine +15 berarti **tambahan 112.5%**, sehingga gear menjadi 2.125×, bukan 112.5×. Stat persentase Enchant/Card dijumlah dalam bucket yang sama; tidak dikalikan berulang per slot. Card skill proc diproses pada combat event terpisah.

Contoh pertumbuhan Weapon: Base ATK 200 dan `UpgradeGrowth.ATK=3`. Armor dapat memakai DEF 2/level dan HP 20/level; Accessory ATK 1 atau DEF 1/level sesuai template. Angka pertumbuhan adalah data template, bukan hardcode menurut nama item.

Awakening menggunakan **minimum Upgrade dari keenam slot wajib**, bukan rata-rata. Slot kosong dihitung level 0. Hanya tier tertinggi aktif dan berlaku pada ATK/DEF/HP flat subtotal, bukan pada CRIT, kecepatan, atau probabilitas drop.

| Minimum keenam slot | Awakening | Bonus total yang aktif |
|---:|---|---:|
| 0–39 | Belum aktif | 0% |
| 40 | Tier I | 2% |
| 80 | Tier II | 5% |
| 120 | Tier III | 8% |
| 160 | Tier IV | 12% |
| 200 | Tier V | 16% |

Contoh: enam slot semuanya ≥80, Weapon U80 dan Refine +8, CharacterBase ATK 300, total bonus Enchant flat 30 ATK, Card flat 20 ATK, dan persentase dari Enchant/Card 12%:

```text
WeaponFlat = 200 + 3×80 = 440
WeaponRefined = 440 × 1.432 = 630.08
ATK = floor((300 + 630.08 + 30 + 20) × 1.05 × 1.12) = 1,152
```

Contoh sengaja hanya memuat satu kontribusi gear ATK agar urutan terlihat. Dalam permainan, semua slot dihitung. Pembulatan dilakukan pada hasil akhir; persen disimpan sebagai pecahan desimal (`0.025=2.5%`). Batas awal bonus bucket ATK 100% dan HP 150%; nilai batas ditampilkan dalam UI agar pemain tidak membeli stat yang tidak lagi efektif.

## 5. Upgrade / Strengthening

Target level berikutnya disebut `n = U+1`:

```text
Material(n) = 2 + floor((n-1)/20)
Zeny(n)     = 100 + 20n
P(sukses)   = 1
```

Weapon menggunakan Oridecon Fragment; Armor dan Accessory menggunakan Phracon. Fragment dan Refined Oridecon adalah item berbeda: fragment mempunyai suplai murah untuk jalur pasti; Oridecon langka diperlukan untuk Refine. Smelting dapat menghasilkan keduanya dari resep yang berbeda.

| Target Upgrade | Material satu langkah | Zeny satu langkah | Contoh Weapon ATK setelah Upgrade, sebelum Refine |
|---:|---:|---:|---:|
| 1 | 2 | 120 | 203 |
| 40 | 3 | 900 | 320 |
| 80 | 5 | 1,700 | 440 |
| 120 | 7 | 2,500 | 560 |
| 160 | 9 | 3,300 | 680 |
| 200 | 11 | 4,100 | 800 |

Dari U0 ke U40 satu item membutuhkan 100 material dan 20,400 Zeny; enam item membutuhkan **600 material + 122,400 Zeny**. Semua item U200 membutuhkan **7,800 material + 2,532,000 Zeny**. Ini jumlah kumulatif, bukan biaya satu klik.

UI menyediakan +1 dan rencana target yang memperlihatkan seluruh biaya sebelum konfirmasi. Bulk Upgrade berhenti atomik jika target keseluruhan tidak mampu dibayar, atau meminta pemain memilih target lebih rendah. Equipment damaged harus diperbaiki sebelum Upgrade. Penggantian template dapat memakai inheritance satu arah dengan biaya tetap dan hanya antar tier/kategori yang kompatibel; konversi tersebut merupakan fitur produksi, belum terdapat dalam modul contoh.

## 6. Enchantment

Tiga slot Enchant diacak independen. Stat sama boleh muncul lebih dari sekali; persentasenya dijumlah. Pilihan kota memengaruhi pool pada slot yang diacak, sedangkan slot yang dikunci mempertahankan stat, nilai, dan kota asalnya.

| Kota / identitas | Pool | Bobot pilihan stat | Rentang nilai per slot |
|---|---|---|---|
| Lumina / fondasi | STR, AGI, VIT, INT, DEX, LUK | Masing-masing 1/6 | Integer 1–12 |
| Emberfall / persentase | ATK%, HP%, Crit DMG% | 45%, 30%, 25% | 0.5–3%; 1–5%; 1–6% |
| Frostveil / spesialis, fase produksi | Haste, PEN, status resist | Pool per equipment | Ditetapkan setelah playtest, belum di modul |

Nilai persentase Emberfall memiliki langkah 0.1 poin persentase (`0.001`); ujung bawah/atas termasuk. Pemilihan stat lebih dahulu memakai weighted RNG, kemudian nilai dipilih uniform dalam rentang stat tersebut. Tidak semua nilai lintas stat mempunyai probabilitas yang sama karena jumlah nilai dan bobot berbeda.

Biaya satu reroll normal: 5 Stone kota terpilih + 5,000 Zeny. Mengunci **maksimal satu slot yang telah terisi** membuat biaya menjadi 10 Stone + 10,000 Zeny untuk mengacak dua slot lainnya. Lock dipilih untuk percobaan itu, bukan pembelian status permanen. Semua input dan saldo diperiksa sebelum debit; hasil mengganti slot yang tidak dikunci saat transaksi selesai. Tidak ada konsumsi ketika permintaan ditolak.

Contoh probabilitas mendapatkan minimal satu `DEX≥10` dari tiga slot Lumina:

```text
p_satu_slot = (1/6) × (3/12) = 1/24
p_minimal_satu_dari_3 = 1 - (23/24)³ = 11.9864%
E(reroll sampai cocok) = 1/p = 8.3428
E(biaya) ≈ 41.714 Stone + 41,714 Zeny
```

Ini **rata-rata percobaan independen tanpa batas**, bukan jaminan maksimal sembilan kali. Jika satu slot dikunci dan pemain mencari `AGI≥10` pada dua slot tersisa, peluangnya `1-(23/24)²=8.1597%`, rata-rata 12.2553 percobaan, dengan 10 Stone per percobaan. Target dua stat tertentu dan optimasi nilai maksimal mempunyai ekspektasi berbeda; kalkulator UI harus menyebut target yang dihitung.

## 7. Refine: peluang, perlindungan, dan repair

Target `n=r+1`. Setiap percobaan normal menggunakan `ceil(n/2)` Oridecon untuk Weapon atau Elunium untuk Armor/Accessory, serta `10,000n²` Zeny. Maksimum +15; permintaan setelah maksimum ditolak sebelum biaya dipotong.

| Target | P(sukses) | Ore/percobaan | Zeny/percobaan |
|---:|---:|---:|---:|
| +1 | 100% | 1 | 10,000 |
| +2 | 100% | 1 | 40,000 |
| +3 | 100% | 2 | 90,000 |
| +4 | 100% | 2 | 160,000 |
| +5 | 50% | 3 | 250,000 |
| +6 | 40% | 3 | 360,000 |
| +7 | 30% | 4 | 490,000 |
| +8 | 25% | 4 | 640,000 |
| +9 | 20% | 5 | 810,000 |
| +10 | 15% | 5 | 1,000,000 |
| +11 | 12% | 6 | 1,210,000 |
| +12 | 10% | 6 | 1,440,000 |
| +13 | 8% | 7 | 1,690,000 |
| +14 | 6% | 7 | 1,960,000 |
| +15 | 5% | 8 | 2,250,000 |

Setelah roll sukses gagal, lakukan roll **bersyarat pada kegagalan**:

| Target | Tetap | Turun satu level | Damaged | Jumlah |
|---|---:|---:|---:|---:|
| +5–+8 | 70% | 25% | 5% | 100% dari kegagalan |
| +9–+12 | 55% | 35% | 10% | 100% dari kegagalan |
| +13–+15 | 40% | 45% | 15% | 100% dari kegagalan |

Ketiga outcome tersebut saling eksklusif. Gagal damaged mempertahankan refine saat ini; gagal downgrade mengurangi tepat satu level. Material dan Zeny tetap dikonsumsi pada semua outcome percobaan yang sah.

Contoh target +9: sukses 20%, tetap `80%×55%=44%`, turun `80%×35%=28%`, damaged `80%×10%=8%`. **Peluang damaged bukan 10% dari seluruh percobaan.**

| Opsi pada target +9 | Sukses | Tetap | Turun | Damaged | Biaya tambahan |
|---|---:|---:|---:|---:|---|
| Normal | 20% | 44% | 28% | 8% | Tidak ada |
| Blessed Ore | 20% | 72% | 0% | 8% | 1 Blessed Ore |
| Protection Stone | 20% | 52% | 28% | 0% | 1 Protection Stone |
| Keduanya | 20% | 80% | 0% | 0% | Masing-masing 1 |
| Safe Refine | Tidak tersedia untuk +9 | — | — | — | Hanya target +5–+8 |

Blessed Ore **hanya** mengalihkan downgrade menjadi tetap. Protection Stone **hanya** mengalihkan damaged menjadi tetap. Keduanya tidak menambah peluang sukses. Item perlindungan ikut dikonsumsi meskipun sukses karena dipasang untuk percobaan, dan biaya ini ditampilkan sebelum klik.

### 7.1 Safe Refine

Jalur deterministic tersedia pada **target +5, +6, +7, +8**:

```text
SafeMultiplier(n) = ceil(2 / P_success(n))
SafeCost(n) = NormalCost(n) × SafeMultiplier(n)
P_success_safe = 1
```

| Target | Multiplier | Ore total | Zeny total |
|---:|---:|---:|---:|
| +5 | 4× | 12 | 1,000,000 |
| +6 | 5× | 15 | 1,800,000 |
| +7 | 7× | 28 | 3,430,000 |
| +8 | 8× | 32 | 5,120,000 |

Safe Refine tidak mengonsumsi Blessed Ore/Protection Stone; UI menonaktifkan kedua toggle saat safe aktif. Pemain membayar premium resource untuk menghindari varians. Target +1–+4 sudah pasti dan tidak memerlukan resep safe; +9–+15 mempertahankan RNG sebagai pengejaran opsional endgame.

### 7.2 Status damaged dan repair

Item damaged masih boleh dipakai dengan stat yang sama, tetapi tidak dapat di-Upgrade, di-Refine, atau di-Enchant. Status tidak menjadi kerusakan permanen dan tidak menghapus card.

Repair membutuhkan satu duplikat **templateId sama**, instance berbeda, belum bound, U0/+0, tidak damaged, tanpa Enchant dan Card; semua investasi duplikat harus kosong. Duplikat dikonsumsi, dan biaya repair `25,000×r` Zeny. Target item mempertahankan Upgrade, Refine, Enchant, Card, serta binding sebelumnya. Duplikat hanya dikonsumsi jika seluruh validasi berhasil. Sistem produksi wajib mengunci kedua item dalam satu transaksi.

### 7.3 Ekspektasi yang benar

Jika kedua perlindungan digunakan sehingga level tidak bisa turun dan damage tidak terjadi, percobaan independen memiliki distribusi geometrik:

```text
P(berhasil ≤k percobaan) = 1-(1-p)^k
E(percobaan) = 1/p
k_95 = ceil(log(0.05)/log(1-p))
```

| Target | p | Rata-rata percobaan | Percobaan untuk peluang kumulatif ≥95% | Mean Zeny normal, tanpa biaya perlindungan |
|---:|---:|---:|---:|---:|
| +5 | 0.50 | 2 | 5 | 500,000 |
| +8 | 0.25 | 4 | 11 | 2,560,000 |
| +12 | 0.10 | 10 | 29 | 14,400,000 |
| +15 | 0.05 | 20 | 59 | 45,000,000 |

Angka 95% bukan pity/garansi: masih ada 5% pemain yang memerlukan lebih banyak percobaan. Untuk +4→+8 pada satu item dengan perlindungan penuh: rata-rata 11.833 percobaan, 42.833 ore, dan 5,593,333 Zeny, belum termasuk 11.833 unit masing-masing perlindungan.

**Jangan menggunakan `1/p` untuk perjalanan yang bisa downgrade.** Contoh model Markov, dengan `E_N=0` sebagai target final dan damaged langsung diperbaiki untuk kembali ke state r:

```text
E_r = 1 + p_r E_(r+1)
          + (1-p_r) [q_stay E_r + q_down E_(r-1) + q_damage E_r]
```

Ini menghitung jumlah percobaan; waktu menunggu duplikat dan biaya repair ditambahkan terpisah. Untuk target +9 dengan Blessed Ore saja, downgrade hilang tetapi damage masih mungkin: expected repair per sukses = `(1-.2)×.10/.2=.4` duplikat. Biaya ekspektasi berbeda lagi jika duplikat dibeli di pasar. UI tidak boleh menjanjikan total biaya berdasarkan satu mean tanpa menjelaskan asumsi.


## 8. Card, slot equipment, dan distribusi drop

Seluruh angka berikut merupakan rancangan awal **Aetheria**, bukan angka resmi Ragnarok X. Kartu menghadirkan pilihan build horizontal: pemain dapat mengejar Crit, ketahanan elemen, pemulihan, atau skill situasional. Kartu tidak boleh menghapus kebutuhan positioning, kerja sama, dan membaca telegraph boss.

| Kategori | Contoh orisinal | Efek awal | Batas keseimbangan |
|---|---|---|---|
| Normal | Mossling, hutan Lumina | +12 STR atau +2% resist Earth | Efek khusus satu kategori equipment |
| Mini | Ember Lynx, Emberfall | Setelah menghindari serangan, +6% Crit selama 5 detik | Cooldown internal 20 detik |
| MVP | Frostveil Sovereign | Membuka skill aktif Ice Ward: barrier 12% Max HP selama 4 detik | Cooldown 60 detik; maksimal satu skill kartu MVP aktif |

Equipment memiliki 1–2 slot sesuai definisi item. Slot bukan tambahan acak dari top-up. Kartu harus sesuai slot, misalnya Weapon, Armor, atau Accessory; duplikat kartu dengan `uniqueGroup` sama tidak menumpuk. Dua bonus +2% Crit dari kelompok berbeda memberi +4 **poin persentase** Crit, sedangkan bonus +10% ATK mengikuti kelompok multiplier ATK dalam rumus combat, bukan mengalikan setiap sumber secara terpisah. Cap Crit awal 60% PvE dan 40% PvP; ketahanan elemen 60%.

Memasang kartu mengikat kartu ke akun. Pelepasan menggunakan NPC dengan tarif awal 2.000 Crystal dan mengembalikan kartu utuh ke inventori; penggantian tidak menghancurkan kartu tanpa pilihan eksplisit. Kartu yang telah terikat tidak dapat diperdagangkan kembali. Equipment dengan kartu terpasang juga tidak dapat dijual di Exchange.

### 8.1 Probabilitas yang dapat diaudit

| Sumber | Peluang awal | Siapa menerima | Kelangkaan hasil |
|---|---:|---|---|
| Monster normal | 0,02% per kill personal yang memenuhi syarat | Roll personal independen untuk setiap peserta yang memenuhi syarat | Normal |
| Mini | 2% per kematian boss | Maksimal satu hadiah langka dunia, lalu pemenang ditimbang berdasarkan kontribusi | Mini |
| MVP | 1% per kematian boss | Maksimal satu hadiah langka dunia, lalu pemenang ditimbang berdasarkan kontribusi | MVP |

Pada monster normal, jarak level maksimal ±10, berada dalam area encounter, dan berpartisipasi melalui damage, tanking sah, atau support efektif. Kill anggota party dapat memberi hak roll personal bila persyaratan tersebut dipenuhi. Odin tidak mengalikan peluang kartu. Loot biasa, EXP, dan token memakai tabel terpisah sehingga kegagalan drop kartu tetap menghasilkan progres.

Untuk peluang konstan $p$, jumlah kill hingga keberhasilan pertama mengikuti distribusi geometrik:

\[
E[N]=\frac1p,\quad P(N\le n)=1-(1-p)^n,\quad
n_q=\left\lceil\frac{\ln(1-q)}{\ln(1-p)}\right\rceil.
\]

Pada $p=0,0002$, rata-rata adalah **5.000 kill**, median **3.466 kill**, dan peluang setidaknya satu kartu mencapai sekitar 95% setelah **14.978 kill**. Ini bukan jaminan pada kill tersebut. Drop normal tidak menggunakan pity tersembunyi. Kartu spesifik dalam pool tambahan dengan bobot $q_k$ memiliki peluang akhir $p q_k$; UI menampilkan perbedaan peluang kategori dan item spesifik.

Boss memberi token deterministik personal: contoh Mini 5 token dan MVP 10 token bagi setiap peserta yang memenuhi syarat, terpisah dari roll langka. 300 token Mini dapat ditukar kartu Mini pilihan yang terikat akun; 1.000 token MVP ditukar kartu MVP utilitas pilihan. Koleksi bergengsi dapat tetap hanya berasal dari drop, tetapi jangan menempatkan skill wajib raid di koleksi tersebut. Tidak ada pity langka bersama yang dapat dinaikkan kelompok lalu direbut kelompok lain.

## 9. MVP dan Mini di open field

### 9.1 Spawn, encounter, dan anti-exploit

| Parameter | Mini | MVP |
|---|---:|---:|
| Waktu respawn sejak kematian | Uniform 25–35 menit | Uniform 105–135 menit |
| Peringatan map | 2 menit sebelum spawn | 5 menit sebelum spawn |
| Peran contoh | Mengajarkan dodge dan interrupt | Pemeriksaan koordinasi tank, support, DPS |
| Party maksimal | 5 pemain | 5 pemain; beberapa party dapat berpartisipasi |

Server memilih satu offset ketika boss mati dan menyimpan `nextSpawnAt = deathAt + offset` dalam UTC. Restart tidak mengacak ulang timer. Setiap boss memiliki `spawnId` unik per channel dan siklus; unique constraint mencegah dua spawn maupun dua distribusi hadiah. Informasi jadwal yang ditampilkan mengikuti status server, bukan jam perangkat. Perpindahan channel tidak menggandakan hak hadiah untuk identitas encounter yang sama.

Boss memakai leash area 80 meter dan kembali ke titik awal bila di luar batas selama 5 detik. Tanpa target valid selama 15 detik, encounter reset dan HP pulih penuh. Reset membatalkan ledger kontribusi dan tidak memberikan token. Boss tidak dapat ditarik ke NPC penjaga atau zona aman. Pada soft enrage menit ke-8, damage naik 10% per menit; hard reset menit ke-15 menjaga ketersediaan map. Nilai ini harus diuji berdasarkan HP dan DPS target tier, bukan dipakai seragam di semua level.

Keanggotaan party dibekukan ketika pemain pertama kali berkontribusi dalam encounter. Pemain baru tetap dapat bergabung sebagai peserta tanpa mengalihkan kontribusi yang sudah tercatat; pergantian party berlaku pada encounter berikutnya. Penentuan hak drop dilakukan per pemain dahulu, baru skor digabung ke party. Akun AFK tidak ikut menerima hadiah hanya karena berada dalam party.

Peserta harus berada pada area encounter setidaknya 30 detik, hadir dalam 60 detik terakhir sebelum boss mati, dan mencapai **salah satu** ambang: damage ≥0,5% Max HP boss, memperoleh tank credit sah ≥10% Max HP karakter sambil mempertahankan aggro selama minimal min(15 detik, 50% durasi encounter), atau effective healing ≥max(5% damage taken sah party sendiri, 10% Max HP healer). Effective healing harus positif. Ambang berbasis party mencegah semakin banyak peserta dunia menyingkirkan seluruh healer murni. Untuk boss yang mati di bawah 30 detik, syarat durasi menjadi 50% durasi encounter. Angka tersebut adalah titik uji awal; log hasil dibagi per role untuk memastikan support tidak tersisih.

Tank credit berasal dari kemampuan boss/add encounter ketika pemain memegang aggro. Server menghitung damage sebelum mitigasi yang berhasil ditanggung: HP yang hilang + shield yang benar-benar terserap + damage yang dicegah armor/defensive skill, dibatasi raw damage ability tersebut dan dicatat sekali per serangan. Dengan demikian melepas armor tidak menambah kredit. Uptime aggro menjadi filter atribusi, bukan bonus tanpa interaksi. Field `damageTaken` pada kalkulator berarti tank credit yang telah diproses server ini, bukan angka HP hilang mentah. Self-damage, damage antarpemain yang direkayasa, overheal, dan healing di luar encounter tidak dihitung. Healing ditagihkan pada HP yang benar-benar pulih dari damage encounter; shield tidak diberi kredit heal pada saat cast, sehingga memasang shield tanpa penyerapan tidak menghasilkan kontribusi. Memenuhi ambang sekali tidak menghapus pemeriksaan keaktifan di akhir encounter.

### 9.2 Kontribusi dan pemilihan hadiah langka

Untuk party yang memenuhi syarat, definisikan:

\[
C_i=0,45d_i+0,25t_i+0,20h_i+0,07f_i+0,03l_i.
\]

`d`, `t`, dan `h` adalah bagian party dari total damage dealt, tank credit sah, dan effective healing **hanya antarparty yang memenuhi syarat**. `f` dan `l` adalah indikator first/last hit. Jika timestamp server yang sama menghasilkan beberapa pemenang, indikator dibagi rata di antara mereka. First/last hit milik pihak yang tidak memenuhi syarat tidak dialihkan secara fiktif: metrik itu dianggap tidak aktif. Skor tidak pernah memberi seluruh hadiah hanya kepada last hitter.

Jika total suatu metrik nol, bobotnya dinonaktifkan dan bobot aktif dinormalisasi:

\[
C_i=\frac{\sum_{m\in M}w_m x_{i,m}}{\sum_{m\in M}w_m},\quad \sum_i C_i=1.
\]

Contoh: jika tidak ada healing, pembagi bobot adalah 0,80. Ini mencegah 20% peluang hilang. Jika tidak ada peserta sah, tidak ada hadiah yang diterbitkan.

| Party | Damage dealt | Tank credit (`damageTaken`) | Effective healing | First hit | Last hit | Skor |
|---|---:|---:|---:|---:|---:|---:|
| A | 600.000 | 10.000 | 0 | Ya | Tidak | 36,5% |
| B | 300.000 | 60.000 | 20.000 | Tidak | Tidak | 32,5% |
| C | 100.000 | 30.000 | 80.000 | Tidak | Ya | 31,0% |

Party A: $0,45(0,60)+0,25(0,10)+0,20(0)+0,07=0,365$. Setelah gate rare MVP 1% berhasil, satu party dipilih dengan weighted RNG skor tersebut. Peluang tanpa syarat A menerima hadiah rare adalah $1\%\times36,5\%=0,365\%$ per kill. Bila item kartu tertentu memiliki bobot 20% dalam rare pool, peluang kartu itu bagi A adalah 0,073%. Setelah party terpilih, anggota yang memenuhi syarat mendapat roll merata internal satu kali; hasil dan riwayatnya terlihat dalam combat log. Tidak ada roll ulang karena pemain disconnect; hadiah masuk mail.

```text
Boss mati → kunci encounter → validasi peserta → hadiah biasa + token personal
                              ↓
                  satu gate rare per spawn berhasil?
                    tidak → selesai
                    ya → hitung skor → pilih party berbobot
                        → pilih anggota eligible → pilih item rare → kirim sekali
```

## 10. Life Skills, Odin, dan anggaran harian

Odin dan Stamina adalah **dua ledger berbeda**. Odin mendukung aktivitas bertarung; konsumsi Odin menghasilkan Stamina untuk produksi. Produk crafting tidak mengembalikan Odin atau Stamina. Pemain dapat berdagang material sehingga spesialisasi ekonomi tetap layak.

| Ledger | Sumber harian | Batas dan konsumsi |
|---|---|---|
| Odin | 1.200 dari daily quest + 800 dari 30 menit akumulasi aktivitas/AFK tervalidasi di field atau rest hub | Maksimal 2.000 diterbitkan/hari, penyimpanan 4.000 |
| Stamina | 1 per Odin yang benar-benar terpakai, kuota 2.000/hari; quest crafting terpisah 300/hari | Maksimal gabungan 2.300 diterbitkan/hari, penyimpanan 4.600 |

Reset harian terjadi 00:00 UTC; UI mengonversi ke zona pengguna, misalnya 08:00 pada Asia/Singapore atau 07:00 WIB. Saldo lama tetap tersimpan hingga kapasitas, sementara penghitung penerbitan harian direset. Reward daily yang tidak diklaim tidak menumpuk setelah reset. AFK hub menghitung waktu sesi server yang sah dan tidak memerlukan spam input; satu akun hanya menerima satu jatah. Syarat ini berbeda dari kontribusi boss: hadir pasif tidak pernah memberi hak loot boss.

Odin hanya terpakai pada kill normal yang menghasilkan EXP dengan selisih level yang diizinkan. Biaya per monster kecil/sedang/besar adalah 1/2/3 Odin, dikurangi secara atomik hanya bila saldo cukup. Dengan Odin aktif, EXP dan Zeny **total menjadi 5× nilai normal**, bukan normal ditambah 5×. Material, kartu, dan peluang drop langka tetap mengikuti tabel biasa. Odin habis: pemain tetap mendapat EXP/Zeny dasar, tetapi tidak menghasilkan Stamina dari kill tersebut.

Untuk kill berbiaya $c$, dengan saldo $O\ge c$:

\[
O'=O-c,\quad XP'=5XP_0,\quad Z'=5Z_0,
\quad \Delta S=\min(c,2000-S_{fromOdinToday},4600-S_{held}).
\]

Kuota Stamina dari Odin dan dari quest dihitung terpisah, agar stok Odin lama tidak mengambil jatah quest. Grant quest adalah `min(sisa kuota quest 300, ruang penyimpanan)`; bagian yang belum dapat diklaim tetap tersedia hari itu dan kedaluwarsa pada reset. Tidak ada grant melampaui 4.600. Jika konversi Odin telah mencapai 2.000 hari itu, Odin tersimpan masih dapat dipakai untuk bonus EXP/Zeny tetapi tidak menambah Stamina. Kill dengan nol EXP tidak mengonsumsi Odin. Jika kapasitas Stamina penuh, UI memperlihatkan sisa kapasitas dan Odin dapat dimatikan. Overflow tidak dijadikan item yang dapat diperdagangkan. Daily crafting quest memberi 300 Stamina dari penyelesaian aktivitas harian terbatas, bukan per batch berulang; itu bukan loop pembangkit gratis.

### 10.1 Rantai material dan spesialisasi

| Aktivitas | Biaya per aksi | Hasil terjamin | Penggunaan |
|---|---:|---|---|
| Mining | 20 Stamina | 4 raw ore **atau** 4 rough crystal, sesuai node | Phracon, Oridecon, Elunium, batu enchant |
| Fishing | 10 Stamina + bait 100 Zeny | 2 river fish | Katalis smelting |
| Gardening | 10 Stamina | 3 herb sesuai wilayah | Binder alloy dan elemen enchant |
| Smelting | 10 Stamina + 200 Zeny | Konsumsi 4 raw + 2 fish + 3 herb → satu batch sesuai resep | Lihat hasil resep di bawah |

Node menentukan jenis raw, bukan roll gagal/berhasil. Yield batch berbeda menurut tier; material Upgrade dan Refine memiliki ID inventori berbeda:

| Resep | Input mining per batch, ditambah 2 fish + 3 herb | Hasil satu batch |
|---|---|---:|
| Phracon, Upgrade dasar | 4 raw Phracon | 10 Phracon |
| Oridecon Fragment, Upgrade lanjut | 4 raw Oridecon Fragment | 10 Oridecon Fragment |
| Refined Oridecon, Refine weapon | 4 raw high-grade Oridecon | 1 refined Oridecon |
| Refined Elunium, Refine armor/accessory | 4 raw high-grade Elunium | 1 refined Elunium |
| Stone enchant wilayah | 4 rough crystal wilayah | 5 Enchantment Stone wilayah |

Untuk enchant, herb harus berasal dari wilayah yang sama dengan stone: Lumina, Emberfall, atau Frostveil. Kebun Lumina menumbuhkan Sunleaf, Emberfall Ashbloom, Frostveil Frostpetal. Ore Refine memerlukan level profesi dan area lebih tinggi. Oridecon Fragment Upgrade tidak dapat dianggap setara refined Oridecon atau dikonversi menjadi ore Refine melalui jalur tanpa biaya. Semua biaya dibayar saat server mengonfirmasi hasil, sehingga pembatalan atau disconnect tidak menggandakan output.

Satu rantai lengkap membutuhkan **50 Stamina dan 300 Zeny per batch jadi**: setara 5 Stamina/Phracon atau Fragment, 50 Stamina/ore Refine, dan 10 Stamina/Enchantment Stone. Profesi memberikan EXP dan akses resep, tetapi tidak memotong konsumsi di bawah batas aman ekonomi. Bonus mastery awal berupa +5% peluang satu raw tambahan dari gathering; anggaran di bawah memakai hasil terjamin agar tidak bergantung RNG.

Contoh konsumsi harian yang dapat dicapai:

| Tahap | Jumlah aksi | Stamina | Hasil/beban |
|---|---:|---:|---|
| Mining | 40 | 800 | 160 raw/crystal |
| Fishing | 40 | 400 | 80 fish; 4.000 Zeny bait |
| Gardening | 40 | 400 | 120 herb |
| Smelting | 40 | 400 | 40 batch jadi; 8.000 Zeny |
| Cadangan | — | 300 | Sisa dari anggaran 2.300 |

Output contoh: 20 batch Upgrade menghasilkan **200 Phracon/Fragment**; 12 batch Refine menghasilkan **12 ore langka** yang dapat dibagi 6 Oridecon + 6 Elunium; 8 batch enchant menghasilkan **40 Enchantment Stone**. Untuk memperoleh 2.000 Stamina dari Odin, contoh campuran adalah 400 kill kecil + 500 sedang + 200 besar: \(400+1.000+600=2.000\) Odin. Durasi aktual bergantung kill rate; pada 20 kill/menit, 1.100 kill memerlukan sekitar 55 menit. Material dapat ditabung atau diperoleh di Exchange; angka produksi bukan janji jumlah level progression per hari. Alokasi ini mendukung target enam gear ke Upgrade 40 dengan total 600 material dalam sekitar tiga hari produksi dan Upgrade 200 dengan 7.800 material dalam sekitar 39 hari produksi, sebelum menghitung batas level karakter dan biaya Zeny. Target pemasukan total harian awal adalah 300.000 Zeny dari seluruh sumber; biaya crafting 12.000 merupakan bagian dari pengeluaran, bukan tambahan pemasukan.

```text
Daily quest + waktu AFK terbatas → Odin
Kill ber-EXP + konsumsi Odin → EXP/Zeny 5× total + Stamina
Stamina → Mining + Fishing + Gardening → Smelting
         → Upgrade / Refine / Enchantment → konsumsi material dan biaya
         → surplus material dijual ke pemain → Crystal berpindah pemilik
```

Tidak ada penjualan Stamina atau refill dengan Diamond. Pergantian hari dan pergantian channel tidak mengisi ulang saldo di luar aturan harian.

## 11. Exchange Center dan tiga mata uang

| Mata uang | Sumber | Penggunaan/sink | Hubungan dengan mata uang lain |
|---|---|---|---|
| Zeny | Monster, quest, penjualan junk ke NPC | NPC, bait, smelting, repair, biaya progression | Tidak dapat ditransfer langsung antarpemain |
| Crystal | Daily ekonomi; target awal 20.000/account aktif/hari | Transfer Exchange; listing fee, pajak, pelepasan kartu, layanan akun | Penjualan pemain memindahkan saldo, bukan mencetak Crystal baru |
| Diamond | Top-up atau hadiah kosmetik yang dinyatakan jelas | Kostum, emote, housing dekoratif, efek visual | Tidak ditukar menjadi Zeny, Crystal, ore, kartu, atau Stamina |

Item Diamond dan hadiah top-up terikat akun, tidak dapat dijual kembali. Tidak ada mekanisme tidak langsung menjual kosmetik premium untuk Crystal. Account unlock hanya memengaruhi kenyamanan visual/sosial, bukan output material atau kekuatan combat.

### 11.1 Price band otomatis

Setiap item memiliki harga referensi awal $R_0$ yang ditetapkan tim ekonomi, tick harga, dan band listing. Update harian memakai median harga berbobot volume dari transaksi valid 24 jam terakhir, disertai filter akun terkait dan self-trading. Data cukup bila sedikitnya 100 unit dari 30 akun unik yang tidak terindikasi saling terkait. Bila tidak cukup, gunakan jendela rolling tujuh hari dengan bobot waktu; jika tetap tidak cukup, bekukan referensi. Transaksi mencurigakan tidak menaikkan harga referensi.

\[
R_{new}=\operatorname{clamp}(R_{old}+0,20(M-R_{old}),\ 0,95R_{old},\ 1,05R_{old}).
\]

\[
P_{floor}=\left\lceil\frac{0,80R_{new}}{tick}\right\rceil tick,
\quad P_{cap}=\left\lfloor\frac{1,20R_{new}}{tick}\right\rfloor tick.
\]

`M` adalah median berbobot volume, bukan transaksi terakhir. Tick minimal 1 Crystal. Contoh $R=100.000$, median 110.000: referensi menjadi 102.000, sehingga band 81.600–122.400 pada tick 100. Bila median 200.000, pembatas perubahan harian menahan referensi pada 105.000. Order baru di luar band ditolak. Order lama yang keluar band dihentikan untuk repricing dan escrow yang belum terpakai dikembalikan; tidak mengubah harga pemain secara diam-diam.

Band melindungi pasar dari lonjakan sesaat, tetapi harga yang terus menyentuh cap berarti pasokan atau band perlu dievaluasi. Kelangkaan tidak diselesaikan dengan menjual material premium tanpa perubahan desain yang diumumkan.

### 11.2 Pre-order dan pencocokan

Pemain membuat pre-order untuk **item ID dan kualitas tepat**, jumlah, serta harga maksimum. Server menahan `maxPrice × quantity` Crystal dalam escrow; uang belum menjadi milik penjual. Item kartu/equipment terikat tidak diterima. Bila beberapa buyer cocok, prioritas adalah **harga maksimum tertinggi**, kemudian waktu order paling awal, lalu sequence server sebagai tie-breaker.

Listing seller yang valid memenuhi pre-order ketika `ask ≤ buyerMax`. Harga transaksi selalu **harga ask seller**, sehingga buyer tidak membayar selisih maksimum. Jika beberapa seller cocok pada order baru, pilih ask termurah lalu FIFO. Setelah unit terisi, selisih escrow langsung dikembalikan. Cancel hanya mengembalikan bagian belum terisi; `orderId` dan `transactionId` menjamin idempotensi. Listing/escrow tidak dapat dibelanjakan di tempat lain.

```text
Buyer: saldo → escrow pre-order ─┐
                               ├→ match atomik → item ke buyer, net Crystal ke seller
Seller: item → escrow listing ──┘                → pajak ke sink
Cancel/expiry → kembalikan sisa escrow sekali; listing fee tetap terpakai
```

Listing fee **1% dari nilai listing**, dibayar seller saat membuat listing, tidak dikembalikan saat cancel/expired. Pajak penjualan **8% dari gross yang benar-benar terjual** dipotong saat match. Pembulatan fee ke atas per listing dan pajak ke atas per transaksi dinyatakan di preview. Pemecahan transaksi tidak boleh mengurangi total pajak.

Contoh satu unit seharga 100.000 Crystal: buyer membayar 100.000; seller sebelumnya membayar fee 1.000 dan menerima 92.000 sesudah pajak 8.000. Pendapatan bersih seller terhadap saldo sebelum listing adalah **91.000**. Total Crystal yang hilang dari sistem adalah 9.000. Untuk pre-order max 120.000 yang terisi ask 100.000, 20.000 escrow kembali ke buyer; angka ini bukan uang baru.

Item hasil pembelian Exchange memiliki cooldown jual ulang 24 jam. Kartu yang dipasang mengikuti bind akun. Tidak ada perdagangan langsung untuk menghindari fee dan pelacakan asal item. Sistem membatasi jumlah order aktif per akun, menerapkan rate limit server, dan menandai siklus jual beli antar akun yang mengembalikan item ke pemilik awal.

### 11.3 Target ekonomi dan telemetry

Target 20.000 Crystal/account aktif/hari adalah parameter awal, bukan penyaluran otomatis tanpa aktivitas. Pada turnover rata-rata 150.000 Crystal/account/hari, pajak + fee 9% menghapus sekitar 13.500; layanan akun/kartu ditargetkan menghapus 6.500 sisanya. Fee listing gagal menambah sink di luar estimasi sederhana ini. Ukur sumber dan sink aktual sebelum mengubah reward; jangan menganggap turnover akan selalu setinggi target.

| Metrik mingguan | Target uji awal | Tindakan bila melenceng |
|---|---|---|
| Rasio Crystal diterbitkan/dihapus | 0,95–1,05 pada ekonomi matang | Sesuaikan reward atau sink yang relevan, bukan peluang tersembunyi |
| Persentase item progression menyentuh cap | <15% jenis item aktif | Periksa yield material, bottleneck profesi, dan referensi |
| Waktu terisi material umum | Median <30 menit | Periksa supply per jam dan harga referensi |
| Partisipasi boss support | Hak reward support tidak tertinggal >10 poin persentase dari DPS sebanding | Tinjau ambang effective healing/aggro |
| Konsentrasi pemenang rare | Sesuai distribusi skor dalam rentang statistik | Audit eligibility, bot, dan RNG server |

## 12. Batas otoritas server untuk sistem ekonomi dan dunia

Prototype browser dapat memperagakan rumus, UI, dan RNG deterministik untuk pengujian. Versi MMORPG wajib memindahkan inventori, saldo, resep, batas harian, status boss, damage ledger, RNG hadiah, dan transaksi pasar ke server. Client hanya mengirim intent; tidak mengirim klaim hasil roll, jumlah uang, atau kontribusi final.

Data inti: `ItemDefinition`, `CardDefinition`, `InventoryInstance`, `DailyLedger`, `BossSpawn`, `EncounterContribution`, `LootGrant`, `MarketListing`, `Preorder`, `EscrowLedger`, dan `CurrencyTransaction`. Setiap mutasi memakai versi state dan ID idempoten. Pengurangan biaya serta pemberian hasil berada dalam satu transaksi atomik. Log menyimpan versi tabel drop dan konfigurasi balance yang digunakan, sehingga distribusi dapat direproduksi tanpa mempublikasikan seed RNG aktif. Server timestamp menentukan seluruh cooldown, reset, dan urutan FIFO.


## 13. UX transaksi, informasi, dan arah visual

### 13.1 Forge dan equipment

Jendela Forge memiliki tiga tab yang jelas: Upgrade, Enchant, Refine. Level tidak disatukan menjadi satu angka. Kolom kiri berisi equipment dan indikator damaged; bagian tengah menampilkan model 3D atau artwork item; kolom kanan memperlihatkan stat sekarang, stat sasaran, dan seluruh biaya.

Pada Refine, tampilkan **empat peluang marginal** yang berjumlah 100%: sukses, tetap, turun, damaged. Mengaktifkan Blessed Ore atau Protection Stone langsung memperbarui empat angka dan material yang akan dikonsumsi. Safe Refine memakai label “100%, tarif tetap” beserta total biaya; kontrol proteksi menjadi nonaktif. Hasil gagal tidak memakai pesan ambigu “upgrade failed” ketika level sebenarnya turun.

Enchant menampilkan nama kota, pool stat, nilai minimum/maksimum, biaya, dan ikon lock per slot. Hanya satu lock aktif; pindah kota tetap mempertahankan slot lock. Hasil baru memakai label persen yang konsisten (`0.025` ditampilkan 2.5%). Histori transaksi memperlihatkan before/after untuk membantu pemain memahami hasil.

Konfirmasi menampilkan outcome yang mungkin dan biaya; animasi tidak menentukan hasil. Server mengembalikan receipt lebih dahulu, lalu client memutar visual sesuai outcome. Pemutusan koneksi tidak mengembalikan roll gratis; receipt yang sama dimuat kembali setelah reconnect. UI mendukung skip animasi, reduced motion, font scaling, dan ikon + teks untuk peluang/rarity, sehingga warna bukan satu-satunya pembeda.

### 13.2 Open-field dan aksesibilitas raid

Telegraph boss memiliki bentuk, suara, dan waktu antisipasi yang terbaca. VFX party lain dapat dikurangi tanpa menyembunyikan telegraph. Ponsel memiliki target lock, auto basic attack opsional, dan skill support yang memilih target berdasarkan HP aktual. Auto combat tidak otomatis melakukan dodge mekanik MVP.

Panel kontribusi menampilkan kategori serta status eligible, bukan hanya ranking damage. Tampilan peluang rare membedakan “1% boss menghasilkan rare” dan “36.5% bagian party pada roll pemenang jika rare muncul”. Log tidak mengungkap RNG seed server.

### 13.3 Art direction dan prompt acuan

Produksi menggunakan karakter dan dunia orisinal: menara Lumina dengan batu putih/teal, Emberfall dengan lava jingga, Frostveil biru mutiara. Tidak menggunakan karakter, model, logo, map, atau audio ROX. Prioritaskan siluet kelas, keterbacaan floor hazard, dan perbedaan equipment tier tanpa banjir partikel.

**Prompt UI Forge, bahasa Inggris:**

> Original anime fantasy MMORPG blacksmith interface for “Aetheria Chronicles”, widescreen 16:9 composition, ivory panels with deep teal and muted gold accents, a glowing enchanted anvil framing a legendary sword marked +12, separate Upgrade / Enchant / Refine tabs, a clearly readable probability panel with success, unchanged, downgrade and damaged outcomes, three enchantment slots with one locked attribute, material cost slots and protection toggles at the bottom, elegant mobile-friendly HUD, cel-shaded 3D item rendering, original fantasy visual identity, polished production concept art, no existing game logos.

**Prompt gameplay/MVP, bahasa Inggris:**

> Original isometric 3D anime fantasy MMORPG raid in the lush Whispering Forest, five distinct chibi-proportioned adventurers: armored Vanguard tank, Arcanist mage, Luminary healer, agile Shade and bow-wielding Ranger, fighting a gigantic antlered Verdant Warden made of ancient stone and living roots, clear orange ground telegraphs, restrained teal and golden spell effects, critical damage numbers, visible boss health bar and role contribution panel, mobile joystick and skill wheel, vibrant cel-shaded lighting, readable combat silhouettes, widescreen 16:9, original characters and environment, no copied game UI or logos.

Prompt adalah arahan konsep, bukan gambar atau bukti bahwa game 3D telah diimplementasikan.

## 14. Target balancing dan pengujian

Angka berikut adalah hipotesis playtest untuk akun aktif yang memakai anggaran contoh; bukan janji waktu selesai untuk semua pemain.

| Metrik | Target awal | Asumsi |
|---|---|---|
| Enam equipment Upgrade 40 | Sekitar 3 hari produksi material | 200 Upgrade material/hari, 600 total; akses resep sudah terbuka |
| Enam equipment Upgrade 200 | Minimal 39 hari produksi material | 7,800 material; belum menghitung pembukaan tier atau alokasi lain |
| Weapon +4→+8 protected | Mean 5.593 juta Zeny + 42.833 ore | Peluang per tabel, kedua proteksi tersedia, tanpa downgrade |
| Waktu budget Zeny untuk jalur di atas | ≥18.65 hari pemasukan gross | 300,000/hari sebelum sink lain; bukan ETA final 19 hari |
| Enchant DEX≥10 pada tiga slot | Mean 8.343 reroll | Pool Lumina, tanpa lock, roll independen |
| MVP rare | Mean 100 kill di level encounter | Gate 1%; ini frekuensi rare dunia, bukan satu party dijamin menang |
| TTK MVP vertical slice | Sekitar 5 menit | 3 juta HP, total sustained raid DPS 10,000 pada tier uji |
| Uptime efektif healer | 60–80% encounter | Penempatan hazard dan kebutuhan cleanse terukur |

Pemasukan 300,000 Zeny harus dihitung dari seluruh sumber per akun aktif, termasuk Odin. Jika junk, boss, dan quest bersama menghasilkan lebih banyak, sumber lain perlu disetel; jangan menambahkan angka target lagi sebagai reward tambahan. Satu boss memberi token personal dan reward Zeny yang disesuaikan batas pendapatan—bukan menyalin nominal hadiah demo solo ke server ekonomi.

Jalur perlindungan membutuhkan suplai tersendiri: daily Forge satu kali/account setelah dua smelt memberikan 1 Blessed Ore + 1 Protection Stone, terikat akun. Token boss juga dapat ditukar material proteksi pada harga yang ditentukan dari data partisipasi. Proteksi tidak dijual dengan Diamond. Alokasi harian ini membuat perbandingan “mean Zeny” berbeda dari waktu sebenarnya untuk enam slot. Harga proteksi dalam simulasi tidak ditafsirkan sebagai suplai gratis pada server produksi.

### 14.1 Uji statistik

Untuk estimasi suatu peluang `p` dari `N` percobaan independen, standard error pendekatan adalah `sqrt(p(1-p)/N)`. Pada `p=.20` dan `N=100,000`, SE≈0.001265 atau 0.1265 poin persentase; rentang 95% pendekatan sekitar ±0.248 poin. Pada drop sangat langka dan sampel kecil, gunakan interval binomial eksak/Wilson, bukan menyatakan RNG salah karena satu pemain tidak memperoleh kartu.

Validasi outcome dilakukan pada peluang **marginal** yang tercantum di quote. Untuk target +9 normal pada 100,000 percobaan, ekspektasi sukses/tetap/turun/damaged adalah 20,000/44,000/28,000/8,000. Gunakan instance dan wallet baru setiap percobaan agar target tidak bergeser; simulasi menaikkan gear berulang akan mencampur probabilitas beberapa level.

### 14.2 Kriteria penerimaan vertical slice

- Semua biaya, opsi proteksi, dan peluang UI cocok dengan konfigurasi server versi yang dipakai.
- Tidak ada debit pada saldo kurang, target maksimum, RNG invalid dalam test, damaged, lock invalid, atau duplikat repair tidak memenuhi syarat.
- Total peluang outcome Refine =1; total skor party eligible =1 bila ada kontribusi.
- Lost/duplicate request menghasilkan satu receipt, satu debit, dan maksimal satu grant.
- Overheal, self damage, AFK party member, serta kontribusi setelah encounter tutup tidak menambah hak hadiah.
- Snapshot saldo sebelum dan sesudah perdagangan memenuhi konservasi uang, dengan fee/tax sebagai sink eksplisit.
- Data rollout membandingkan median dan P90 waktu progres per role, termasuk healer dan pemain yang tidak menjual item.

## 15. Arsitektur produksi dan roadmap

```text
Client Unity/3D atau Web lab
    → API intent (requestId, itemId, expectedVersion, opsi)
    → validasi session + inventori + definisi versi balance
    → transaksi: lock item/wallet → hitung hasil RNG server → debit → update → receipt
    → event outbox → journal / telemetry / notifikasi

World simulation → BossSpawn + combat events
    → encounter ledger → eligibility → weighted reward → LootGrant unik

Exchange service → order book + escrow
    → match atomik → currency ledger + item ownership → receipt
```

Gunakan ID instance untuk kepemilikan, `templateId` untuk kompatibilitas repair, integer untuk uang/material, fixed-point untuk persen ekonomi, dan timestamp server UTC. `expectedVersion` menolak aksi terhadap state lama. `requestId` mengembalikan receipt sebelumnya untuk retry yang sama. Transaksi panjang dengan animasi tidak menahan lock database; hasil ditentukan dalam transaksi singkat dan visual dijalankan sesudah commit.

| Tahap | Deliverable | Pintu kelulusan |
|---|---|---|
| A — rules prototype | Modul JS dan lab yang disertakan | Unit test deterministik dan kesesuaian tabel GDD |
| B — 3D combat slice | Satu kota/field, lima role, satu Mini dan MVP | TTK, readability, latency dan role contribution lulus playtest |
| C — persistence online | Inventori, progression, daily ledger, reconnect | Tidak ada duplicate grant/debit pada concurrency dan retry |
| D — economy alpha | Profession, Exchange, escrow, referensi harga | Ledger konservatif, supply/demand dan sink terukur |
| E — content expansion | Area, card pool, guild raid, PvP koefisien terpisah | Tidak melewati power budget dan kapasitas world server yang diuji |

Jumlah pemain/channel, tick rate, biaya infrastruktur, serta jadwal rilis ditetapkan dari profiling dan kapasitas tim; dokumen ini tidak menyatakan angka concurrency tanpa hasil load test.

## 16. Paket kode Web dan batasnya

Sistem contoh tidak mengganti save atau engine demo Aetheria yang sudah berjalan. Buka **`progression-lab.html`** untuk simulasi terpisah. Lab menggunakan wallet uji besar agar seluruh kondisi bisa dicoba, bukan pendapatan pemain produksi. RNG browser dapat diinjeksi dalam test; server produksi memegang hasil yang otoritatif.

| File / kelas | Tanggung jawab |
|---|---|
| `systems/equipment-progression.js` | Modul mandiri, browser global dan CommonJS |
| `Equipment` | Base stats, U0–200, r0–15, damaged, tiga enchant, 1–2 card |
| `UpgradeSystem` | Quote biaya dan mutasi Upgrade pasti |
| `RefineSystem` | Quote empat peluang, roll, Safe Refine, proteksi, repair |
| `EnchantSystem` | Pool kota, roll stat/nilai, satu lock dan biaya 2× |
| `MVPDropCalculator` | Normalisasi kontribusi, gate rare, weighted winner party |
| `tests/progression.test.cjs` | Batas probabilitas, biaya, mutasi atomik, lock, repair, eligibility dan RNG |
| `progression-lab.*` | UI interaktif untuk mencoba sistem dan membaca receipt |

Kontrak wallet: `{ zeny: integer, materials: { phracon, orideconFragment, oridecon, elunium, blessedOre, protectionStone, luminaStone, emberfallStone } }`. Operasi domain mengembalikan `{ok:false,error:{code,message}}` atau receipt `{ok:true, action, outcome, costs, before, after, ...}`. Tidak ada exception domain yang harus ditampilkan mentah kepada pemain.

`Equipment.getStatComponents()` mengembalikan `flatStats` dan `percentStats`; aggregator karakter harus menjumlahkan komponen semua item lalu menerapkan Awakening serta bonus persentase **sekali**. `getStats()` hanya evaluasi per-item untuk inspeksi; menjumlahkan angka final per-item tidak menghasilkan formula final karakter yang benar. Konversi attribute STR/VIT dan skill card memerlukan character/combat assembler; modul belum mengimplementasikan perilaku skill kartu, socketing UI, kehidupan profesi, pasar, spawn online, atau 3D.

Contoh pemakaian:

```javascript
const { Equipment, UpgradeSystem, RefineSystem, EnchantSystem, MVPDropCalculator }
  = require('./systems/equipment-progression.js');

const gear = new Equipment({
  id: 'instance-01', templateId: 'dawnsteel-sword', name: 'Dawnsteel Sword',
  type: 'Weapon', baseStats: { ATK: 200 }, upgradeGrowth: { ATK: 3 },
  upgradeLevel: 40, refineLevel: 4, cardSlotCount: 2
});
const wallet = { zeny: 2_000_000, materials: {
  orideconFragment: 100, oridecon: 100, blessedOre: 10,
  protectionStone: 10, luminaStone: 100, emberfallStone: 100
}};
const upgrade = new UpgradeSystem();
const refine = new RefineSystem();
const enchant = new EnchantSystem();

console.log(upgrade.upgrade(gear, wallet));
console.log(refine.quote(gear, {useBlessedOre:true, useProtectionStone:true}));
console.log(refine.refine(gear, wallet, {safe:true})); // target +5: 12 ore + 1M Zeny
console.log(enchant.enchant(gear, wallet, 'Lumina')); // tiga slot
console.log(enchant.enchant(gear, wallet, 'Emberfall', 0)); // slot 0 tetap

const parties = [
  {id:'A',damageDealt:600000,damageTaken:10000,healingDone:0,firstHit:true,lastHit:false},
  {id:'B',damageDealt:300000,damageTaken:60000,healingDone:20000,firstHit:false,lastHit:false},
  {id:'C',damageDealt:100000,damageTaken:30000,healingDone:80000,firstHit:false,lastHit:true}
];
const mvp = new MVPDropCalculator();
console.log(mvp.calculate(parties)); // .365, .325, .310
console.log(mvp.roll(parties, {rareDropChance:.01})); // gate 1%, tidak selalu ada pemenang
```

Menjalankan lab dari folder proyek:

```sh
python3 jalankan.py
# buka progression-lab.html pada alamat server yang tercetak
node tests/progression.test.cjs
```

Untuk pengguna Windows, `MULAI-WINDOWS.bat` menjalankan server yang sama. Node.js hanya diperlukan untuk unit test, bukan untuk memainkan lab. Konfigurasi GDD adalah versi baru yang sengaja terpisah dari angka demo solo sebelumnya; penyatuan ke gameplay membutuhkan migrasi save dan pengujian ekonomi tersendiri.
