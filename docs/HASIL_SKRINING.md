# Hasil langsung — revisi 23 Oktober 2026

Setelah 42 jawaban lengkap dikirim dan server mengonfirmasi penyimpanan, peserta melihat skor, kategori, rentang, dan penjelasan untuk **Depresi**, **Kecemasan**, dan **Stres**. Semua kategori ditampilkan, termasuk normal. Setiap aspek dihitung sendiri; tidak ada satu kategori gabungan atau diagnosis otomatis.

Penjelasan 15 kombinasi aspek/kategori disalin dari tiga gambar yang diberikan PeerBuddy pada 23 Oktober 2026. Kata “Stres” digunakan sebagai label bahasa Indonesia untuk judul “STRESS” pada gambar. Teks, ambang skor, dan fungsi `interpretScores` berada di `public/js/core.js` dan dipakai bersama oleh halaman peserta, detail admin, serta ekspor rekap.

## Ambang skor DASS-42

| Kategori | Depresi | Kecemasan | Stres |
| --- | --- | --- | --- |
| Normal | 0–9 | 0–7 | 0–14 |
| Ringan | 10–13 | 8–9 | 15–18 |
| Sedang | 14–20 | 10–14 | 19–25 |
| Parah | 21–27 | 15–19 | 26–33 |
| Sangat parah | 28–42 | 20–42 | 34–42 |

Skor adalah penjumlahan **14 butir per aspek**, masing-masing 0–3. Rentang 0–42 dan **tanpa pengali dua**. Pengali dua berlaku pada DASS-21, bukan instrumen 42 butir ini. Nol adalah jawaban sah. Skor kosong/tidak sah tidak pernah dianggap nol atau normal.

Sumber pemeriksaan metode dan ambang:

- [UNSW DASS FAQ, bagian 30](https://www2.psy.unsw.edu.au/groups/dass/DASSFAQ.htm): penjumlahan butir dan perbedaan DASS-42/DASS-21.
- [Laporan HETI NSW, Tabel 3, halaman PDF 26](https://www.heti.nsw.gov.au/__data/assets/pdf_file/0017/442214/pamela-stanford-final-report.pdf): kelima rentang skor ketiga aspek.

**Kesesuaian penggunaan instrumen:** FAQ resmi UNSW bagian 21 membatasi administrasi DASS melalui situs/aplikasi publik dan menyatakan hasil untuk kelompok terbatas dikembalikan kepada klinisi/peneliti. Tampilan hasil langsung ini dibuat sesuai permintaan penyelenggara, belum merupakan validasi klinis atau izin publikasi instrumen. PeerBuddy perlu meninjau izin, cara penggunaan, terjemahan, kelompok peserta, dan interpretasi bersama tenaga profesional sebelum dipakai publik. Teks “hasil skrining bukan diagnosis” selalu ditampilkan.

## Tindak lanjut dan privasi

Tombol setelah hasil menuju Instagram `@peerbuddy.official`. Peserta diminta menyertakan kode pengisian. Tautan tidak mengirim identitas, jawaban, atau skor melalui URL dan tidak mengirim pesan otomatis.

Setelah penyimpanan dikonfirmasi, identitas dan 42 jawaban dibersihkan dari draf browser. Hanya tiga skor ringkas serta tanda terima disimpan sementara dalam tab yang sama hingga kedaluwarsa dua jam sejak interaksi terakhir. Refresh mempertahankan hasil; ini bukan pengambilan hasil dari database melalui endpoint publik. Sesi versi lama yang sudah menghapus jawaban tetapi belum menyimpan skor menampilkan pemberitahuan untuk meminta hasil melalui kode pengisian; tidak menebak hasil.

Persetujuan baru memakai `peerbuddy-2026-10-v2`. Draf lama yang belum dikirim perlu menyetujui ulang. Permintaan v1 yang sedang menunggu konfirmasi tetap dapat dicoba ulang dengan payload yang sama.

## Memperbarui pemasangan yang sudah ada

1. Jalankan migrasi tambahan `supabase/migrations/202610230001_instant_results_consent.sql` melalui SQL Editor atau `supabase db push`. Untuk pemasangan baru, jalankan kedua migrasi secara berurutan.
2. Deploy ulang Edge Function `submit-screening` dari paket ini agar menerima versi persetujuan v2.
3. Deploy ulang folder `public` di Vercel/GitHub Pages sesuai panduan. Bila sebelumnya mengisi `PEERBUDDY_RESULT_TIMING`, hapus atau ganti isinya menjadi arahan menghubungi PeerBuddy; nama variabel lama dipertahankan agar konfigurasi tetap kompatibel.

Tidak perlu menghapus tabel, menyalin ulang data, mengubah kebijakan RLS, atau membuka endpoint baca bagi peserta. Kategori ekspor dihitung dari skor database; jawaban asli dan skor mentah tetap dipertahankan.

## Pemeriksaan fitur

Pengujian memeriksa setiap skor 0–42 pada ketiga aspek (129 kombinasi), hasil nol/maksimal, kategori terpisah, skor tidak sah, ekspor rekap, hasil setelah konfirmasi, kegagalan/retry, refresh, serta draf dan tanda terima versi lama. Tes backend menggunakan database tiruan; migrasi dan layanan produksi harus diuji pada proyek Supabase sebenarnya.
