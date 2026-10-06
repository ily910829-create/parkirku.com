# Parkirku — prototipe parkir digital

Situs statis berbahasa Indonesia untuk mencoba tiket parkir digital, pencatatan masuk/keluar, kapasitas demo, voucher VIP, pencarian lokasi, dan ekspor CSV. Metode pembayaran pada panel demo hanya tunai.

## Menjalankan

Untuk melihat halaman, buka `index.html` di Chrome. Untuk mengaktifkan kamera dan mode aplikasi offline (PWA), sajikan folder ini melalui localhost atau hosting HTTPS. Contoh di komputer dengan Python: `python -m http.server 8000` dari folder ini, lalu buka `http://localhost:8000`.

## Menerbitkan dengan GitHub Pages

Buat repositori GitHub publik baru, unggah **isi** folder ini ke tingkat teratas repositori (sehingga `index.html` berada di root), lalu buka **Settings → Pages** dan pilih `Deploy from a branch`, branch `main`, folder `/(root)`, kemudian simpan. Tunggu workflow Pages selesai; URL situs muncul pada halaman Pages dengan pola `https://NAMA-AKUN.github.io/NAMA-REPOSITORI/`. GitHub Free mensyaratkan repositori publik untuk GitHub Pages. Situs dan semua berkas pada repositori publik dapat dilihat siapa saja.

Setelah dibuka sekali saat online, berkas inti dapat disimpan oleh service worker untuk pemuatan offline. Rekaman tersimpan di localStorage browser yang sama; hapus data browser berarti menghapus rekaman demo. Tiket bisa diunduh sebagai catatan teks ke perangkat. Fitur kamera bergantung pada dukungan `BarcodeDetector` di Chrome serta izin kamera.

## Batas prototipe

Data lokasi, tarif, kapasitas, dan voucher hanyalah contoh Makassar yang tertanam di halaman. Sistem ini belum membagikan data antarperangkat, merekonsiliasi setoran uang tunai, mencegah tiket palsu, atau mengelola akun/laporan lintas cabang. Untuk pemakaian nyata diperlukan API/backend bersama, basis data, autentikasi dan otorisasi petugas/pemilik, log audit, konfigurasi lokasi dan tarif resmi, kebijakan privasi, serta hosting HTTPS. Demo mencatat nominal transaksi tunai yang nilainya hanya tarif contoh.

`parkirku.com` dan URL publik belum tersedia dari prototipe ini. Domain perlu didaftarkan dan folder ini perlu diterbitkan ke layanan hosting publik. Setelah publik, pengindeksan Google tetap bergantung pada crawler dan konfigurasi situs; nama domain sendiri belum menjamin muncul di hasil pencarian. Situs statis demo ini tidak layak menjadi sistem bisnis produksi sebelum backend dan penyimpanan terpusat tersedia.
