# SkoolNova ERP

SkoolNova ERP is a modern, high-performance, multi-tenant enterprise educational operating system designed for schools, teachers, students, and administrators.

---

## 🏗️ Architecture & Technology Stack

The project follows a **modular monolith** backend architecture paired with a reactive, component-driven frontend.

```
SkoolNova/
├── backend/                  # Fastify 5 + TypeScript + MongoDB Atlas + Mongoose
│   ├── src/
│   │   ├── config/           # Environment & shared constants
│   │   ├── core/             # Plugins (Auth, Mongoose, Error handling)
│   │   ├── models/           # Mongoose schemas & TypeScript interfaces
│   │   ├── modules/          # Business domains (Auth, Schools, Students, etc.)
│   │   ├── app.ts            # Fastify application registration
│   │   └── server.ts         # Server startup & graceful shutdown
├── frontend/                 # React 19 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── app/              # Router, providers & route guards
│   │   ├── components/       # Reusable UI component library
│   │   ├── config/           # Roles & navigation configuration
│   │   ├── features/         # Domain-oriented frontend modules
│   │   └── lib/              # Axios instance with JWT interceptor
│   └── public/               # Static assets
└── package.json              # Root workspace convenience scripts
```

### Backend Stack
- **Runtime**: Node.js 22 LTS
- **Language**: TypeScript
- **Framework**: Fastify 5
- **Database & ODM**: MongoDB Atlas with Mongoose
- **Authentication**: JWT (15-min access tokens, 7-day rotating refresh tokens)
- **Password Hashing**: Argon2id
- **Validation**: Zod (strict runtime schema parsing)
- **File Handling**: `@fastify/multipart` with Cloudinary & ImageKit storage abstraction

### Frontend Stack
- **Framework**: React 19
- **Build Tool**: Vite 8
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **HTTP Client**: Axios with Bearer token interceptor
- **State Management**: Zustand & React Hooks

---

## 🔒 Security & Multi-Tenancy

1. **Strict Multi-Tenant Isolation**: Every school tenant is logically isolated via `tenantId`. All queries for classes, students, teachers, exams, attendance, and assignments strictly filter by the authenticated session's `tenantId`.
2. **Role-Based Access Control (RBAC)**:
   - `SUPER_ADMIN`: Manages school tenants, platform subscriptions, and global stats.
   - `MANAGER`: School administrator; provisions teachers, students, timetable, and reviews school-wide operations.
   - `TEACHER`: Manages classroom attendance, assignments, exam papers, grading, and first-level student leaves.
   - `STUDENT`: Views schedules, submits assignments, checks exam admit cards/marks, and applies for leaves.
3. **Password Security**: Passwords are never stored in plain text. Argon2id hashing is enforced. Initial accounts are flagged with `mustChangePassword: true`, requiring a password update upon first login.
4. **Collision Prevention**: Timetable engine prevents double-booking of teachers across multiple classes in the same period.
5. **Data Integrity Locks**: Attendance records are locked against retrospective editing after 15 days, and future-dated attendance is rejected.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v20 or v22 LTS
- **npm**: v10+
- **PostgreSQL**: v16+ (running on `localhost:5432`)

### 1. Database Setup
Create the local PostgreSQL database:
```bash
createdb digischool_dev
```

### 2. Backend Configuration
Navigate to the `backend/` directory:
```bash
cd backend
cp .env.example .env
```

Verify your `.env` settings (adjust `DATABASE_URL` if your PostgreSQL requires credentials):
```env
PORT=5001
HOST=0.0.0.0
NODE_ENV=development
DATABASE_URL="postgresql://localhost:5432/digischool_dev"
JWT_ACCESS_SECRET="your-super-secret-access-key-min-32-chars-long"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-min-32-chars-long"
CLIENT_ORIGIN="http://localhost:5173"
UPLOAD_DIR="./uploads"
```

Apply database migrations and generate the Prisma client:
```bash
npm install
npm run prisma:migrate
```

### 3. Frontend Configuration
Navigate to the `frontend/` directory:
```bash
cd ../frontend
cp .env.sample .env
npm install
```

Verify `frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:5001/api/v1
```

---

## 💻 Running the Application

You can run the servers individually or from the project root:

### From the Root Directory:
- **Run Backend**: `npm run dev:backend`
- **Run Frontend**: `npm run dev:frontend`
- **Build All**: `npm run build`
- **Run Tests**: `npm run test:backend`

### Individually:
- **Backend API**:
  ```bash
  cd backend && npm run dev
  ```
  API available at: `http://localhost:5001/api/v1`
  Health check: `http://localhost:5001/api/v1/health`

- **Frontend Client**:
  ```bash
  cd frontend && npm run dev
  ```
  App available at: `http://localhost:5173`

---

## 🔑 Default Super Admin Credentials

When the database is migrated and initialized, the default Super Admin is auto-seeded:
- **Email**: `admin@digischool.com`
- **Password**: `123456`
*(You will be prompted to change your password on first login)*

---

## 🧪 Testing

The backend includes a comprehensive integration test suite covering the entire ERP lifecycle (Health check, Auth, Multi-tenant onboarding, Account provisioning, Timetable collision prevention, Attendance locks, Assignments & Grading, Exams & Admit cards, Leave approvals, Notifications, and Dashboard metrics):

```bash
cd backend
npm test
```

---

## 📚 API Overview (`/api/v1`)

| Module | Base Path | Key Capabilities |
| :--- | :--- | :--- |
| **Auth** | `/auth` | Login, refresh token rotation, logout, change password, profile context |
| **Schools** | `/schools` | School onboarding, status toggles, deletion OTP request, deletion |
| **Teachers** | `/teachers` | Teacher listing, account provisioning, details, status toggles |
| **Students** | `/students` | Student listing, enrollment, details, section assignments |
| **Academics** | `/academics` | Classes, sections, subjects catalog, periods management |
| **Timetable** | `/timetable` | Class/teacher schedule grids, conflict-free period slot allocation |
| **Attendance**| `/attendance` | Student period attendance, teacher daily attendance, 15-day edit lock |
| **Assignments**| `/assignments`| Homework assignment creation, student submissions, teacher grading |
| **Uploads** | `/uploads` | Secure multipart file upload handling |
| **Exams** | `/exams` | Exam schedule wizard, question paper approval, marks entry, admit cards |
| **Leaves** | `/leaves` | Multi-tier student and teacher leave requests and approvals |
| **Notifications**| `/notifications`| Real-time alerts, mark as read, unread counts |
| **Dashboard** | `/dashboard` | Role-specific statistical aggregations |

---

## 📄 License
Private & Proprietary — SkoolNova ERP.
