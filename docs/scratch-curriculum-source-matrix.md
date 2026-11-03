# Audit sumber kurikulum Scratch

Dokumen ini adalah manifest audit untuk perencanaan kurikulum. File ini tidak
dibaca oleh loader, importer, atau engine kurikulum dan tidak membuat modul,
topik, progres, kuis, maupun unlock.

## Ringkasan sumber

- JSON kurikulum: `public/curriculum/scratch-game-development.json` memuat satu
  modul berlevel `beginner`, “Scratch Game Development: Petualangan Luar
  Angkasa”, dengan 10 topik bernomor 1–10.
- Seed TypeScript: `src/features/curriculum/data/scratchModuleData.ts`
  mengekspor `scratchTopicsData` dan `scratchFullModuleImport`, juga berisi 10
  topik dengan judul dan urutan yang sama.
- JSON menyediakan deskripsi, node, kuis 5 soal, dan challenge pada masing-masing
  dari 10 topik. Topik 1 memiliki 10 node instruksional. Topik 2–10 masing-masing
  memiliki 4 node.
- Seed TypeScript memiliki 4 node, kuis 5 soal, dan challenge pada masing-masing
  topik, termasuk 4 node untuk topik 1. Karena itu JSON pilot topik 1 yang
  memiliki 10 langkah harus dipertahankan; kedua representasi belum identik.
- Pemeriksaan berkas kurikulum, pencarian teks seluruh repo, tes, dan riwayat
  branch/ref lokal tidak menemukan sumber untuk Beginner 11–12 atau modul
  Scratch Intermediate dan Advanced. Ini menyatakan hasil pencarian repo lokal,
  bukan bahwa materi tersebut tidak ada di luar repo.

## Matriks slot topik

Nomor adalah nomor tampilan lokal di dalam modul tujuan. Tahap pada 10 topik
bersumber ini hanya usulan pengelompokan dari urutan dan judul; sumber kurikulum
tidak memberi label tahap eksplisit. Usulan memakai pengelompokan engine yang
sudah tersedia: 1–4 Pemula, 5–7 Paham, 8–12 Siap Menuju Modul Berikutnya. Tidak
ada aturan unlock yang ditetapkan atau diubah oleh dokumen ini.

| Modul tujuan | No. lokal | Judul sumber / status slot | Tahap usulan | Sumber repo | Kecukupan sumber |
|---|---:|---|---|---|---|
| Scratch Beginner | 1 | Pengenalan Sprite & Sistem Koordinat X-Y | Pemula (inferensi) | JSON `/[0]/topics/0`; TS `scratchTopicsData[0]` | Terstruktur; JSON 10 langkah, kuis, challenge. Seed TS berbeda: 4 node. |
| Scratch Beginner | 2 | Peristiwa (Events) & Kontrol Interaktif Keyboard | Pemula (inferensi) | JSON `/[0]/topics/1`; TS `scratchTopicsData[1]` | Terstruktur; 4 node, kuis, challenge. |
| Scratch Beginner | 3 | Looping (Perulangan) & Animasi Kostum Roket | Pemula (inferensi) | JSON `/[0]/topics/2`; TS `scratchTopicsData[2]` | Terstruktur; 4 node, kuis, challenge. |
| Scratch Beginner | 4 | Percabangan Logika (If-Then) & Sensor Batas Layar | Pemula (inferensi) | JSON `/[0]/topics/3`; TS `scratchTopicsData[3]` | Terstruktur; 4 node, kuis, challenge. |
| Scratch Beginner | 5 | Variabel Dinamis & Sistem Poin / Nyawa Pemain | Paham (inferensi) | JSON `/[0]/topics/4`; TS `scratchTopicsData[4]` | Terstruktur; 4 node, kuis, challenge. |
| Scratch Beginner | 6 | Sensor Tabrakan & Efek Suara Interaktif | Paham (inferensi) | JSON `/[0]/topics/5`; TS `scratchTopicsData[5]` | Terstruktur; 4 node, kuis, challenge. |
| Scratch Beginner | 7 | Sinyal Siaran (Broadcast) & Manajemen Alur Game | Paham (inferensi) | JSON `/[0]/topics/6`; TS `scratchTopicsData[6]` | Terstruktur; 4 node, kuis, challenge. |
| Scratch Beginner | 8 | Kloning Sprite (Cloning) & Gerakan Peluru Laser | Siap Menuju Modul Berikutnya (inferensi) | JSON `/[0]/topics/7`; TS `scratchTopicsData[7]` | Terstruktur; 4 node, kuis, challenge. |
| Scratch Beginner | 9 | Polishing Game: Timer Mundur, Parallax, & Desain UI | Siap Menuju Modul Berikutnya (inferensi) | JSON `/[0]/topics/8`; TS `scratchTopicsData[8]` | Terstruktur; 4 node, kuis, challenge. |
| Scratch Beginner | 10 | Proyek Mahakarya: Space Defender Bits2Bytes & Ujian Akhir | Siap Menuju Modul Berikutnya (inferensi) | JSON `/[0]/topics/9`; TS `scratchTopicsData[9]` | Terstruktur; 4 node, kuis, challenge. |
| Scratch Beginner | 11 | Belum ditetapkan pemilik kurikulum | Belum ditentukan | Tidak ditemukan di sumber Scratch repo | Materi dan judul perlu disediakan; jangan tampilkan sebagai topik siap pakai. |
| Scratch Beginner | 12 | Belum ditetapkan pemilik kurikulum | Belum ditentukan | Tidak ditemukan di sumber Scratch repo | Materi dan judul perlu disediakan; jangan tampilkan sebagai topik siap pakai. |
| Scratch Intermediate | 1 | Belum ditetapkan pemilik kurikulum | Belum ditentukan | Tidak ditemukan di sumber Scratch repo | Modul dan materi perlu disediakan sebelum dapat digunakan. |
| Scratch Intermediate | 2 | Belum ditetapkan pemilik kurikulum | Belum ditentukan | Tidak ditemukan di sumber Scratch repo | Modul dan materi perlu disediakan sebelum dapat digunakan. |
| Scratch Intermediate | 3 | Belum ditetapkan pemilik kurikulum | Belum ditentukan | Tidak ditemukan di sumber Scratch repo | Modul dan materi perlu disediakan sebelum dapat digunakan. |
| Scratch Intermediate | 4 | Belum ditetapkan pemilik kurikulum | Belum ditentukan | Tidak ditemukan di sumber Scratch repo | Modul dan materi perlu disediakan sebelum dapat digunakan. |
| Scratch Intermediate | 5 | Belum ditetapkan pemilik kurikulum | Belum ditentukan | Tidak ditemukan di sumber Scratch repo | Modul dan materi perlu disediakan sebelum dapat digunakan. |
| Scratch Intermediate | 6 | Belum ditetapkan pemilik kurikulum | Belum ditentukan | Tidak ditemukan di sumber Scratch repo | Modul dan materi perlu disediakan sebelum dapat digunakan. |
| Scratch Intermediate | 7 | Belum ditetapkan pemilik kurikulum | Belum ditentukan | Tidak ditemukan di sumber Scratch repo | Modul dan materi perlu disediakan sebelum dapat digunakan. |
| Scratch Intermediate | 8 | Belum ditetapkan pemilik kurikulum | Belum ditentukan | Tidak ditemukan di sumber Scratch repo | Modul dan materi perlu disediakan sebelum dapat digunakan. |
| Scratch Intermediate | 9 | Belum ditetapkan pemilik kurikulum | Belum ditentukan | Tidak ditemukan di sumber Scratch repo | Modul dan materi perlu disediakan sebelum dapat digunakan. |
| Scratch Intermediate | 10 | Belum ditetapkan pemilik kurikulum | Belum ditentukan | Tidak ditemukan di sumber Scratch repo | Modul dan materi perlu disediakan sebelum dapat digunakan. |
| Scratch Intermediate | 11 | Belum ditetapkan pemilik kurikulum | Belum ditentukan | Tidak ditemukan di sumber Scratch repo | Modul dan materi perlu disediakan sebelum dapat digunakan. |
| Scratch Intermediate | 12 | Belum ditetapkan pemilik kurikulum | Belum ditentukan | Tidak ditemukan di sumber Scratch repo | Modul dan materi perlu disediakan sebelum dapat digunakan. |
| Scratch Advanced | 1 | Belum ditetapkan pemilik kurikulum | Belum ditentukan | Tidak ditemukan di sumber Scratch repo | Modul dan materi perlu disediakan sebelum dapat digunakan. |
| Scratch Advanced | 2 | Belum ditetapkan pemilik kurikulum | Belum ditentukan | Tidak ditemukan di sumber Scratch repo | Modul dan materi perlu disediakan sebelum dapat digunakan. |
| Scratch Advanced | 3 | Belum ditetapkan pemilik kurikulum | Belum ditentukan | Tidak ditemukan di sumber Scratch repo | Modul dan materi perlu disediakan sebelum dapat digunakan. |
| Scratch Advanced | 4 | Belum ditetapkan pemilik kurikulum | Belum ditentukan | Tidak ditemukan di sumber Scratch repo | Modul dan materi perlu disediakan sebelum dapat digunakan. |
| Scratch Advanced | 5 | Belum ditetapkan pemilik kurikulum | Belum ditentukan | Tidak ditemukan di sumber Scratch repo | Modul dan materi perlu disediakan sebelum dapat digunakan. |
| Scratch Advanced | 6 | Belum ditetapkan pemilik kurikulum | Belum ditentukan | Tidak ditemukan di sumber Scratch repo | Modul dan materi perlu disediakan sebelum dapat digunakan. |
| Scratch Advanced | 7 | Belum ditetapkan pemilik kurikulum | Belum ditentukan | Tidak ditemukan di sumber Scratch repo | Modul dan materi perlu disediakan sebelum dapat digunakan. |
| Scratch Advanced | 8 | Belum ditetapkan pemilik kurikulum | Belum ditentukan | Tidak ditemukan di sumber Scratch repo | Modul dan materi perlu disediakan sebelum dapat digunakan. |
| Scratch Advanced | 9 | Belum ditetapkan pemilik kurikulum | Belum ditentukan | Tidak ditemukan di sumber Scratch repo | Modul dan materi perlu disediakan sebelum dapat digunakan. |
| Scratch Advanced | 10 | Belum ditetapkan pemilik kurikulum | Belum ditentukan | Tidak ditemukan di sumber Scratch repo | Modul dan materi perlu disediakan sebelum dapat digunakan. |
| Scratch Advanced | 11 | Belum ditetapkan pemilik kurikulum | Belum ditentukan | Tidak ditemukan di sumber Scratch repo | Modul dan materi perlu disediakan sebelum dapat digunakan. |
| Scratch Advanced | 12 | Belum ditetapkan pemilik kurikulum | Belum ditentukan | Tidak ditemukan di sumber Scratch repo | Modul dan materi perlu disediakan sebelum dapat digunakan. |

## Status tahap dan engine

Kode peta memiliki tiga label tahap dan batas topik usulan, tetapi objek sumber
modul/topik tidak mendeklarasikan tahap tersebut sebagai metadata kurikulum.
Karena itu label di atas adalah presentasi progres yang diusulkan, bukan fakta
resmi atau kriteria kelulusan/unlock. Pemilik kurikulum perlu mengesahkan batas
tahap sebelum aturan produk bergantung padanya.

## Status kesiapan

- **Scratch Beginner:** 10 topik bersumber dari target 12. Dapat dipetakan ke
  materi yang tersedia; belum lengkap menjadi 12 topik.
- **Scratch Intermediate:** 0 topik valid dari target 12. Jangan tampilkan
  sebagai modul siap digunakan.
- **Scratch Advanced:** 0 topik valid dari target 12. Jangan tampilkan sebagai
  modul siap digunakan.
- Tiga artwork/bioma dan resolver peta bukan bukti bahwa data atau materi untuk
  ketiga modul telah tersedia. Artwork peta tidak diubah oleh audit ini.
