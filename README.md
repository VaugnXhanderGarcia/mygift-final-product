# MyGift Final Product - MySQL Version

This version uses Angular + Node.js/Express + MySQL. It includes:

- Public customer kiosk ordering page
- QR-code-friendly public ordering flow
- Admin login dashboard
- Product/menu management
- Order/reservation monitoring
- Pickup date and pickup time reservation
- Counter payment only

## Default Admin

Email: `admin@mygift.com`
Password: `admin123`

## Local Setup

### 1. Start MySQL
Use XAMPP/WAMP/MySQL Server. Make sure MySQL is running.

### 2. Backend

```powershell
cd "C:\Users\Vaugn Xhander Garcia\Downloads\MyGift-Final-Product-MySQL\mygift-backend"
npm install
npm run start:dev
```

Backend URL: `http://localhost:4000`

The backend will automatically create the database `mygift_db` and create the needed tables.

If your MySQL root account has a password, edit `mygift-backend/.env`:

```env
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=mygift_db
```

### 3. Frontend

Open another PowerShell terminal:

```powershell
cd "C:\Users\Vaugn Xhander Garcia\Downloads\MyGift-Final-Product-MySQL\mygift-frontend"
npm install
npm start
```

Frontend URL: `http://localhost:4200`

## QR Code Usage

The QR code should point customers to the public customer ordering page:

```text
http://localhost:4200
```

When deployed later, replace it with your deployed frontend URL.
