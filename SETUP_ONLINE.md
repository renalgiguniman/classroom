# Setup Online Classroom — Thinkery Classroom Tycoon™

Online Classroom membutuhkan Firebase project milik pemilik website. Mode offline tetap bekerja tanpa Firebase.

## 1. Buat Firebase Project

1. Buka Firebase Console.
2. Create a project.
3. Tambahkan Web App (`</>`).
4. Beri nama, misalnya `thinkery-classroom-tycoon`.

## 2. Aktifkan Anonymous Authentication

1. Firebase Console → Authentication.
2. Sign-in method / Sign-in providers.
3. Aktifkan **Anonymous**.

Siswa tidak perlu membuat email/password. Setiap browser akan mendapat anonymous Firebase UID.

## 3. Buat Realtime Database

1. Firebase Console → Realtime Database.
2. Create Database.
3. Pilih lokasi database yang sesuai.
4. Setelah database jadi, buka tab **Rules**.
5. Copy seluruh isi file `database.rules.json` dari project ini.
6. Paste ke Rules lalu klik **Publish**.

Jangan membiarkan database production dalam public test rules.

## 4. Ambil Firebase Web Config

Setelah Realtime Database sudah dibuat:

1. Firebase Console → Project Settings (ikon gear).
2. General → Your apps → pilih Web App.
3. SDK setup and configuration → pilih **Config**.
4. Copy object `firebaseConfig` lengkap.

Pastikan config memiliki minimal:

- `apiKey`
- `authDomain`
- `databaseURL`
- `projectId`
- `appId`

Contoh bentuknya:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "PROJECT.firebaseapp.com",
  databaseURL: "https://PROJECT.REGION.firebasedatabase.app",
  projectId: "PROJECT",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

## 5. Hubungkan dari dalam game

1. Buka `index.html` melalui website/deployment.
2. Klik **⚙️ SETUP ONLINE** di halaman utama.
3. Paste seluruh `const firebaseConfig = {...}` ke textarea.
4. Klik **SAVE & RELOAD**.
5. Setelah halaman reload, status seharusnya berubah menjadi:

`🟢 Online Classroom ready. Room Code + live leaderboard aktif.`

Setelah itu tombol **CREATE ONLINE ROOM** dan **JOIN ROOM** akan aktif.

## 6. Tes multiplayer

Gunakan dua perangkat/browser berbeda.

### Perangkat A — Guru

1. CREATE ONLINE ROOM.
2. Atur jumlah soal dan starting cash.
3. Generate Room Code.
4. Biarkan waiting room terbuka.

### Perangkat B — Siswa

1. Buka URL website yang sama.
2. JOIN ROOM.
3. Masukkan Room Code.
4. Masukkan nama team.
5. JOIN GAME.

Nama siswa harus muncul secara realtime pada layar guru. Klik START GAME dan cek Live Score setelah siswa menjawab soal.

## 7. Deployment GitHub Pages

Project ini dapat di-upload ke repository GitHub. Workflow `.github/workflows/pages.yml` sudah disediakan.

Jika menggunakan GitHub Pages dan Firebase Authentication menampilkan error `auth/unauthorized-domain`, tambahkan domain GitHub Pages Anda di Firebase Authentication → Settings → Authorized domains.

## Troubleshooting

### `Online Classroom belum terhubung`
Firebase config belum disimpan atau belum lengkap. Klik **SETUP ONLINE**.

### `Firebase gagal terhubung: auth/operation-not-allowed`
Anonymous Authentication belum diaktifkan.

### `Permission denied`
Realtime Database Rules belum dipasang/publish atau struktur rules tidak cocok.

### `databaseURL` tidak ada
Buat Realtime Database terlebih dahulu, lalu copy ulang config Web App dari Firebase Project Settings.

### `auth/unauthorized-domain`
Tambahkan domain website ke Authentication → Settings → Authorized domains.

### Room tidak terlihat di perangkat lain
Pastikan kedua perangkat membuka deployment yang menggunakan Firebase project yang sama dan internet aktif.
