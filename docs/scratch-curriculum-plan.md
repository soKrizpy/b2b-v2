# Rencana Kurikulum Scratch — 3 Modul x 12 Topik

**Status dokumen:** rancangan untuk ditinjau guru/pemilik kurikulum. Ini bukan
data aktif, bukan instruksi seed/import, dan tidak mengubah loader, engine,
progres, quiz, unlock, atau modul yang sudah dipakai siswa.

Setiap topik direncanakan mempunyai sebuah proyek yang dikerjakan melalui
challenge. Proyek yang sudah ada ditandai sebagai sumber langsung; ide lainnya
adalah usulan yang harus ditulis dan disetujui sebelum masuk ke data aktif.
Dokumen ini tidak menambahkan challenge ke JSON atau seed.

## Ringkasan sumber saat ini

- Repo memiliki satu modul Scratch: “Scratch Game Development: Petualangan
  Luar Angkasa”, berlevel beginner, berisi 10 topik dengan judul dan urutan
  sama di JSON publik dan seed TypeScript.
- JSON memiliki deskripsi, nodes, kuis lima soal, dan challenge pada masing-masing
  dari 10 topik. Pilot “Pengenalan Sprite & Sistem Koordinat X-Y” memiliki 10
  langkah dan challenge “Misi Navigasi Roket Antariksa”. Seed TypeScript memiliki
  empat node untuk topik pilot, jadi kedua representasi belum identik. Pilot
  JSON dan strukturnya harus dipertahankan.
- Tidak ditemukan modul Intermediate/Advanced yang berdiri sendiri. Sejumlah
  konsep yang berkaitan muncul di materi Beginner, tetapi itu bukan paket materi
  lanjutan dan tidak membenarkan penyalinan konten dengan mengganti judul.
- Status: **SOURCE-BACKED** berarti sumber langsung cocok; **PARTIAL** berarti
  ada irisan konsep tetapi belum cukup untuk menganggap rancangan tersedia;
  **PROPOSED-NEEDS-CONTENT** berarti materi sumber belum ditemukan; **NEEDS-REVIEW**
  berarti guru/pemilik kurikulum harus memutuskan.

## Modul A — Scratch Beginner (pulau hijau)

Judul berikut adalah rancangan tujuan. Pemetaan sumber tidak memindahkan,
mengganti ID, atau menghapus pilot yang ada.

| No. | Topik rancangan | Status dan sumber repo | Proyek lewat challenge |
|---:|---|---|---|
| 1 | Mengenal Scratch dan Area Kerja | **PARTIAL** — sumber Beginner 1 membahas panggung/koordinat, bukan tur editor. | **Usulan:** buat tur area kerja dengan sprite pemandu dan label bagian editor. Langkah dan rubrik perlu ditulis. |
| 2 | Sprite dan Latar Cerita | **PARTIAL** — sumber Beginner 1 memakai sprite/roket, tetapi latar cerita belum menjadi materi tersendiri. | **Usulan:** buat adegan cerita pendek dengan satu sprite dan backdrop pilihan siswa. Perlu contoh dan rubrik. |
| 3 | Blok Perintah Pertama | **PARTIAL** — sumber Beginner 1 memberi contoh gerak go to/glide dalam konteks koordinat. | **Usulan:** buat animasi dengan dua aksi menggunakan blok dasar. Materi urutan belajar perlu ditulis. |
| 4 | Urutan Perintah | **PARTIAL** — urutan blok muncul pada kode sumber, tetapi belum ada unit sequence yang terpisah. | **Usulan:** buat sprite yang menyelesaikan rute dengan urutan perintah tertentu. Perlu materi dan kriteria challenge. |
| 5 | Memulai dengan Bendera Hijau | **PARTIAL** — event bendera hijau muncul di sumber Beginner 2 dan lainnya; belum menjadi unit pengantar tersendiri. | **Usulan:** buat adegan yang mengatur keadaan awal saat bendera hijau diklik. Perlu langkah dan rubrik. |
| 6 | Gerakan dan Arah | **PARTIAL** — sumber Beginner 1–2 membahas koordinat dan kemudi keyboard. | **Sumber terkait:** “Kemudi Pesawat Antariksa 4 Arah”. Jangan pindahkan challenge aktif sebelum pemetaan disetujui. |
| 7 | Sistem Koordinat X–Y | **SOURCE-BACKED** — pilot sumber Beginner 1, “Pengenalan Sprite & Sistem Koordinat X-Y”. | **Sumber langsung:** “Misi Navigasi Roket Antariksa”; arahkan roket ke empat sudut memakai koordinat. Pertahankan pilot 10 langkah dan kuis lima soal. |
| 8 | Kostum dan Animasi | **SOURCE-BACKED** — sumber Beginner 3 membahas animasi kostum roket. | **Sumber langsung:** “Animasi Thruster Api Roket Menyala”; animasikan kostum dengan loop/wait sesuai challenge saat ini. |
| 9 | Suara dan Dialog | **PARTIAL** — sumber Beginner 6 menyebut efek suara, tetapi dialog belum menjadi materi utuh. | **Usulan:** buat adegan dengan dialog singkat dan cue suara. Perlu materi dan tinjauan aset. |
| 10 | Peristiwa Keyboard dan Klik | **SOURCE-BACKED** — sumber Beginner 2 membahas event keyboard dan kontrol interaktif. | **Sumber langsung:** “Kemudi Pesawat Antariksa 4 Arah”; challenge yang ada berfokus pada tombol panah. Interaksi klik perlu diverifikasi. |
| 11 | Membuat Cerita Interaktif | **PARTIAL** — sumber Beginner 7 memakai broadcast/manajemen alur game, bukan unit cerita interaktif lengkap. | **Usulan:** buat cerita bercabang dengan dua pilihan dan perubahan adegan. Perlu materi yang sesuai tahap Beginner. |
| 12 | Proyek Akhir: Cerita Petualangan | **PARTIAL / NEEDS-REVIEW** — sumber Beginner 10 adalah game Space Defender, bukan cerita petualangan. | **Usulan:** proyek cerita interaktif. Pemilik kurikulum perlu memutuskan apakah ini menggantikan rancangan akhir atau Space Defender tetap menjadi proyek akhir; jangan mengganti data aktif. |

## Modul B — Scratch Intermediate (pulau salju)

Topik adalah rancangan. Sumber Beginner yang disebut menunjukkan irisan konsep,
bukan paket Intermediate siap pakai. Ide proyek berikut belum boleh diaktifkan.

| No. | Topik rancangan | Status dan sumber terkait | Proyek lewat challenge |
|---:|---|---|---|
| 1 | Merancang Aturan Permainan | **PROPOSED-NEEDS-CONTENT** — belum ditemukan unit perancangan aturan game. | **Usulan:** rancang game tangkap objek dengan tujuan, batas, dan kondisi menang/kalah tertulis. Perlu materi dan rubrik. |
| 2 | Percabangan Jika–Maka | **PARTIAL** — Beginner 4 membahas If/Then dan sensor tepi; kedalaman Intermediate belum ditulis. | **Usulan:** buat game yang memberi respons berbeda terhadap dua kondisi. Perlu tantangan bertingkat dan rubrik. |
| 3 | Sensor Sentuhan dan Jarak | **PARTIAL** — Beginner 4/6 membahas tepi/tabrakan, bukan rangkaian sensor jarak lengkap. | **Usulan:** buat game menghindari rintangan dengan respons sentuhan dan jarak. Perlu materi sensor jarak. |
| 4 | Pengulangan Perintah | **PARTIAL** — Beginner 3 menggunakan forever, repeat, dan animasi. | **Usulan:** buat animasi/rintangan yang membandingkan loop terbatas dengan loop berulang. Perlu latihan Intermediate baru. |
| 5 | Variabel untuk Skor | **PARTIAL** — Beginner 5 membahas skor/nyawa, tetapi bukan proyek tangkap objek Intermediate. | **Usulan:** buat game tangkap objek yang menambah skor hanya ketika aturan valid terpenuhi. Perlu materi dan rubrik. |
| 6 | Timer dan Batas Waktu | **PARTIAL** — Beginner 9 memiliki countdown 45 detik; adaptasi untuk modul lanjutan perlu review. | **Usulan:** buat ronde berbatas waktu dengan kondisi selesai dan tampilan hasil. Perlu materi dan uji kriteria. |
| 7 | Pesan Antar-Sprite | **PARTIAL** — Beginner 7 membahas broadcast dan manajemen alur. | **Usulan:** hubungkan dua sprite yang memulai/menyelesaikan ronde melalui pesan bernama jelas. Perlu materi penerimaan pesan. |
| 8 | Kloning Objek | **PARTIAL** — Beginner 8 membahas kloning peluru; variasi objek tangkap/rintangan belum ada. | **Usulan:** buat objek jatuh berulang yang dikloning dan dibersihkan setelah interaksi. Perlu materi lifecycle clone. |
| 9 | Gerakan Pemain dan Rintangan | **PARTIAL** — Beginner 2/6 membahas kemudi dan tabrakan, belum mengintegrasikannya menjadi game baru. | **Usulan:** buat pemain menghindari rintangan dengan kontrol dan batas arena. Perlu materi keseimbangan game. |
| 10 | Nyawa, Skor, dan Kondisi Kalah | **PARTIAL** — Beginner 5/7/9 menyentuh variabel, Game Over, dan timer; unit terpadu belum ada. | **Usulan:** buat game dengan skor, nyawa, serta kondisi Game Over yang bisa diuji. Perlu aturan skor yang disetujui. |
| 11 | Debugging Game | **PARTIAL** — Beginner 10 memiliki checklist debugging; kedalaman Intermediate belum ditulis. | **Usulan:** temukan, perbaiki, dan jelaskan tiga bug dalam proyek latihan. Perlu fixture dan rubrik. |
| 12 | Proyek Akhir: Game Tangkap Objek | **PARTIAL / NEEDS-REVIEW** — ada capstone Space Defender Beginner, bukan game tangkap objek. Jangan menyalin lalu mengganti judul. | **Usulan:** game tangkap objek yang menggabungkan kontrol, sensor, loop, skor, timer, dan akhir ronde. Perlu materi proyek lengkap. |

## Modul C — Scratch Advanced (pulau vulkanik)

| No. | Topik rancangan | Status dan sumber terkait | Proyek lewat challenge |
|---:|---|---|---|
| 1 | Memecah Game Menjadi Bagian Kecil | **PROPOSED-NEEDS-CONTENT** — materi desain modular eksplisit belum ditemukan. | **Usulan:** pecah spesifikasi game menjadi komponen dan milestone, lalu buat prototipe penghubungnya. Perlu materi arsitektur. |
| 2 | Blok Buatan Sendiri | **PROPOSED-NEEDS-CONTENT** — sumber My Blocks/custom blocks belum ditemukan. | **Usulan:** buat satu blok buatan sendiri untuk perilaku berulang dan tunjukkan parameternya. Perlu panduan dan rubrik. |
| 3 | Status dan Mode Permainan | **PARTIAL** — Beginner 7/10 memakai broadcast dan alur kondisi game, bukan model state eksplisit. | **Usulan:** buat menu, bermain, jeda, dan selesai sebagai state terpisah. Perlu materi transisi state. |
| 4 | Inventaris dan Pengumpulan Item | **PROPOSED-NEEDS-CONTENT** — skor/pengumpulan Beginner tidak membuktikan sistem inventaris. | **Usulan:** buat inventaris dengan tambah, pakai, dan tampilan jumlah item. Perlu materi struktur data/list. |
| 5 | Musuh dengan Pola Gerak | **PARTIAL** — Beginner 6/10 memuat meteor/asteroid dan gerak, tetapi AI/pola musuh lanjutan belum ada. | **Usulan:** buat musuh dengan dua pola yang berganti berdasarkan kondisi. Perlu materi gerak/state. |
| 6 | Level dan Kesulitan Bertahap | **PROPOSED-NEEDS-CONTENT** — sumber level progression/difficulty scaling belum ditemukan. | **Usulan:** buat dua level dengan peningkatan parameter yang dapat dijelaskan dan diuji. Perlu keputusan keseimbangan. |
| 7 | Kloning dan Banyak Objek | **PARTIAL** — Beginner 8 mengajarkan kloning peluru; banyak tipe objek dan pengelolaannya belum menjadi materi Advanced. | **Usulan:** buat arena beberapa tipe clone dengan cleanup yang benar. Perlu materi batas/performa. |
| 8 | Membuat Sistem Misi | **PARTIAL** — Beginner 7/10 memiliki broadcast/alur Space Defender, tetapi sistem misi belum ditemukan. | **Usulan:** buat dua misi berurutan dengan tujuan dan kondisi selesai berbeda. Perlu model misi dan rubrik. |
| 9 | Antarmuka Game | **PARTIAL** — Beginner 9 menyebut UI; pembuatan interface lengkap tingkat Advanced belum didukung. | **Usulan:** buat HUD/menu yang menampilkan state, skor, timer, dan instruksi. Perlu standar aksesibilitas dan rubrik. |
| 10 | Menguji dan Mengoptimalkan Game | **PARTIAL** — Beginner 8/10 memuat cleanup clone dan debugging; strategi uji/performa lanjutan belum ada. | **Usulan:** susun checklist tes, evaluasi gejala lag pada skenario sintetis, dan dokumentasikan perbaikan. Perlu kriteria ukur. |
| 11 | Merancang Proyek Game Lengkap | **PARTIAL / NEEDS-REVIEW** — Beginner 10 adalah proyek Space Defender lengkap, belum membuktikan cakupan Advanced. | **Usulan:** susun proposal, milestone, risiko, dan prototipe satu sistem. Perlu spesifikasi Advanced. |
| 12 | Final Boss: Game Karya Sendiri | **PARTIAL / NEEDS-REVIEW** — capstone/final assessment Scratch yang ada belum ditetapkan sebagai proyek Advanced. | **Usulan:** buat game orisinal berdasarkan rubrik yang disetujui guru. Perlu keputusan penilaian, aset, dan keterkaitan sertifikat. |

## Pemetaan 10 topik sumber Beginner

Pemetaan menunjukkan kedekatan konsep, bukan pemindahan data, perubahan ID,
atau pernyataan bahwa konten sumber cukup untuk modul tujuan.

| Topik sumber yang tetap ada | Topik rancangan yang terkait | Catatan |
|---|---|---|
| Pengenalan Sprite & Sistem Koordinat X-Y | Beginner 2 dan terutama Beginner 7 | Pilot paling kuat mendukung koordinat. Jangan mengganti judul/ID/isi untuk memaksa kecocokan. |
| Peristiwa (Events) & Kontrol Interaktif Keyboard | Beginner 5 dan 10 | Event bendera hijau/keyboard relevan; klik perlu verifikasi. |
| Looping (Perulangan) & Animasi Kostum Roket | Beginner 8; konsep loop juga Intermediate 4 | Sumber aktif tetap di Beginner; penggunaan ulang butuh adaptasi/persetujuan. |
| Percabangan Logika (If-Then) & Sensor Batas Layar | Intermediate 2–3 | Konsep terkait, tetapi tidak tercakup dalam daftar Beginner baru. Jangan pindahkan otomatis. |
| Variabel Dinamis & Sistem Poin / Nyawa Pemain | Intermediate 5 dan 10 | Ada skor/nyawa, belum menjadi proyek Tangkap Objek. |
| Sensor Tabrakan & Efek Suara Interaktif | Intermediate 3 dan 9 | Ada collision/audio, materi jarak dan game baru perlu dikembangkan. |
| Sinyal Siaran (Broadcast) & Manajemen Alur Game | Beginner 11; Intermediate 7; Advanced 3/8 | Ada alur pesan, tetapi cerita/state/misi perlu konten khusus. |
| Kloning Sprite (Cloning) & Gerakan Peluru Laser | Intermediate 8; Advanced 7 | Ada proyek peluru clone; multi-objek/performa lanjutan belum dibuktikan. |
| Polishing Game: Timer Mundur, Parallax, & Desain UI | Intermediate 6/10; Advanced 9 | Ada timer/UI/parallax, level kedalaman perlu review. |
| Proyek Mahakarya: Space Defender Bits2Bytes & Ujian Akhir | Beginner 12; Intermediate 12; Advanced 11–12 | Hanya proyek akhir Beginner yang benar-benar ada; jangan duplikasi sebagai capstone lanjutan. |

## Tahap pembelajaran

| Tahap rancangan | Nomor topik lokal | Status |
|---|---|---|
| Pemula | 1–4 | Usulan untuk ditinjau guru/pemilik kurikulum. |
| Paham | 5–8 | Usulan untuk ditinjau guru/pemilik kurikulum. |
| Siap Menuju Modul Berikutnya | 9–12 | Usulan untuk ditinjau guru/pemilik kurikulum. |

Pembagian ini berbeda dari helper UI saat ini: Pemula 1–4, Paham 5–7, dan tahap
terakhir 8–12. Helper dan aturan unlock tidak diubah. Pemilik produk/guru harus
menyetujui pembagian resmi sebelum tahap dipakai untuk unlock, kelulusan, atau
progres.

## Kontrak pembelajaran dan status bukti

| Kontrak | Status bukti |
|---|---|
| Pilih node Quest Map membuka materi; materi menggantikan peta dan ada navigasi kembali | Implementasi dan tes unit/JSDOM terkait tersedia (quest-map-learning-flow, lesson-node-walker); browser E2E belum dijalankan pada tahap ini. |
| Materi memakai slide/langkah interaktif dan tiap topik memiliki proyek lewat challenge | Engine memakai nodes/slides; 10 topik sumber Beginner memiliki challenge. Ide proyek 26 slot lain hanya rancangan, belum aktif. |
| Guru memandu dan laporan valid membuka kuis | Helper gate dan tes topic-quiz-report-gate ada; browser/integrasi tidak dijalankan pada tahap dokumentasi ini. |
| Kuis boleh dikerjakan hari berikutnya setelah laporan valid | Belum dikonfirmasi oleh audit ini; perlu verifikasi aturan kode/produk. |
| Topik mengikuti urutan modul | Peta menomori berdasarkan urutan nodes yang diterima; sumber Beginner saat ini bernomor 1–10. |
| Final Boss terbuka setelah topik wajib selesai | Test/action final assessment menolak sebelum semua topik terbit selesai; tidak ada pengujian browser/database pada tahap ini. |
| Final Boss memiliki tepat 20 pertanyaan unik | Submission mensyaratkan 20 jawaban; jumlah dan keunikan bank soal perlu assertion/validasi konten eksplisit sebelum modul baru aktif. |
| Sertifikat mengikuti aturan penyelesaian yang berlaku | Tier memiliki implementasi/tes; kebijakan lintas tiga modul harus mengikuti keputusan produk. Tidak diubah di dokumen ini. |
| Satu seri/peta merepresentasikan satu modul; nomor topik lokal 1–12 | Komponen memakai module selection dan ordinal lokal; helper posisi mendukung 12 titik. Modul bersumber baru satu dengan 10 topik. |

Bukti test saat ini adalah unit/JSDOM, bukan pernyataan bahwa browser E2E atau
integrasi database dijalankan pada tahap ini.

## Kontrak peta pixel-art

- Tiga bioma sudah tersedia: Beginner pulau hijau, Intermediate pulau salju,
  Advanced pulau vulkanik.
- ScratchPixelMapScene menggunakan viewBox 0 0 1200 675, dan map board
  memiliki rasio 16:9. Tes unit membandingkan viewBox dan warna terrain ketiga
  scene.
- getMapPinCoordinates menyediakan posisi sampai 12 topik; komponen memberi
  nomor lokal berdasarkan nodes aktual.
- Data aktif hanya menyediakan 10 topik. Komponen menampilkan jumlah nodes yang
  diterima; posisi untuk 12 tidak mengaktifkan 12 topik.
- Artwork tidak perlu dibuat ulang. Peta tidak menggantikan materi/challenge.

## Materi dan keputusan yang masih dibutuhkan

1. Materi, langkah, challenge, dan rubrik untuk slot Beginner yang belum tercakup
   penuh, terutama area kerja, cerita, suara/dialog, dan proyek akhir.
2. Kurikulum Intermediate 12 topik yang tidak sekadar menyalin materi Beginner;
   gunakan irisan sumber sebagai referensi setelah disetujui guru.
3. Kurikulum Advanced 12 topik, termasuk My Blocks, inventaris, level/kesulitan,
   sistem misi, pengujian/performa, dan capstone.
4. Untuk setiap proyek: hasil yang harus dibangun, langkah belajar, kriteria
   challenge/submission, aset, serta rubrik.
5. Keputusan pemetaan topik lama, proyek akhir Beginner (cerita petualangan vs
   Space Defender), batas tahap resmi, jumlah/keunikan 20 soal, dan relasi
   penyelesaian/sertifikat.
6. Keputusan apakah konten konsep Beginner boleh diadaptasi untuk Intermediate
   dan Advanced, agar tidak terjadi duplikasi atau penggantian judul tanpa
   peningkatan materi.

## Batas tahap ini

Dokumen ini tidak mengubah JSON, seed TypeScript, ID/relasi, map resolver,
engine, tahap/unlock aktif, kuis, challenge aktif, database, schema, migration,
seed database, atau environment. Modul kosong tidak ditampilkan sebagai siap
digunakan.
