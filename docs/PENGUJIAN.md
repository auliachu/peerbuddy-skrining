# Pengujian sebelum peluncuran

Pengujian otomatis pada paket memeriksa 42 butir, validasi peserta dan persetujuan, skor mentah, proteksi CSV, XML workbook, respons backend, serta pengiriman ulang dan kegagalan. Database pada tes otomatis adalah tiruan. SQL/RLS dan kapasitas layanan harus diuji pada Supabase yang benar-benar dipasang.

## Pemeriksaan browser

Uji pada lebar 360/390 px (HP), 768 px (tablet), serta 1366/1440 px (desktop). Pastikan:
- Halaman depan tetap menggunakan komposisi dua kolom di desktop dan satu kolom di HP.
- Teks, pilihan, dan tombol tidak terpotong atau menimbulkan scroll horizontal pada halaman peserta.
- Semua kontrol dapat digunakan dengan keyboard, fokus terlihat, dan pesan kesalahan terbaca.
- Kembali ke bagian sebelumnya mempertahankan jawaban, dan refresh dalam dua jam memulihkan draf jika penyimpanan sesi tersedia.
- Nol adalah jawaban valid, bukan dianggap kosong. Semua 42 butir wajib lengkap sebelum konfirmasi.
- Teks kontak dan angka usia valid; HTML berbahaya pada nama ditampilkan sebagai teks.
- Setelah respons server gagal/terputus, tidak muncul halaman yang mengaku tersimpan. Retry menggunakan kode/data yang sama.
- Setelah berhasil, hanya kode/tanda terima dan tiga skor ringkas yang tersisa dalam draf; identitas dan jawaban dibersihkan.
- Mode demo menampilkan penutup simulasi dan tidak mengirim permintaan penyimpanan.
- Admin nonberwenang tidak dapat membaca tabel, dan logout menyembunyikan data.

## Uji database/RLS

1. Jalankan migrasi pada proyek pengujian.
2. Panggil REST tabel dengan publishable/anon key saja: tidak boleh memperoleh baris peserta.
3. Akun Auth yang tidak ada di `screening_admins` tidak boleh memperoleh baris.
4. Akun admin dapat membaca dan memperbarui `followup_status`/`contacted_at`, tetapi tidak boleh mengubah identitas, skor, atau jawaban dari REST API.
5. Pemanggilan langsung RPC `submit_screening` dengan publishable key harus ditolak.
6. Endpoint Edge menerima payload valid, menolak jawaban kurang dari 42, nilai di luar 0–3, kontak tidak valid, dan persetujuan yang belum lengkap.
7. Dua permintaan serentak dengan UUID/token/data sama menghasilkan satu baris dan kode sama.
8. Kode sama dengan data/token berbeda menghasilkan konflik, tanpa membocorkan data baris lama.

## Beban staging

**Gunakan proyek khusus pengujian dengan data fiktif**, bukan database peserta asli. Variabel dapat diatur lewat pengaturan terminal/lingkungan kerja:

```text
CONFIRM_TEST_DATABASE=YES
TEST_SUPABASE_URL=https://PROJECT_REF_TEST.supabase.co
TEST_PUBLIC_KEY=publishable-key-proyek-test
TEST_ORIGIN=https://website-test.vercel.app
TEST_USERS=500
TEST_CONCURRENCY=100
```

Set origin yang sama pada `ALLOWED_ORIGINS` Edge Function proyek test. Jalankan `node scripts/load-test.mjs`. Ulangi dengan `TEST_CONCURRENCY=500` jika sesuai kapasitas proyek test. Skrip mencatat keberhasilan, kegagalan, p95 waktu respons, status HTTP, dan kesamaan tanda terima untuk 20 retry.

Skrip menguji **pengiriman jawaban ke backend**, bukan 500 browser yang membaca halaman secara bersamaan. Periksa juga frontend Vercel, kuota dashboard layanan, jumlah baris database, dan penampilan nyata di browser. Target awal yang disarankan: semua permintaan valid tersimpan, retry tidak menambah baris, tidak ada error 5xx/429 pada beban rencana, serta p95 pengiriman di bawah lima detik pada koneksi uji. Ini target evaluasi, bukan jaminan paket gratis.

Simpan laporan hasil pengujian, sesuaikan paket/konfigurasi jika target belum terpenuhi, dan bersihkan semua baris berlabel LOAD TEST sesudah pengujian.

## Hasil langsung

- Periksa kelima kategori untuk setiap aspek dan kesesuaian teks dengan lampiran PeerBuddy.
- Nol/maksimum dan kategori campuran harus menampilkan tiga hasil setelah server mengonfirmasi.
- Putuskan jaringan: jangan tampilkan hasil atau sukses sebelum tanda terima yang sah.
- Refresh setelah sukses: hasil tetap ada; nama, kontak, dan 42 jawaban tidak ada dalam draf.
- Pada sesi lama tanpa skor, tampilkan informasi meminta hasil melalui kode; jangan mengisi kategori normal sebagai pengganti.
- Verifikasi tombol hasil menuju Instagram PeerBuddy tanpa menyisipkan data peserta pada URL.
- Ekspor rekap harus memuat kategori depresi/kecemasan/stres sesuai skor database.
