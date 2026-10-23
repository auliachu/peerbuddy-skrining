# Hasil pemeriksaan paket v1.0.0

Tanggal: 10 Oktober 2026.

## Selesai diperiksa

- **42 dari 42** pernyataan cocok dengan teks PDF yang diberikan, termasuk urutan butir. Pemeriksaan ekstraksi menggabungkan baris yang terpotong di tabel PDF.
- **21 pengujian otomatis lulus** melalui `npm test`.
- Validasi nama, usia 14–120 tahun, pilihan jenis kelamin, email, WhatsApp, dan kedua persetujuan.
- Jawaban nol diterima; jawaban kosong, kurang dari 42, atau di luar 0–3 ditolak.
- Skor mentah tiga subskala mencakup 42 butir, masing-masing 14 butir/rentang 0–42.
- Alur peserta diuji dengan adapter DOM minimal: data kosong ditolak, navigasi/draf dipertahankan, konfirmasi muncul setelah lengkap, demo tidak memanggil backend, kegagalan penyimpanan tidak menampilkan sukses, dan retry memakai payload yang sama.
- Endpoint diuji terhadap validasi, origin, kunci akses, ukuran body, kegagalan database, respons korup, konflik token/data, dan pemulihan setelah respons hilang.
- **500 pengiriman sintetis serentak dan 50 retry identik** lulus menggunakan database tiruan di memori. Ini bukan pengujian kapasitas hosting nyata.
- CSV menangani koma, tanda kutip, baris baru, Unicode, dan awalan formula yang berbahaya.
- Workbook `.xlsx` berhasil dibuka dengan openpyxl, memiliki dua lembar, mempertahankan nomor telepon sebagai teks, dan tidak menjalankan teks berawalan formula.
- Tidak ada ID HTML ganda, referensi aset lokal hilang, atau label formulir yang mengarah ke ID tidak ada.
- Aturan responsif untuk HP/tablet/desktop dan kedua warna tema tersedia di CSS; ini pemeriksaan sumber, bukan render browser.
- `npm run build` berhasil dalam mode belum dikonfigurasi.

## Batas verifikasi

Belum ada kredensial/proyek Supabase dan Vercel milik penyelenggara. Migrasi SQL, kebijakan RLS, akses admin nyata, penyimpanan produksi, serta pengujian beban end-to-end perlu dijalankan setelah pemasangan. Pada pemeriksaan awal 10 Oktober, kontrol browser belum tersedia. Pemeriksaan browser untuk revisi 23 Oktober dijelaskan di bawah; Safari dan perangkat HP fisik belum diuji.

Gunakan langkah pada **PANDUAN_HOSTING.md** dan **docs/PENGUJIAN.md** sebelum membuka skrining untuk peserta sebenarnya. Paket belum dihosting atau terhubung ke database nyata; pratinjau bersifat simulasi yang diberi penanda.

## Revisi halaman depan

Deskripsi pengantar dan baris penyelenggara dihapus sesuai permintaan. Elemen kosong dengan tinggi responsif mempertahankan ruangnya. Keberadaan pengganti, hilangnya kedua teks, dan kesamaan perubahan pada pratinjau serta sumber dalam ZIP diperiksa.

## Revisi hasil langsung — 23 Oktober 2026

- **29 pengujian otomatis lulus**, termasuk semua 129 skor yang mungkin pada tiga aspek dan semua batas kategori.
- Seluruh kategori normal/ringan/sedang/parah/sangat parah memiliki penjelasan untuk masing-masing aspek; teks berasal dari gambar PeerBuddy.
- Semua jawaban nol, satu, dua, dan tiga menghasilkan tiga hasil; kategori dihitung per aspek. Nol tidak diperlakukan sebagai jawaban kosong.
- Kegagalan penyimpanan tetap berada di halaman konfirmasi; hasil baru tampil setelah tanda terima yang sah. Retry mempertahankan jawaban yang sama.
- Refresh mempertahankan tiga skor ringkas setelah identitas dan 42 jawaban dibersihkan. Sesi lama tanpa skor tidak diberi hasil normal buatan; draf lama meminta persetujuan terbaru.
- **Chrome desktop, mode demo:** alur dari awal, data contoh, 42 pilihan, konfirmasi, tiga kartu hasil, dan refresh berhasil. Contoh semua pilihan 1 menghasilkan Depresi 14/Sedang, Kecemasan 14/Sedang, dan Stres 14/Normal.
- Pratinjau HTML mandiri diperiksa di Chrome: hasil yang sama tampil, aset dan skrip dibundel, mode demo tetap jelas, tidak ada penyimpanan ke database.
- Tautan kontak diperiksa menuju Instagram PeerBuddy tanpa menyisipkan data peserta pada URL; tidak ada pesan otomatis yang dikirim.
- Detail admin menampilkan kategori campuran sesuai skor contoh. CSV yang diunduh dari browser berhasil dibaca: tiga peserta, 60 kolom, termasuk tiga kolom kategori yang sesuai.
- Generator Excel dan isi workbook lulus pengujian otomatis. Notifikasi unduhan Excel tidak tertangkap pada sesi browser otomatis, sehingga pengujian tersebut tidak diklaim sebagai keberhasilan unduh Excel melalui browser.
- Masalah `crypto.randomUUID` pada HTTP lokal ditemukan dan diperbaiki dengan fallback `crypto.getRandomValues`; tes UUID serta alur Chrome kembali lulus.
- Migrasi tambahan menerima persetujuan v2 dan mempertahankan v1 untuk retry. Migrasi SQL belum dijalankan pada Supabase nyata; langkah pembaruan berada di `docs/HASIL_SKRINING.md`.

Tidak ada deployment atau pengujian kapasitas produksi pada revisi ini. Pemeriksaan teknis bukan validasi klinis; catatan kesesuaian penggunaan DASS tersedia di `docs/HASIL_SKRINING.md`.
