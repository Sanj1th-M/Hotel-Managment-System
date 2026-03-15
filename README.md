<h1 align="center">🏨 Hotel Management System</h1>

<p align="center">
  A full-stack hotel room booking and management platform built with the <b>PERN Stack</b><br/>
  <sub>PostgreSQL · Express · React · Node.js</sub>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/PostgreSQL-15+-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?logo=tailwindcss&logoColor=white" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/License-ISC-blue" alt="License" />
</p>

---

## ✨ Features

| Category | Details |
|----------|---------|
| **Dashboard** | Real-time stats — total rooms, occupancy, active bookings, revenue overview |
| **Room Management** | Full CRUD with image upload, room types (AC / NON AC / VIP), floor mapping, status tracking |
| **Booking Engine** | Create, update, cancel bookings with automatic date overlap detection and price calculation |
| **Authentication** | Secure JWT-based auth via HttpOnly cookies — no tokens in localStorage |
| **Role-Based Access** | Admin and Staff roles with route-level permission guards |
| **Security Hardened** | Helmet CSP, rate limiting, input validation, SQL injection prevention, XSS protection |

---

## 🏗️ Tech Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| **Node.js + Express** | REST API server |
| **PostgreSQL** | Relational database with transactions |
| **JWT + bcrypt** | Authentication & password hashing |
| **Helmet** | Security headers (CSP, HSTS, X-Frame-Options) |
| **express-rate-limit** | Brute-force & API abuse protection |
| **express-validator** | Input validation & sanitization |
| **Multer** | Room image upload handling |
| **Pino** | Structured JSON logging (redacts sensitive headers) |

### Frontend
| Technology | Purpose |
|-----------|---------|
| **React 18** | UI framework with hooks |
| **Vite** | Fast dev server & build tool |
| **TailwindCSS** | Utility-first CSS styling |
| **React Router v6** | Client-side routing |
| **React Hook Form + Zod** | Form handling with schema validation |
| **Axios** | HTTP client with interceptors |
| **Lucide React** | Icon library |
| **React Hot Toast** | Toast notifications |

---

## 📁 Project Structure

```
hotel-managment/
├── client/                  # React frontend (Vite)
│   ├── src/
│   │   ├── components/      # Reusable UI components (Layout, ImageUpload)
│   │   ├── context/         # AuthContext (cookie-based session management)
│   │   ├── pages/           # Page components (Dashboard, Rooms, Bookings, Login)
│   │   └── services/        # Axios API client
│   └── .env                 # Frontend env vars (VITE_API_URL)
│
├── server/                  # Express backend
│   ├── config/              # Database connection pool
│   ├── controllers/         # Route handlers (auth, rooms, bookings, dashboard)
│   ├── middleware/           # Auth, role, error handler, file upload
│   ├── models/              # SQL query modules (User, Room, Booking)
│   ├── routes/              # Express route definitions
│   ├── scripts/             # DB init, seed, migration scripts
│   ├── utils/               # Logger configuration
│   └── .env.example         # Environment template
│
├── .gitignore
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **PostgreSQL** ≥ 15 (running locally or remote)
- **npm** or **yarn**

### 1. Clone the repository

```bash
git clone https://github.com/Sanj1th-M/Hotel-Managment-System.git
cd Hotel-Managment-System
```

### 2. Setup Backend

```bash
cd server
npm install

# Copy environment template and fill in your values
cp .env.example .env
```

Edit `server/.env` with your credentials:

```env
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/hotel_management
JWT_SECRET=<generate-a-64-byte-hex-secret>
SEED_ADMIN_EMAIL=admin@yourhotel.com
SEED_ADMIN_PASSWORD=YourStrongPassword123!
SEED_STAFF_EMAIL=staff@yourhotel.com
SEED_STAFF_PASSWORD=AnotherStrongPassword456!
```

> 💡 Generate a JWT secret: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

### 3. Initialize Database

```bash
# Create tables
npm run initDb

# Add performance indexes
npm run addIndexes

# Seed admin/staff users and sample rooms
npm run seed
```

### 4. Setup Frontend

```bash
cd ../client
npm install
```

### 5. Run the Application

```bash
# Terminal 1 — Backend
cd server
npm run dev        # Starts on http://localhost:5000

# Terminal 2 — Frontend
cd client
npm run dev        # Starts on http://localhost:5173
```

Open **http://localhost:5173** in your browser and log in with the credentials you set in `.env`.

---

## 🔒 Security Features

| Feature | Implementation |
|---------|---------------|
| **Authentication** | JWT stored in HttpOnly, Secure cookies — immune to XSS token theft |
| **Token Revocation** | Per-token JTI tracked in `revoked_tokens` table — instant logout |
| **Password Security** | bcrypt with 12 salt rounds |
| **SQL Injection** | 100% parameterized queries (`$1, $2...`) — no string concatenation |
| **Input Validation** | `express-validator` on all mutating endpoints |
| **Rate Limiting** | Auth: 10 req/15min · Data: 60 req/min · Global: 100 req/15min |
| **Security Headers** | Helmet with CSP, HSTS, X-Frame-Options: DENY, noSniff |
| **Error Handling** | PostgreSQL errors mapped to safe messages — no stack traces in production |
| **Race Conditions** | Booking creation uses `SELECT FOR UPDATE` row locks inside transactions |
| **File Uploads** | Type allowlist (JPEG/PNG only), 5MB limit, randomized filenames |

---

## 📡 API Endpoints

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `POST` | `/api/auth/login` | ❌ | — | Login and receive HttpOnly cookie |
| `POST` | `/api/auth/logout` | ✅ | — | Logout and revoke token |
| `GET` | `/api/auth/me` | ✅ | — | Get current user profile |
| `GET` | `/api/rooms` | ✅ | — | List all rooms (filterable) |
| `GET` | `/api/rooms/available` | ✅ | — | Check room availability by date range |
| `POST` | `/api/rooms` | ✅ | Admin | Create a new room (with image upload) |
| `PUT` | `/api/rooms/:id` | ✅ | Admin | Update room details |
| `DELETE` | `/api/rooms/:id` | ✅ | Admin | Delete a room |
| `GET` | `/api/bookings` | ✅ | — | List bookings (filterable, paginated) |
| `POST` | `/api/bookings` | ✅ | — | Create a new booking |
| `GET` | `/api/bookings/:id` | ✅ | — | Get booking details |
| `PUT` | `/api/bookings/:id` | ✅ | — | Update a booking |
| `DELETE` | `/api/bookings/:id` | ✅ | Admin | Delete a booking |
| `GET` | `/api/dashboard/stats` | ✅ | — | Dashboard statistics |
| `GET` | `/api/health` | ❌ | — | Health check |

---

## 🛠️ Available Scripts

### Backend (`server/`)

| Script | Command | Description |
|--------|---------|-------------|
| Dev Server | `npm run dev` | Start with nodemon (auto-reload) |
| Production | `npm start` | Start without hot reload |
| Init DB | `npm run initDb` | Create all database tables |
| Seed Data | `npm run seed` | Insert admin, staff users & sample rooms |
| Add Indexes | `npm run addIndexes` | Create performance indexes |

### Frontend (`client/`)

| Script | Command | Description |
|--------|---------|-------------|
| Dev Server | `npm run dev` | Vite dev server with HMR |
| Build | `npm run build` | Production build to `dist/` |
| Preview | `npm run preview` | Preview production build locally |

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **ISC License**.

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/Sanj1th-M">Sanjith M</a>
</p>
