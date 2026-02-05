# Panduan Setup Bunny CDN

Gunakan panduan ini untuk mengkonfigurasi Bunny CDN agar dapat mendistribusikan aset dari S3 bucket Anda.

## 1. Buat Pull Zone Baru
1. Login ke [Bunny CDN Dashboard](https://panel.bunny.net/).
2. Klik **Add Pull Zone**.
3. **Name**: Pilih nama unik (contoh: `imcst-assets`).
4. **Origin URL**: Masukkan URL publik S3 bucket Anda.
   * Format: `https://[bucket-name].[region].linodeobjects.com` 
   * (Contoh: `https://custom-imcst.us-east-1.linodeobjects.com`)
5. **Type**: Pilih **Standard**.
6. Klik **Add Pull Zone**.

## 2. Konfigurasi Header & CORS (Penting!)
Agar font dan gambar dapat dimuat dengan benar di designer:
1. Masuk ke Pull Zone yang baru dibuat.
2. Navigasi ke **Headers** di menu kiri.
3. Aktifkan **CORS (Cross-Origin Resource Sharing)**.
4. Pada bagian **Add Request Header**, tambahkan:
   * **Header Name**: `Vary`
   * **Value**: `Origin`
5. Klik **Save**.

## 3. Konfigurasi SSL
1. Navigasi ke **SSL & Certificate**.
2. Klik **Free Let's Encrypt Certificate** jika menggunakan hostname default Bunny CDN.
3. Tunggu proses aktivasi selesai.

## 4. Update file .env
Setelah Pull Zone aktif, Anda akan mendapatkan **Hostname** (contoh: `imcst-assets.b-cdn.net`).
Update file `.env` di folder backend Anda:

```env
ENABLE_CDN=true
CDN_URL=https://imcst-assets.b-cdn.net
```

## 5. Sinkronisasi Cache
Jika Anda melakukan perubahan pada aset di S3 dan tidak langsung muncul di CDN:
* Gunakan menu **Purge Cache** -> **Purge Everything** di dashboard Bunny.
