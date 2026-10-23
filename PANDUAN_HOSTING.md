# Rencana hosting: Vercel + Supabase

Paket ini sudah berisi frontend dan kode backend. **Belum terhubung ke akun Supabase/Vercel Anda dan belum menerima data peserta sungguhan.** Anda tidak perlu menyewa VPS untuk arsitektur ini. Akun layanan sebaiknya dimiliki penyelenggara agar data tetap di bawah kendali tim.

## 1. Buat proyek Supabase

1. Buka https://supabase.com dan buat satu proyek. Pilih region yang dekat dengan Indonesia bila tersedia, misalnya Singapore.
2. Simpan password database dengan aman.
3. Catat **Project URL** dan **publishable key** (`sb_publishable_...`), atau anon key lama. Ini dua nilai publik untuk frontend.
4. Buka SQL Editor, salin seluruh `supabase/migrations/202610100001_screening.sql`, lalu jalankan **satu kali**. Migrasi sengaja tidak memakai pembuatan ulang tabel untuk menghindari menimpa data.

SQL membuat tabel jawaban, daftar admin, fungsi penyimpanan, perhitungan skor mentah, RLS, dan metadata retry privat. Jangan melonggarkan RLS atau memberikan SELECT kepada `anon`.

## 2. Siapkan admin

1. Pada Authentication → Users, buat akun admin dengan email dan password. Gunakan pembuatan akun langsung, bukan undangan email. Pastikan akun berstatus terkonfirmasi.
2. Salin UUID pengguna tersebut.
3. Pada SQL Editor jalankan, dengan mengganti UUID contoh:

```sql
insert into public.screening_admins(user_id)
values ('UUID-PENGGUNA-ADMIN-DARI-AUTH');
```

Hanya pengguna dalam daftar ini yang dapat membaca data. Membuat akun Auth saja tidak memberikan akses admin. Untuk menambah admin, ulangi langkah tersebut. Untuk mencabut akses:

```sql
delete from public.screening_admins where user_id = 'UUID-ADMIN';
```

Admin tidak dapat mengubah jawaban atau skor dari website; hanya status tindak lanjut. Pemulihan/reset password dilakukan pemilik proyek lewat pengelolaan akun Supabase; website ini tidak menambahkan fitur email pemulihan otomatis.

## 3. Unggah kode ke GitHub

1. Buat repositori baru, misalnya `peerbuddy-skrining`. Repositori privat boleh digunakan.
2. Unggah isi folder proyek, termasuk `public`, `supabase`, `scripts`, `package.json`, dan `vercel.json`.
3. Jangan mengunggah `.env`, password, service role key, secret key, atau CSV peserta. `public/config.js` hanya boleh berisi nilai publik.

## 4. Buat proyek Vercel

1. Buka https://vercel.com → Add New Project → import repositori GitHub.
2. Gunakan framework **Other**, root proyek folder yang berisi `vercel.json`.
3. Build Command: `node scripts/build.mjs`. Output Directory: `public`. Tidak perlu instalasi paket untuk frontend.
4. Tambahkan Environment Variables:

| Nama | Nilai |
|---|---|
| `PEERBUDDY_SUPABASE_URL` | Project URL Supabase |
| `PEERBUDDY_SUPABASE_PUBLIC_KEY` | Publishable key atau anon key |
| `PEERBUDDY_DEMO_ENABLED` | `false` untuk peluncuran |
| `PEERBUDDY_RESULT_TIMING` | Opsional: arahan kontak/tindak lanjut setelah hasil tampil |

5. Deploy, lalu catat origin produksi, misalnya `https://peerbuddy-skrining.vercel.app` (tanpa garis miring akhir). Website belum dapat menyimpan sampai Edge Function dipasang.

Teks default mengarahkan peserta menghubungi Instagram PeerBuddy setelah membaca hasil langsung. Jika variabel ini pernah diisi teks jadwal lama, hapus atau perbarui nilainya saat deploy ulang.

## 5. Deploy backend Supabase

Jalankan dari root proyek pada komputer Anda yang memiliki Node/npm:

```bash
npx supabase login
npx supabase functions deploy submit-screening --project-ref PROJECT_REF --no-verify-jwt
```

Ganti `PROJECT_REF` dengan referensi proyek Supabase Anda. Endpoint ini sengaja menerima peserta tanpa login; validasi dan penyimpanan dilakukan oleh handler, sedangkan fungsi database tidak bisa dipanggil publik. Verifikasi JWT tetap diperlukan untuk akses admin melalui Supabase Auth/RLS.

Pada pengaturan **Edge Functions → Secrets**, tambahkan:

| Secret | Nilai |
|---|---|
| `PUBLIC_API_KEY` | Publishable key yang sama dengan frontend (nilai ini publik, dipakai untuk mencocokkan konfigurasi) |
| `ALLOWED_ORIGINS` | Origin Vercel, misalnya `https://peerbuddy-skrining.vercel.app` |
| `RATE_LIMIT_SALT` | Teks acak privat panjang, minimal 16 karakter; sebaiknya 32+ karakter |

`SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` disediakan pada lingkungan Edge Functions Supabase. Kunci service role **tidak boleh** masuk Vercel frontend atau GitHub. Bila menggunakan fitur secret key baru alih-alih service role legacy, sesuaikan konfigurasi backend secara terkontrol; paket ini menggunakan variabel service role bawaan.

Beberapa origin dapat dipisahkan koma, misalnya origin produksi dan localhost. Hanya izinkan origin yang Anda gunakan; jangan wildcard seluruh domain Vercel atau `*`. Jika origin produksi berubah setelah pemasangan custom domain, perbarui daftar ini. Header CORS adalah pembatasan browser, bukan pengganti perlindungan backend.

## 6. Uji sebelum dibagikan

1. Buka URL website tanpa `?demo=1`.
2. Isi data fiktif, setujui kedua persetujuan, jawab 42 butir, periksa, dan kirim.
3. Pastikan penutup menampilkan **PB-...**, bukan **DEMO-...**.
4. Buka `/admin.html`, masuk, lalu pastikan ada satu pengisian yang sama di database.
5. Unduh CSV individu, CSV semua, dan Excel; bandingkan jawaban dan kontak.
6. Coba koneksi terputus, klik kirim berulang, akun nonadmin, serta browser HP/desktop.
7. Jalankan pengujian beban di proyek Supabase **terpisah**. Lihat `docs/PENGUJIAN.md`.
8. Hapus data fiktif sebelum peluncuran; penghapusan dilakukan pemilik proyek melalui dashboard Supabase.

## Akses setelah aktif

- Peserta: `https://NAMA-PROYEK.vercel.app/`
- Admin: `https://NAMA-PROYEK.vercel.app/admin.html`
- CSV individu: kolom **CSV** pada baris peserta, atau buka **Lihat → Unduh 42 jawaban CSV**.
- CSV rekap: tombol **CSV seluruh peserta**. Tombol **CSV data tampil** hanya mengekspor hasil filter pada baris yang sudah dimuat.
- Excel: tombol **Excel seluruh peserta**, dengan dua lembar.

## Anggaran

Mulai pengembangan/pilot dengan paket gratis sesuai kuota dan ketentuan layanan. Vercel Hobby diperuntukkan penggunaan personal nonkomersial; evaluasi apakah proyek organisasi Anda sesuai. Harga resmi yang diperiksa 10 Oktober 2026: Vercel Pro mulai US$20/bulan, Supabase Pro mulai US$25/bulan. Tidak ada biaya layanan email/WhatsApp karena tindak lanjut dilakukan manual.

Dengan asumsi anggaran Rp17.000/US$, paket Pro keduanya sekitar **Rp765.000/bulan**, belum termasuk pajak dan pemakaian tambahan. Keduanya tidak otomatis wajib untuk pilot ratusan peserta: tentukan berdasarkan jenis penggunaan, hasil pengujian, dan kebutuhan pengelolaan data. Supabase Free memiliki database 500 MB dan dapat dijeda setelah satu minggu tidak aktif; Pro mencakup backup harian dengan retensi tujuh hari. Ekspor CSV bukan pengganti backup pemulihan penuh.

Domain khusus opsional; alamat bawaan `.vercel.app` cukup. Biaya domain tidak termasuk dan bergantung nama/ekstensi yang dipilih.

Referensi: https://vercel.com/pricing • https://vercel.com/docs/plans/hobby • https://supabase.com/pricing • https://supabase.com/docs/guides/functions • https://supabase.com/docs/guides/database/postgres/row-level-security

## Jika ingin GitHub Pages

Frontend tidak bergantung pada server Vercel, sehingga folder `public` juga bisa disajikan di GitHub Pages. Backend tetap di Supabase. Isi `public/config.js` secara manual dengan nilai publik dan `demoEnabled: false`, lalu publikasikan isi folder `public` sebagai root situs Pages atau melalui workflow Pages. Tambahkan origin GitHub Pages ke `ALLOWED_ORIGINS` (misalnya `https://USERNAME.github.io`; path repo bukan bagian origin). Semua tautan dan aset menggunakan path relatif, sehingga bisa berjalan di subfolder repositori. Pengaturan header `vercel.json` tidak diterapkan oleh GitHub Pages.

## Pengelolaan rutin

Tentukan siapa pemeriksa hasil dan kebijakan retensi data. Teks persetujuan saat ini memberikan akses admin/tim berwenang untuk skrining dan tindak lanjut; tidak memberi persetujuan tambahan untuk penelitian atau pemasaran. Pembersihan data, permintaan penghapusan, dan penyampaian hasil dilakukan tim melalui prosedur internal. Pembatasan endpoint 3.000 pengisian baru per hash IP per jam dibuat tinggi agar satu jaringan kampus tidak cepat diblokir; ini perlindungan dasar, bukan perlindungan bot lengkap. Untuk acara besar, uji jaringan bersama dan pertimbangkan perlindungan bot terkelola bila dibutuhkan.

Metadata pembatasan pengiriman dapat dibersihkan berkala oleh pemilik database:

```sql
delete from private.screening_rate_limits where hour_bucket < now() - interval '7 days';
```

## Revisi hasil langsung (23 Oktober 2026)

Untuk pemasangan baru, jalankan kedua file migrasi SQL secara berurutan. Untuk pemasangan yang sudah aktif, cukup jalankan migrasi tambahan `202610230001_instant_results_consent.sql`, deploy ulang Edge Function, lalu frontend. Langkah lengkap, ambang kategori, dan catatan penggunaan instrumen terdapat di **docs/HASIL_SKRINING.md**.
