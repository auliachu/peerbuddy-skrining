# Skrining Kesehatan Mental by PeerBuddy

Website lima halaman untuk mengumpulkan 42 jawaban dari PDF penyelenggara. Tema putih dominan dengan aksen **#fa8fa0** dan **#76ade0**. Tampilan menggunakan HTML/CSS/JavaScript; backend, database PostgreSQL, dan autentikasi admin menggunakan Supabase. Hosting yang direncanakan adalah Vercel.

## Yang tersedia

1. Halaman depan: judul, ruang kosong pengganti deskripsi dan teks penyelenggara, 42 pernyataan/4 pilihan, perkiraan 10–15 menit tanpa timer, dan tombol mulai.
2. Data diri: nama, usia, jenis kelamin, email, WhatsApp Indonesia, persetujuan penggunaan data, dan persetujuan menerima hasil.
3. Pertanyaan: teks dan urutan dari **Skrining Psikologis.pdf**, skor 0–3, periode satu minggu terakhir. Enam pernyataan per bagian, tujuh bagian dalam halaman pertanyaan. Semua wajib dijawab; navigasi dan perubahan jawaban tersedia.
4. Konfirmasi: data diri dan seluruh 42 jawaban dapat diperiksa sebelum dikirim.
5. Hasil dan penutup: konfirmasi server, kode pengisian, waktu WIB, skor serta kategori depresi/kecemasan/stres dengan penjelasan dari PeerBuddy, kemudian tombol kontak Instagram **@peerbuddy.official**.

Admin sederhana menyediakan login, detail 42 jawaban beserta kategori dan penjelasan hasil, unduhan CSV per peserta, CSV seluruh peserta, Excel `.xlsx` seluruh peserta, kamus pertanyaan, filter pada data yang sudah dimuat, serta penandaan sudah dihubungi. Tidak ada pengiriman email/WhatsApp otomatis.

## Mulai mencoba desain

Tidak perlu `npm install`. Untuk menjalankan di komputer sendiri, gunakan VS Code Live Server pada folder `public`, atau:

```bash
cd peerbuddy-skrining
python3 -m http.server 8000 --directory public
```

Buka `http://localhost:8000/?demo=1` untuk alur peserta dan `http://localhost:8000/admin.html?demo=1` untuk admin contoh. **Gunakan data fiktif.** Mode pratinjau tidak mengirim data ke database dan menampilkan penutup simulasi. HTML peserta juga bisa dibuka langsung dari folder `public` pada browser yang mendukung file lokal, kemudian memakai tautan mode pratinjau. HTTP lokal lebih konsisten.

URL normal tanpa `?demo=1` akan menutup pengisian sampai konfigurasi Supabase diisi. Tidak ada akun/password admin bawaan, dan tidak ada backend fiktif yang mengaku menyimpan jawaban.

## Mengaktifkan untuk peserta

Ikuti **[PANDUAN_HOSTING.md](PANDUAN_HOSTING.md)**: buat Supabase, jalankan SQL, deploy Edge Function, daftarkan admin, kemudian hubungkan Vercel. Vercel hanya memublikasikan folder `public`; folder database, tes, dan dokumentasi tidak dijadikan halaman publik.

## Struktur

```text
public/                    Halaman peserta dan admin; siap disajikan sebagai situs statis
  config.js                URL Supabase, publishable key, arahan tindak lanjut
  js/questions.js          42 pernyataan dan empat pilihan dari PDF
  js/app.js                Alur peserta
  js/admin.js              Login, daftar/detail jawaban, unduhan
  js/excel.js              Pembentukan workbook Excel
supabase/migrations/       Struktur database, skor mentah, RLS, dan idempotensi
supabase/functions/        Endpoint penyimpanan terverifikasi
scripts/                   Build konfigurasi dan pengujian beban di staging
tests/                     Pengujian logika dan endpoint dengan database tiruan
vercel.json                Konfigurasi hosting statis dan header
```

## Pengelolaan jawaban

- Data utama tersimpan di `public.screening_submissions`, satu baris per pengisian, bukan di file Excel bersama.
- Peserta dapat melihat hasil sendiri setelah mengirim; tidak dapat membaca daftar jawaban, skor, atau data orang lain.
- Admin harus memiliki akun Supabase Auth **dan** tercatat pada `screening_admins`.
- CSV rekap memiliki kolom `Soal_1`–`Soal_42`, skor mentah, dan kategori setiap aspek. CSV individu memiliki 42 baris berisi teks pernyataan dan pilihan jawaban.
- Excel memiliki lembar `Rekap peserta` dan `Kamus pertanyaan`; nomor telepon disimpan sebagai teks.
- Pilihan ekspor tanpa identitas menghapus lima kolom identitas dari rekap. Kode peserta dan jawaban tetap ada; ini merupakan data dengan pengenal kode, bukan jaminan anonimitas penuh.
- Admin dapat mengunduh langsung melalui Table Editor Supabase jika hak dashboard diberikan. Akun website admin cukup untuk penggunaan rutin tanpa akses dashboard Supabase.

## Penyimpanan dan retry

Backend mengirim konfirmasi hanya setelah transaksi database berhasil. Tombol kirim dinonaktifkan selama permintaan berjalan. Kode UUID dan token retry memastikan pengiriman ulang identik mendapatkan tanda terima yang sama, termasuk jika respons pertama terputus setelah transaksi tersimpan. Pengiriman dengan kode sama dan data berbeda ditolak.

Draf peserta disimpan sementara di `sessionStorage` tab yang sama, berlaku dua jam sejak interaksi terakhir, agar refresh tidak menghapus jawaban. Penyimpanan ini bukan database penyelenggara. Identitas, jawaban, token retry, dan isi tinjauan dibersihkan setelah konfirmasi; kode pengisian dan tiga skor ringkas tetap tersedia sementara agar hasil dapat dilihat setelah refresh. Jika penyimpanan browser diblokir, alur tetap berjalan tetapi refresh dapat menghapus draf. Jangan menggunakan data peserta nyata pada mode demo. Browser dapat mempertahankan penyimpanan sesi jika tab dipulihkan, sehingga komputer bersama perlu ditutup/dibersihkan setelah dipakai.

## Dasar instrumen dan skor

Teks dan pilihan diambil dari PDF yang diberikan pengguna. Susunan 42 butir sesuai DASS-42. Peserta dan admin melihat skor mentah setiap aspek, **14 butir, rentang 0–42, tanpa pengali dua**, kategori, serta penjelasan berdasarkan gambar yang disediakan PeerBuddy. Hasil tampil setelah pengiriman dikonfirmasi, termasuk untuk kategori normal; hasil ini bukan diagnosis. Baca **[docs/HASIL_SKRINING.md](docs/HASIL_SKRINING.md)** untuk ambang lengkap, sumber, batas penggunaan instrumen, dan langkah memperbarui pemasangan lama.

Kunci subskala diverifikasi terhadap template resmi DASS; template pertama diterapkan pada kedua bagian 21 butir. Tim harus memeriksa kesesuaian versi terjemahan, kelompok peserta, persetujuan peserta usia 14–17 tahun, dan prosedur penyampaian hasil sebelum peluncuran. Situs tidak menyediakan layanan pemantauan krisis otomatis. Angka 10–15 menit adalah perkiraan antarmuka, bukan durasi yang ditetapkan PDF.

Sumber instrumen resmi:
- https://dass.psy.unsw.edu.au/Download%20files/Dass42.pdf
- https://dass.psy.unsw.edu.au/Download%20files/Dass_template.pdf
- https://dass.psy.unsw.edu.au/DASSFAQ.htm

## Pengujian

Node.js 22.18+ diperlukan untuk tes TypeScript tanpa proses kompilasi. Jalankan `npm test`. Tes ini memakai database tiruan; keberhasilan tes bukan bukti kapasitas paket Supabase/Vercel yang belum dipasang. Baca `docs/PENGUJIAN.md` untuk langkah pengujian staging dan tampilan browser sebelum acara.

Tidak ada janji bebas bug/lag atau kapasitas tak terbatas. Target puluhan/ratusan pengisian harus diuji pada proyek dan paket hosting sebenarnya. Halaman statis ringan; kuota, pembatasan database, dan koneksi pengguna tetap berpengaruh.

## Lisensi komponen

Kode proyek dibuat untuk PeerBuddy. JSZip yang dibundel untuk ekspor Excel memakai lisensi MIT/GPL sebagaimana tercantum pada `public/js/vendor/JSZip-LICENSE.md`. Ilustrasi SVG merupakan ilustrasi pendamping antarmuka, bukan logo resmi PeerBuddy.
