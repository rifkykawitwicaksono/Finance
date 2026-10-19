# Bubu & Dudu — Catatan Keuangan

Aplikasi pencatat keuangan pribadi bertema pastel dengan maskot panda dan beruang cokelat. Dibuat sebagai SPA statis yang dapat dipublikasikan melalui GitHub Pages dan dipakai offline setelah aset utama berhasil di-cache.

## Fitur

- Dashboard saldo, pemasukan bulan ini, pengeluaran bulan ini, dan savings rate.
- Tambah, edit, hapus, cari, dan filter transaksi.
- Kategori pemasukan/pengeluaran dan ekspor CSV.
- Budget per kategori dengan progress bar dan peringatan visual.
- Grafik distribusi pengeluaran dan perbandingan pemasukan/pengeluaran.
- Wallpaper preset atau unggahan gambar, pengaturan blur dan overlay.
- Penyimpanan lokal melalui `localStorage`; tidak memerlukan akun/server.
- PWA dengan manifest dan service worker untuk akses offline.

## File proyek

- `index.html` — struktur aplikasi.
- `style.css` — desain responsif dan tema.
- `script.js` — logika transaksi, grafik, budget, dan wallpaper.
- `manifest.json` — konfigurasi instalasi PWA.
- `sw.js` — cache aset dan fallback offline.
- `icon.svg` — ikon aplikasi yang digunakan manifest.
- `README.md` — dokumentasi.

> Catatan: `icon.svg` disertakan sebagai file aset tambahan agar ikon instalasi PWA dapat ditampilkan dengan benar. Letakkan semua file di direktori root repositori yang sama.

## Publikasi ke GitHub Pages

1. Buat repositori GitHub baru, misalnya `bubu-dudu-finance`.
2. Unggah seluruh file proyek ke **root** repositori: `index.html`, `style.css`, `script.js`, `manifest.json`, `sw.js`, dan `icon.svg`.
3. Buka repositori → **Settings** → **Pages**.
4. Pada **Build and deployment**, pilih **Deploy from a branch**.
5. Pilih branch `main` dan folder `/ (root)`, lalu klik **Save**.
6. Tunggu proses deployment selesai. Buka URL yang diberikan GitHub, biasanya `https://USERNAME.github.io/NAMA-REPO/`.
7. Buka URL tersebut sekali ketika perangkat online. Service worker hanya dapat didaftarkan pada HTTPS atau localhost; GitHub Pages menggunakan HTTPS.

## Instalasi di Android

1. Buka URL GitHub Pages melalui Chrome.
2. Tunggu halaman selesai dimuat dan buka sekali saat online.
3. Tekan menu tiga titik Chrome.
4. Pilih **Install app** atau **Add to Home screen** (label dapat berbeda menurut perangkat).
5. Ikuti konfirmasi. Aplikasi akan muncul di layar utama.

## Instalasi di iPhone/iPad

1. Buka URL GitHub Pages melalui Safari.
2. Tekan tombol **Share**.
3. Pilih **Add to Home Screen**.
4. Ubah nama jika perlu, lalu tekan **Add**.

## Penggunaan offline dan batasan penting

- Transaksi, budget, dan wallpaper tersimpan di `localStorage` pada browser/perangkat yang sedang digunakan. Data tidak otomatis tersinkron antarperangkat dan dapat hilang jika data situs/browser dihapus. Ekspor CSV secara berkala sebagai cadangan.
- Service worker meng-cache aset lokal dan mencoba menyimpan Chart.js dari CDN. Untuk memastikan cache awal terisi, buka aplikasi sekali ketika online sebelum memutus koneksi.
- Jika Chart.js belum berhasil di-cache, fitur transaksi dan budget tetap dapat digunakan offline, tetapi grafik mungkin tidak tersedia sampai koneksi kembali.
- Font Google bersifat eksternal dan bisa tidak tersedia offline; browser akan menggunakan font fallback.
- Wallpaper yang diunggah disimpan di browser. Gambar besar dapat memenuhi kuota penyimpanan; gunakan gambar kecil.
- Angka keuangan disimpan lokal di perangkat, bukan dienkripsi khusus oleh aplikasi. Gunakan kunci layar perangkat dan jangan gunakan perangkat bersama untuk data sensitif.
- Ini aplikasi pencatatan sederhana, bukan layanan perbankan atau nasihat keuangan.

## Pengembangan lokal

Jangan membuka `index.html` langsung melalui `file://` jika ingin menguji PWA. Jalankan server lokal sederhana, misalnya dengan ekstensi Live Server di VS Code atau `python -m http.server`, lalu akses `http://localhost:8000`. Service worker mengizinkan `localhost` untuk pengembangan.
