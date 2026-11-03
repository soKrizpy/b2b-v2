# Audit Kesesuaian dan Rencana Implementasi Kurikulum Scratch

**Dokumen perencanaan saja.** Tidak mengaktifkan topik, challenge, kuis, tahap,
unlock, atau modul baru. Tidak dibaca loader. Semua ide challenge yang belum ada
pada sumber disebut usulan dan memerlukan persetujuan serta penulisan konten.

## 1. Temuan audit berbasis repo

### Sumber aktif yang ditemukan

- public/curriculum/scratch-game-development.json berisi satu modul:
  Scratch Game Development: Petualangan Luar Angkasa, level beginner, order 1,
  dengan 10 topik bernomor 1–10. Setiap objek topik memiliki description,
  nodes, quiz (5 soal), dan challenge dengan title/instructions.
- src/features/curriculum/data/scratchModuleData.ts mengekspor
  scratchTopicsData (10 topik) dan scratchFullModuleImport. Judul serta urutan
  10 topiknya sama dengan JSON. Setiap seed topic juga berisi nodes, quiz 5
  soal, dan challenge.
- JSON pilot topik pertama memiliki 10 node/langkah, 5 soal, dan challenge
  Misi Navigasi Roket Antariksa. Tes
  src/__tests__/scratch-curriculum-pilot.test.ts memvalidasi jumlah, ID node,
  urutan, practice, kuis, dan challenge tersebut.
- Seed TypeScript pilot memiliki 4 nodes, bukan 10. Jangan mengganti JSON pilot
  dengan seed lama. Ini adalah perbedaan representasi yang harus diperhatikan
  jika seed dipakai sebagai sumber import.
- Tidak ada modul Intermediate/Advanced yang berdiri sendiri. Beberapa konsep
  yang dituju ada sebagai submateri di Beginner; itu bukti konsep terkait,
  bukan bukti bahwa materi lanjutan siap digunakan.
- Komponen RetroPixelWorldMap memilih scene dari nama/level modul, membuat
  nomor lokal dari urutan nodes yang diterima, dan merender sebanyak nodes
  aktual. scratchMapConfig menyediakan koordinat untuk 12 titik dan viewBox
  1200 x 675. ScratchPixelMapScene memiliki scene biome berbeda. Tes
  scratch-map-config.test.tsx menguji pilihan biome, 12 koordinat, viewBox,
  dan tiga scene. Data saat ini tetap hanya 10 topik.
- Mapping konsep berikut tidak mengubah urutan, ID, atau relasi sumber aktif.

Status:
- **SOURCE-BACKED**: materi dan challenge sumber langsung mendukung konsep
  rancangan dengan cakupan yang sesuai.
- **PARTIAL**: field sumber mendukung sebagian konsep, tetapi belum ada materi
  atau challenge khusus yang cukup untuk topik rancangan.
- **PROPOSED-NEEDS-CONTENT**: tidak ditemukan materi sumber yang mendukung topik.
- **NEEDS-REVIEW**: pemetaan/proyek membutuhkan keputusan guru atau pemilik
  produk sebelum dapat dianggap cocok.
- “Challenge lama ada” berarti challenge terpasang pada topik sumber lama.
  Itu tidak otomatis menjadikannya challenge yang disetujui untuk judul/topik
  rancangan baru.

## 2. Audit setiap topik dan challenge

Dalam referensi JSON, /0/topics/N adalah indeks berbasis nol; field relevan
adalah topic_title, description, nodes, quiz, dan challenge.title/instructions.
Seed padanannya adalah scratchTopicsData[N]. Project usulan belum menjadi data.

### Scratch Beginner — pulau hijau

| No. dan judul rancangan | Status, bukti sumber | Challenge | Yang masih kurang |
|---|---|---|---|
| 1. Mengenal Scratch dan Area Kerja | **PARTIAL** — JSON /0/topics/0 description/nodes membahas panggung/koordinat; tidak ditemukan tur editor. | Proyek tur editor adalah **usulan baru**. Challenge lama Misi Navigasi Roket Antariksa melekat pada pilot koordinat, bukan tur editor. | Materi antarmuka editor, kuis khusus, langkah proyek dan rubrik. |
| 2. Sprite dan Latar Cerita | **PARTIAL** — /0/topics/0 nodes menggunakan Sprite/Roket, tidak mengajarkan backdrop/story secara utuh. | Proyek adegan cerita adalah **usulan baru**; challenge lama topik 1 hanya terkait sprite/koordinat. | Materi backdrop/story, kuis khusus, instruksi proyek dan rubrik. |
| 3. Blok Perintah Pertama | **PARTIAL** — /0/topics/0 nodes memiliki contoh go to/glide di konteks koordinat. | Proyek animasi dasar adalah **usulan baru**; challenge lama topik 1 tetap challenge navigasi roket. | Pengenalan kategori blok dan kuis yang sesuai level; rubrik proyek. |
| 4. Urutan Perintah | **PARTIAL** — nodes dan code_content dalam topik sumber menunjukkan urutan blok, bukan unit sequence tersendiri. | Rute berurutan adalah **usulan baru**; belum ada challenge dengan hasil dan kriteria khusus sequence. | Materi sequence, kuis, petunjuk proyek dan rubrik. |
| 5. Memulai dengan Bendera Hijau | **PARTIAL** — /0/topics/1 nodes/quiz dan topik lain memakai event, tetapi bukan lesson mandiri bendera hijau. | Proyek keadaan awal adalah **usulan baru**. Challenge lama topik 2 adalah kontrol keyboard 4 arah. | Materi event pembuka/reset, kuis khusus, kriteria challenge. |
| 6. Gerakan dan Arah | **PARTIAL** — /0/topics/0–1 nodes membahas koordinat dan kemudi. | Challenge lama “Kemudi Pesawat Antariksa 4 Arah” ada pada /0/topics/1; belum diputuskan untuk topik rancangan ini. | Penyelarasan materi arah/koordinat, kuis, serta keputusan pemetaan challenge. |
| 7. Sistem Koordinat X–Y | **SOURCE-BACKED** — /0/topics/0 topic_title/description/nodes/quiz mencakup koordinat; pilot diuji oleh scratch-curriculum-pilot.test.ts. | Challenge lama “Misi Navigasi Roket Antariksa” ada di /0/topics/0; ini satu-satunya mapping proyek langsung yang telah lolos tes pilot. | Tidak perlu menulis ulang pilot. Perlu keputusan pemetaan judul/ordinal bila kelak menjadi topik 7. |
| 8. Kostum dan Animasi | **SOURCE-BACKED untuk konsep** — /0/topics/2 nodes/quiz membahas kostum, loop, animasi. | Challenge lama “Animasi Thruster Api Roket Menyala” ada di /0/topics/2. Hubungan langsung secara konsep; tidak mengubah topik aktif. | Jika dipindahkan ke urutan baru, tinjau urutan prasyarat dan ID; jangan menggandakan challenge. |
| 9. Suara dan Dialog | **PARTIAL** — /0/topics/5 description/nodes/quiz menyebut efek suara/tabrakan; dialog tidak ditemukan. | Challenge lama “Pertahanan Asteroid Berbahaya & Efek Tabrakan” tidak meminta proyek dialog; proyek dialog adalah **usulan baru**. | Materi dialog/event, pilihan aset suara, kuis dan rubrik. |
| 10. Peristiwa Keyboard dan Klik | **PARTIAL** — /0/topics/1 membuktikan keyboard/events; klik tidak terlihat pada judul/challenge sumber. | Challenge lama “Kemudi Pesawat Antariksa 4 Arah” membuktikan proyek keyboard, bukan klik. | Materi klik dan kuis belum terbukti; persetujuan apakah challenge perlu memperluas interaksi. |
| 11. Membuat Cerita Interaktif | **PARTIAL** — /0/topics/6 nodes/quiz memuat broadcast/alur game, tetapi bukan cerita bercabang. | Challenge lama “Sistem Layar Game Over & Tombol Restart” tidak setara dengan cerita; cerita bercabang adalah **usulan baru**. | Materi pilihan/branching, kuis, proyek dan rubrik. |
| 12. Proyek Akhir: Cerita Petualangan | **NEEDS-REVIEW** — /0/topics/9 adalah capstone Space Defender, bukan cerita petualangan. | Challenge lama “Peluncuran Mahakarya: Game Space Defender” memang ada tetapi berbeda proyek. Jangan mengganti/memindahkan tanpa keputusan. | Keputusan produk tentang proyek akhir Beginner, materi akhir, kuis/ujian, dan rubrik. |

### Scratch Intermediate — pulau salju

Bukti concept overlap di bawah masih berasal dari Beginner, bukan modul
Intermediate. Challenge lama tetap terikat pada topic sumber yang tercantum.

| No. dan judul rancangan | Status, bukti sumber | Challenge | Yang masih kurang |
|---|---|---|---|
| 1. Merancang Aturan Permainan | **PROPOSED-NEEDS-CONTENT** — tidak ditemukan unit aturan/desain game. | Game tangkap objek adalah **usulan baru**; tidak ada challenge desain aturan tersendiri. | Materi tujuan/aturan/kondisi selesai, kuis, challenge dan rubrik. |
| 2. Percabangan Jika–Maka | **PARTIAL** — Beginner /0/topics/3 nodes/quiz membahas if-then/sensor tepi. | Challenge lama “Sistem Radar & Detektor Tepi Panggung” ada pada topic sumber; belum merupakan challenge Intermediate yang disetujui. | Kedalaman kondisi bercabang, materi baru, kuis dan kriteria proyek. |
| 3. Sensor Sentuhan dan Jarak | **PARTIAL** — Beginner /0/topics/3 dan /0/topics/5 menyebut tepi/tabrakan; sensor jarak tidak ditemukan. | Challenge lama “Sistem Radar & Detektor Tepi Panggung” dan “Pertahanan Asteroid Berbahaya & Efek Tabrakan” terkait sentuhan; proyek jarak masih **usulan**. | Materi sensing jarak, kuis, challenge/rubrik baru. |
| 4. Pengulangan Perintah | **PARTIAL** — Beginner /0/topics/2 nodes/quiz mengajarkan repeat/forever untuk animasi. | Challenge lama “Animasi Thruster Api Roket Menyala” ada di topic sumber, bukan challenge Intermediate baru. | Materi loop lanjutan, kuis baru, proyek dengan kriteria yang berbeda dari Beginner. |
| 5. Variabel untuk Skor | **PARTIAL** — Beginner /0/topics/4 nodes/quiz menyebut skor/nyawa. | Challenge lama “Papan Skor & Pengumpul Bintang Energi” ada pada topic sumber; belum ditetapkan untuk modul baru. | Materi skor dalam game tangkap objek, kuis, rubrik dan keputusan pemetaan. |
| 6. Timer dan Batas Waktu | **PARTIAL** — Beginner /0/topics/8 nodes/quiz berisi countdown 45 detik. | Challenge lama “Tantangan Bertahan Hidup 45 Detik” ada pada topic sumber; bukan challenge baru yang disetujui. | Pendalaman timer dan hasil ronde, kuis/rubrik Intermediate. |
| 7. Pesan Antar-Sprite | **PARTIAL** — Beginner /0/topics/6 nodes/quiz memuat broadcast. | Challenge lama “Sistem Layar Game Over & Tombol Restart” memakai alur/broadcast; assignment ulang perlu persetujuan. | Materi penerima pesan dan koordinasi sprite, kuis dan kriteria proyek. |
| 8. Kloning Objek | **PARTIAL** — Beginner /0/topics/7 nodes/quiz membahas kloning peluru. | Challenge lama “Meriam Laser Kloning Melawan Asteroid” ada di topic sumber; objek tangkap adalah proyek berbeda. | Materi lifecycle banyak objek dan proyek/rubrik baru; jangan sekadar mengganti sprite. |
| 9. Gerakan Pemain dan Rintangan | **PARTIAL** — Beginner /0/topics/1 dan /0/topics/5 memuat kontrol/asteroid. | Challenge lama kemudi/pertahanan asteroid terkait sebagian; proyek integrasi baru **usulan**. | Integrasi kontrol-rintangan, kuis dan rubrik Intermediate. |
| 10. Nyawa, Skor, dan Kondisi Kalah | **PARTIAL** — Beginner /0/topics/4, /0/topics/6, /0/topics/8 memuat variabel/Game Over/timer. | Beberapa challenge legacy terkait tetapi tidak ada challenge terpadu khusus topik rancangan. | Materi aturan nyawa/skor/kalah, kuis, challenge terpadu dan aturan scoring. |
| 11. Debugging Game | **PARTIAL** — Beginner /0/topics/9 nodes berisi checklist debugging. | Challenge Space Defender tidak secara eksplisit meminta debugging terukur; challenge bug hunt adalah **usulan baru**. | Fixture bug, materi metode debugging, kuis dan rubrik. |
| 12. Proyek Akhir: Game Tangkap Objek | **NEEDS-REVIEW** — capstone Beginner /0/topics/9 adalah Space Defender. | Challenge Space Defender ada tetapi game tangkap objek berbeda. Jangan mengganti judul challenge saja. | Persetujuan proyek Intermediate, seluruh materi prasyarat, kuis/proyek/rubrik. |

### Scratch Advanced — pulau vulkanik

| No. dan judul rancangan | Status, bukti sumber | Challenge | Yang masih kurang |
|---|---|---|---|
| 1. Memecah Game Menjadi Bagian Kecil | **PROPOSED-NEEDS-CONTENT** — tidak ditemukan materi decomposition/modular design. | Proyek milestone/komponen adalah **usulan baru**. | Materi perencanaan sistem, kuis dan rubrik. |
| 2. Blok Buatan Sendiri | **PROPOSED-NEEDS-CONTENT** — tidak ditemukan materi My Blocks/custom blocks pada 10 topik sumber. | Challenge membuat blok sendiri adalah **usulan baru**. | Materi parameter/input, kuis, proyek dan kriteria. |
| 3. Status dan Mode Permainan | **PARTIAL** — Beginner /0/topics/6 dan /0/topics/9 memakai broadcast/Game Over/MENANG; model state eksplisit tidak ditemukan. | Challenge legacy Game Over/restart ada; menu/pause/state challenge Advanced adalah **usulan baru**. | Materi state/transisi, kuis, dan rubrik. |
| 4. Inventaris dan Pengumpulan Item | **PROPOSED-NEEDS-CONTENT** — skor/bintang di Beginner /0/topics/4 bukan sistem inventaris. | Inventaris tambah/pakai item adalah **usulan baru**. | Materi list/struktur data, kuis, challenge dan aturan inventaris. |
| 5. Musuh dengan Pola Gerak | **PARTIAL** — Beginner /0/topics/5 dan /0/topics/9 memuat asteroid/meteor; pola AI bertingkat tidak ditemukan. | Challenge legacy asteroid ada; pola musuh berganti adalah **usulan baru**. | Materi state/pola gerak, kuis dan kriteria tantangan. |
| 6. Level dan Kesulitan Bertahap | **PROPOSED-NEEDS-CONTENT** — tidak ditemukan level progression/difficulty scaling. | Proyek dua level adalah **usulan baru**. | Materi peningkatan kesulitan, parameter, kuis dan keputusan keseimbangan. |
| 7. Kloning dan Banyak Objek | **PARTIAL** — Beginner /0/topics/7 membahas clone peluru dan pembersihan clone. | Challenge clone peluru ada; multi-tipe objek adalah **usulan baru**, bukan assignment lama. | Materi koordinasi/performa, kuis dan rubrik Advanced. |
| 8. Membuat Sistem Misi | **PARTIAL** — Beginner /0/topics/6/9 membahas broadcast/alur game, tidak ada model misi. | Challenge Space Defender ada tetapi bukan sistem misi; dua misi berurutan adalah **usulan baru**. | Materi tujuan/progres misi, kuis dan kriteria penyelesaian. |
| 9. Antarmuka Game | **PARTIAL** — Beginner /0/topics/8 description/nodes menyebut desain UI. | Challenge timer/UI yang lama ada, tetapi HUD/state Advanced belum menjadi proyek tersendiri. | Materi interface, aksesibilitas, kuis dan rubrik. |
| 10. Menguji dan Mengoptimalkan Game | **PARTIAL** — Beginner /0/topics/7/9 memberi konteks cleanup clone/debugging; strategi uji/performa belum ditemukan. | Challenge bug/performa terukur adalah **usulan baru**. | Metode uji, metrik, fixture, kuis dan rubrik. |
| 11. Merancang Proyek Game Lengkap | **PARTIAL / NEEDS-REVIEW** — Beginner /0/topics/9 capstone Space Defender merupakan sumber proyek lengkap, bukan kurikulum Advanced. | Challenge Space Defender adalah proyek aktif Beginner; capstone Advanced baru belum ada. | Tujuan Advanced, proposal, milestone, materi dan rubrik baru. |
| 12. Final Boss: Game Karya Sendiri | **NEEDS-REVIEW** — sumber memiliki final assessment Scratch dan capstone Beginner, bukan penugasan proyek Advanced. | Proyek game orisinal adalah **usulan baru**; jangan menyamakan ujian 20 soal dengan proyek tanpa keputusan. | Keputusan apakah Final Boss berupa proyek, ujian, atau keduanya; rubrik, kuis/ujian dan sertifikat. |

## 3. Pilot, tahap, dan peta

- Pilot JSON tidak diganti: judul sumber pada /0/topics/0, 10 node berurutan,
  lima soal, challenge Misi Navigasi Roket Antariksa. Tes
  scratch-curriculum-pilot.test.ts memeriksa kontrak ini.
- Seed TypeScript untuk topic yang sama memiliki empat node. Sebelum importer
  memilih seed versus JSON, sumber kanonik dan risiko hilangnya enam langkah
  perlu dipastikan. Tidak ada perubahan sumber dilakukan.
- Rencana tahap pada scratch-curriculum-plan.md ialah 1–4 Pemula, 5–8 Paham,
  9–12 Siap Menuju Modul Berikutnya. Helper
  src/features/quiz/scratchMapConfig.ts:57–65 masih 1–4, 5–7, 8–12.
  Tes scratch-map-config.test.tsx mematok pembagian helper aktif. Perbedaan
  didokumentasikan, bukan diubah.
- src/features/quiz/components/RetroPixelWorldMap.tsx:84–91 memilih tema dan
  membuat ordinal/koordinat dari nodes aktual; baris 129–131 memakai board
  16:9 dan scene Scratch. src/features/quiz/components/ScratchPixelMapScene.tsx
  menyediakan scene biome. Koordinat 12 titik tidak berarti 12 topik/data sudah
  ada. Tes map menguji unit/JSDOM, bukan browser E2E.
- Tidak ada dasar untuk mengaktifkan 36 topik. Tiga map dapat dipertahankan dan
  dipakai kembali ketika setiap modul berisi data yang sudah disetujui.

## 4. Rencana implementasi bertahap

### Tahap 0 — keputusan kurikulum

Sebelum data disentuh, guru/pemilik kurikulum menyetujui:
1. Pemetaan 10 source topics lama ke judul/nomor rancangan tanpa mengubah ID
   atau menghapus progres.
2. Apakah Space Defender tetap capstone Beginner atau cerita petualangan menjadi
   capstone; apakah beberapa konsep legacy boleh diadaptasi untuk level lebih
   tinggi tanpa duplikasi.
3. Batas tahap resmi. Rencana 1–4/5–8/9–12 tidak sama dengan helper aktif.
4. Hasil proyek wajib, aturan submission, rubrik, penggunaan aset, dan apakah
   proyek akhir terpisah dari ujian 20 soal.

### Tahap 1 — definisikan kontrak konten per topik

Untuk setiap topik yang disetujui, siapkan paket review di luar loader:
judul, tujuan belajar, prasyarat, sumber, nodes/slides authored, kuis dengan
jawaban/pembahasan, dan tepat satu challenge proyek. Setiap challenge harus
mencantumkan hasil yang dibuat siswa, instruksi, bukti submission, kriteria
penilaian/rubrik, serta batasan alat/aset. XP, unlock, dan aturan skor tetap
keputusan produk; jangan mengarang nilainya.

### Tahap 2 — lengkapi Beginner dari sumber lebih dahulu

Pertahankan pilot dan ID lama. Petakan 10 materi existing setelah review.
Tulislah hanya gap Beginner yang disetujui pemilik kurikulum. Jangan memenuhi
nomor 11–12 dengan filler. Periksa JSON/seed drift sebelum importer/exporter
memakai salah satu representasi. Challenge lama tetap melekat pada sumber sampai
mapping disetujui.

### Tahap 3 — tulis Intermediate sebagai kurikulum lanjutan

Gunakan konsep Beginner sebagai referensi, bukan salinan. Guru menentukan
prasyarat, kedalaman baru, contoh, kuis dan challenge. Prioritaskan proyek
Tangkap Objek hanya setelah komponen aturan, sensor, loop, variabel, timer,
broadcast, clone dan debugging mempunyai materi yang dinilai.

### Tahap 4 — tulis Advanced dan capstone

Buat sumber khusus untuk My Blocks, inventaris, state, level, sistem misi,
banyak objek, uji/performa dan interface. Tentukan apakah Final Boss merupakan
proyek, ujian 20 soal, atau keduanya; kaitkan sertifikat hanya setelah aturan
produk disetujui.

### Tahap 5 — aktivasi data satu modul pada satu waktu

Setelah konten dan mapping disetujui, implementasikan melalui schema/importer
engine yang ada. Hindari migration/schema kecuali ada kebutuhan terbukti dan
persetujuan terpisah. Import harus memvalidasi semua topik/challenge sebelum
write, mempertahankan submission historis dan IDs, dan melaporkan kemungkinan
partial write. Uji pada database lokal terisolasi yang targetnya diverifikasi.
Jangan mengaktifkan modul kosong atau sebagian sebagai ready.

## 5. Strategi memakai engine dan peta

- Pertahankan QuestMapClient, RetroPixelWorldMap, ScratchPixelMapScene,
  scratchMapConfig, LessonNodeWalker, validasi curriculum JSON, query/actions,
  serta gates yang sudah ada.
- Satu module record menjadi satu seri/peta; topic_order tetap lokal 1–12.
  Jangan membuat ID baru atau memindahkan relasi/progres sampai mekanisme
  kompatibilitas/idempotensi dan mapping old-to-new ditinjau.
- Gunakan scene biome berdasarkan module title/level yang sudah didukung.
  Data module menentukan jumlah marker yang tampil; jangan memalsukan nodes agar
  artwork tampak penuh.
- Tiap topic harus memiliki challenge proyek yang konsisten dengan skema
  challenge aktif. Reuse challenge legacy hanya setelah pemilik kurikulum
  mengesahkan mapping dan tes membuktikan submission/history tetap tertaut.
- Stage helper tidak diubah sampai batas tahap disepakati. Modul tidak boleh
  membuka topik/quiz/final boss berdasarkan judul atau jumlah slot yang belum
  memiliki konten valid.

## 6. Strategi materi dan kuis

1. Pemilik kurikulum menulis/menyetujui sumber materi untuk setiap gap; reviewer
   menandai versi sumber dan tujuan belajar.
2. Susun 10–20 slide hanya jika isi sumber mendukungnya; jangan menambah slide
   generik demi mencapai jumlah.
3. Kuis harus menguji tujuan topik, opsi/answer index tervalidasi, dan
   explanation; jumlah soal serta aturan lulus perlu disepakati.
4. Challenge bukan sekadar judul. Sertakan project brief, langkah/hasil,
   format submission, rubrik, dan kaitan langsung ke materi/kuis topik.
5. Validasi jumlah/keunikan soal Final Boss, urutan topik, challenge aktif,
   nilai XP, progress serta certificate behavior melalui tests terarah sebelum
   aktivasi. Tidak ada nilai bisnis baru yang ditetapkan dokumen ini.

## 7. Tes dan syarat browser aman

### Tes sebelum aktivasi

- Unit/schema: tiap paket valid, nomor lokal unik 1–12, semua topic memiliki
  nodes, quiz tervalidasi, satu challenge project, dan tidak ada placeholder/
  duplicate topic IDs.
- Import/export round-trip: judul, deskripsi, nodes, kuis, challenge, final
  assessment, dan active challenge metadata tetap sama; import ulang tidak
  menduplikasi challenges dan tidak mengubah submission lama.
- Regression pilot: 10 node JSON, lima soal, challenge roket dan ID/urutan
  tetap.
- Map/Quest: module selection memilih biome yang sesuai; 12 node hanya jika 12
  record valid, numbering lokal 1–12, status locked/available/complete berasal
  dari progress sungguhan.
- Learning/action: klik node membuka materi; navigasi slide; challenge aktif
  dapat disubmit dan yang nonaktif ditolak server-side; laporan guru membuka
  quiz; progres dan XP idempotent sesuai dukungan engine; final boss gate dan
  sertifikat sesuai keputusan produk.
- Integrasi: hanya local Supabase loopback yang diverifikasi, akun/fixture
  sintetis, tanpa reset/migrasi/seed yang tidak disetujui. Assertion keadaan
  akhir dan submission historis.
- Jalankan typecheck, lint target, build dan diff check setelah implementasi.

### Browser E2E

Jalankan hanya setelah aplikasi memakai URL/key Supabase lokal dari stack lokal
yang sama, tanpa fallback remote; proses server dan browser diarahkan ke
localhost; browser network log/egress policy membuktikan request hanya ke app
lokal, API lokal, dan aset yang disetujui. Blokir/verifikasi CDN, gambar
eksternal, Gemini, dan layanan lain sebelum membuka halaman. Pakai fixture
sintetis yang sudah disetujui. Jangan menguji Preview/Production. Jika koneksi
keluar tidak dapat dibatasi atau diverifikasi dengan sarana yang tersedia,
tunda browser E2E; jangan mengklaim aman dari inspeksi statis saja.

## 8. Kriteria penerimaan untuk setiap topik

Topik hanya boleh diaktifkan setelah semua item berikut disetujui dan diuji:

- pemilik kurikulum menyetujui judul, tahap, tujuan dan mapping sumber;
- materi cukup, akurat, berurutan, dan tidak memakai filler;
- kuis sesuai tujuan, tervalidasi, dan tidak memiliki jawaban ambigu;
- ada satu challenge proyek yang dapat dikerjakan, dengan brief, submission,
  rubrik, dan konten tidak diduplikasi dari level lain;
- nomor lokal/ID/relasi valid; import-export round-trip tidak kehilangan data;
- status map dan unlock memakai data/progres nyata;
- tidak merusak challenge submission/quiz attempt/progres historis;
- regression tests lulus dan pengujian integrasi/browser dilakukan hanya pada
  lingkungan lokal terisolasi sesuai persyaratan di atas.

## 9. Risiko/approval yang tersisa

- Batas tahap usulan berbeda dari helper aktif.
- 10 source topics Beginner belum dipetakan secara resmi ke 12 topik rancangan;
  dua rancangan Beginner tidak memiliki lesson source langsung.
- Intermediate memiliki concept overlap di Beginner, tetapi belum ada materi/
  kuis/challenge khusus yang disetujui untuk level Intermediate.
- Advanced kekurangan materi langsung untuk sebagian besar tujuan.
- Space Defender legacy tidak sama dengan cerita petualangan, game tangkap
  objek, atau proyek Advanced; keputusan capstone dibutuhkan.
- Seed TypeScript pilot lebih pendek daripada JSON pilot; pemilihan sumber import
  tanpa rekonsiliasi dapat menghilangkan langkah.
- 12 koordinat/scene peta bukan bukti bahwa konten 12 topik tersedia.
- Risiko browser/network serta database integration belum dibuktikan oleh tes
  dokumen atau unit/JSDOM.

Tidak ada perubahan pada file aplikasi/data aktif dalam tahap perencanaan ini.
