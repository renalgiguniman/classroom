# Quick Start

Untuk mengaktifkan Room Code + Live Score, baca **SETUP_ONLINE.md**. Versi terbaru juga menyediakan tombol **SETUP ONLINE** langsung di halaman utama.

# THINKERY CLASSROOM TYCOON™ — Online Classroom

Web game edukasi berbasis **HTML + CSS + Vanilla JavaScript** dengan:

- Offline Tycoon gameplay
- Teacher Question Builder
- Room Code 6 karakter
- Firebase Anonymous Authentication
- Firebase Realtime Database
- Waiting room
- Self-paced multiplayer
- Live class score / leaderboard
- Teacher live dashboard
- Reconnect identity via localStorage
- GitHub Pages workflow

## 1. Jalankan versi online

Aplikasi ini adalah static website. Untuk pengujian, jalankan melalui HTTP/HTTPS (GitHub Pages, Vercel, VS Code Live Server, atau local web server), bukan mengandalkan `file://`.

Contoh local server:

```bash
python -m http.server 8080
```

Lalu buka `http://localhost:8080`.

## 2. Buat Firebase Project

1. Buka Firebase Console dan buat project baru.
2. Tambahkan **Web App**.
3. Salin Firebase Web App configuration.
4. Buka **Authentication > Sign-in method** dan aktifkan **Anonymous**.
5. Buka **Realtime Database** dan buat database.
6. Pilih region yang sesuai dengan lokasi pengguna Anda.
7. Buka tab **Rules** di Realtime Database dan ganti rules dengan isi `database.rules.json`.

> Jangan menggunakan Test Mode untuk production. Firebase Realtime Database secara default sebaiknya dilindungi Authentication + Security Rules.

## 3. Isi konfigurasi Firebase

Buka `firebase-config.js` lalu ganti placeholder:

```js
window.CLASSROOM_TYCOON_FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "...",
  databaseURL: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

`databaseURL` wajib sesuai URL Realtime Database yang diberikan Firebase Console.

Firebase Web config bukan pengganti security rules. Jangan pernah menaruh **service account, Firebase Admin private key, atau secret server credential** di repository/frontend.

## 4. Authorized Domain

Jika Firebase Authentication menampilkan error bahwa domain tidak diizinkan, tambahkan domain website Anda pada:

**Firebase Console > Authentication > Settings > Authorized domains**

Contoh GitHub Pages:

```text
username.github.io
```

Untuk local development, tambahkan `localhost` secara manual bila diperlukan.

## 5. Deploy ke GitHub Pages

Project sudah memiliki:

```text
.github/workflows/pages.yml
```

Langkah:

1. Buat repository GitHub baru, misalnya `classroom-tycoon`.
2. Upload/push seluruh isi folder project ke branch `main`.
3. Buka **Repository Settings > Pages**.
4. Di **Build and deployment > Source**, pilih **GitHub Actions**.
5. Push ke `main` akan menjalankan workflow deployment.
6. Setelah Action sukses, buka URL GitHub Pages Anda.

## 6. Cara bermain online

### Guru

1. Buka website.
2. Masuk **Teacher Mode** dan edit question bank bila perlu.
3. Pilih **Create Online Room**.
4. Atur jumlah soal, difficulty, starting cash, dan max players.
5. Bagikan Room Code kepada siswa.
6. Tunggu siswa masuk.
7. Tekan **Start Game**.
8. Pantau Teacher Live Dashboard.
9. Tekan **End Game** untuk mengakhiri room.

### Siswa / Team

1. Buka website yang sama.
2. Pilih **Join Room**.
3. Masukkan Room Code.
4. Masukkan nama team.
5. Tunggu guru menekan Start.
6. Jawab soal, beli bisnis, upgrade, dan kejar Net Worth.
7. Tekan **Live Score** untuk melihat posisi kelas.

## 7. Arsitektur data

### localStorage

Digunakan untuk:

- Question bank guru di browser host
- Nama player terakhir
- Room terakhir
- Local game cache
- Preference sound

### Firebase Realtime Database

Digunakan untuk:

- Room status
- Question set room
- Daftar player
- Player score/state
- Live leaderboard
- Teacher dashboard

Cloud database adalah source of truth untuk room dan live score; localStorage adalah cache/penyimpanan lokal.

## 8. Catatan anti-cheat

Versi ini dibuat untuk gamifikasi kelas, bukan kompetisi berhadiah. Perhitungan jawaban dan ekonomi masih dilakukan pada browser player lalu state penting disinkronkan ke database. Siswa yang sengaja memodifikasi JavaScript melalui developer tools secara teoritis dapat memanipulasi state.

Jika nanti membutuhkan anti-cheat yang lebih kuat, pindahkan validasi jawaban dan transaksi ekonomi ke backend / Cloud Functions.

## 9. File utama

```text
index.html
styles.css
app.js
firebase-config.js
database.rules.json
.nojekyll
.github/workflows/pages.yml
```
