# 🖼️ Gallery Multi-Image Selection

Dokumen ini menjelaskan fitur seleksi banyak gambar sekaligus dari Gallery Tool pada Public Designer.

## 🌟 Overview
Fitur ini memungkinkan administrator produk untuk menentukan batas jumlah gambar yang dapat dipilih pelanggan dari satu slot Gallery. Pelanggan dapat menambahkan beberapa gambar tambahan ke dalam kanvas, bukan sekadar mengganti gambar placeholder.

## 🛠️ Konfigurasi (Admin)
Di dalam `GalleryTool`, pada bagian **Advanced Settings**, tersedia dua kontrol baru:
1.  **Min Images**: Jumlah minimum gambar yang harus dipilih (future enforcement).
2.  **Max Images**: Batas maksimum gambar yang dapat ditambahkan ke kanvas dari slot ini.
    *   Jika **Max Images = 1**: Klik gambar di gallery akan mengganti gambar placeholder (perilaku lama).
    *   Jika **Max Images > 1**: Klik gambar di gallery akan menambahkan elemen gambar baru ke kanvas.

## ⚡ Perilaku di Public Designer
1.  **Penambahan Dinamis**: Saat pelanggan mengklik gambar di gallery (dengan Max > 1), sistem akan membuat elemen `image` baru.
2.  **Naming & Semantic**: Elemen baru akan diberi nama sesuai label gambar di Gallery atau nama file aslinya.
3.  **Positioning**: Elemen baru ditambahkan dengan sedikit offset dari posisi elemen gallery asli agar tidak bertumpuk sempurna.
4.  **Sidebar Filtering**: Untuk menjaga kebersihan sidebar "Your Customization", gambar addon ini **disembunyikan** dari list utama di sebelah kiri.
5.  **Layer Management**: Gambar addon tetap muncul di panel **Summary (Layer List)** di sebelah kanan. Pelanggan dapat mengelola (move, resize, rotate) atau menghapus gambar tersebut menggunakan icon Trash yang tersedia.

## 📑 Catatan Teknis
*   Prop `onAddElement` ditambahkan ke `PublicCustomizationPanel`.
*   ID elemen dinamis menggunakan prefix `gallery-added-`.
*   Pengecekan limit dilakukan di level UI (gallery click handler).

---
*Terakhir diperbarui: 7 Februari 2026*
