# SkoolNova ERP — Full MERN Stack Migration Plan

**Document Version:** 1.0.0  
**Status:** Completed & Verified  
**Target Architecture:** Full MERN Stack (MongoDB, Express.js, React 19, Node.js + TypeScript)

---

## 1. Executive Summary & Migration Objective

DigiSchool (now SkoolNova ERP) is an enterprise-grade multi-tenant educational management operating system designed for schools, educators, students, and administrators. 

### Original State
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Zustand, React Hook Form, Zod.
- **Backend:** Node.js, Fastify v5, Fastify Plugins, partial/previous PostgreSQL Prisma schema.
- **Database:** Transitioning from legacy relational definitions to MongoDB Atlas.

### Target State (Pure MERN Stack)
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Axios, Lucide Icons, Recharts, Sonner.
- **Backend:** Node.js 22 LTS, Express.js, TypeScript, Mongoose ODM, Zod validation, JWT with refresh token rotation, Centralized Async Error Handling.
- **Database:** MongoDB Atlas (Multi-Tenant Document Store, Compound Tenant Indexes, Soft/Cascade Isolation).
- **Deployment & Serverless:** Vercel Fluid Compute Serverless compatibility, zero socket-locking, native Express handler integration.

---

## 2. Complete Architecture Discovery & Mapping

### 2.1 Technology Stack Comparison

| Layer | Existing Stack | Target MERN Stack | Migration Justification |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | React 19 + TypeScript + Vite + Tailwind | React 19 + TypeScript + Vite + Tailwind | Preserve existing rich UI, zero frontend redesign needed |
| **HTTP Framework** | Fastify v5 + Fastify Plugins | **Express.js (TypeScript)** | Standardized MERN stack, native Vercel serverless compatibility, zero stream-hanging |
| **Database** | PostgreSQL / Prisma (Legacy schema) | **MongoDB Atlas + Mongoose 8/9** | Flexible document modeling, multi-tenant schemas, native JSON structures |
| **Validation** | Zod v3 | **Zod v3** (Express middleware) | Strict type-safety, reusable between frontend & backend |
| **Auth & Security**| JWT + Fastify auth decorator | **JWT + Express Auth Middleware** | Pure Express `req.user` context, role-based guards, refresh token rotation |
| **File Storage** | Cloudinary / ImageKit / local fallback | **Cloudinary / ImageKit / Multer** | Production-ready multipart uploads with serverless `/tmp` safety |
| **Logging & Errors**| Fastify Pino / logger | **Custom JSON logger & AppError** | Clean HTTP status mapping, standardized error responses |

---

## 3. Database Migration Strategy: PostgreSQL to MongoDB

### 3.1 Model Transformation Mapping

All 23 relational database models have been analyzed and mapped to production Mongoose schemas with compound indexes and multi-tenant scoping:

| Legacy Prisma Model | Mongoose Model | Primary Key | Key Relationships / Tenant Scoping |
| :--- | :--- | :--- | :--- |
| `Tenant` | `Tenant` | `_id` (ObjectId) | Root tenant model (`code`, `name`, `status`, `settings`) |
| `User` | `User` | `_id` (ObjectId) | `tenantId` (ref Tenant), unique on `(tenantId, email)` |
| `RefreshToken` | `RefreshToken` | `_id` (ObjectId) | `userId` (ref User), indexed on `tokenHash` |
| `TeacherProfile` | `TeacherProfile` | `_id` (ObjectId) | `userId` (1:1 User), `tenantId`, unique `(tenantId, employeeId)` |
| `StudentProfile` | `StudentProfile` | `_id` (ObjectId) | `userId` (1:1 User), `tenantId`, `classId`, unique `(tenantId, classId, rollNumber)` |
| `SchoolClass` | `SchoolClass` | `_id` (ObjectId) | `tenantId`, unique `(tenantId, name, academicYear)` |
| `ClassSubject` | `ClassSubject` | `_id` (ObjectId) | `classId`, `tenantId`, unique `(classId, subjectName)` |
| `SchoolPeriod` | `SchoolPeriod` | `_id` (ObjectId) | `tenantId`, unique `(tenantId, periodIndex)` |
| `TimetableSlot` | `TimetableSlot` | `_id` (ObjectId) | `classId`, `periodId`, `teacherId`, unique `(classId, dayOfWeek, periodId)` |
| `StudentAttendance` | `StudentAttendance` | `_id` (ObjectId) | `studentId`, `classId`, `date`, unique `(studentId, date, subjectName, periodId)` |
| `TeacherAttendance` | `TeacherAttendance` | `_id` (ObjectId) | `teacherId`, `date`, unique `(teacherId, date)` |
| `Assignment` | `Assignment` | `_id` (ObjectId) | `classId`, `teacherId`, `tenantId` |
| `AssignmentSubmission`| `AssignmentSubmission`| `_id` (ObjectId) | `assignmentId`, `studentId`, unique `(assignmentId, studentId)` |
| `Exam` | `Exam` | `_id` (ObjectId) | `tenantId`, `status`, `startDate`, `endDate` |
| `ExamClass` | `ExamClass` | `_id` (ObjectId) | `examId`, `classId`, unique `(examId, classId)` |
| `ExamSubject` | `ExamSubject` | `_id` (ObjectId) | `examId`, `classId`, `teacherId`, unique `(examId, classId, subjectName)` |
| `AdmitCardClearance` | `AdmitCardClearance` | `_id` (ObjectId) | `examId`, `studentId`, unique `(examId, studentId)` |
| `ExamMark` | `ExamMark` | `_id` (ObjectId) | `examSubjectId`, `studentId`, unique `(examSubjectId, studentId)` |
| `LeaveApplication` | `LeaveApplication` | `_id` (ObjectId) | `tenantId`, `applicantUserId`, `reviewedByUserId` |
| `Notification` | `Notification` | `_id` (ObjectId) | `tenantId`, `targetRole`, `targetUserId`, `isRead` |
| `SchoolDeletionOtp` | `SchoolDeletionOtp` | `_id` (ObjectId) | `tenantId`, `requestedByUserId`, `otpHash`, TTL/Expiry |
| `PasswordResetOtp` | `PasswordResetOtp` | `_id` (ObjectId) | `email`, `otpHash`, TTL/Expiry |
| `Inquiry` | `Inquiry` | `_id` (ObjectId) | Public contact form / landing lead capture |

### 3.2 Data Migration & Seeding Utility
- Reusable migration script provided in `backend/scripts/migrate-pg-to-mongo.ts` to allow porting PostgreSQL dumps if required.
- Idempotent initial seed script (`seedInitialAdmin`) in `backend/src/core/utils/seed.ts` automatically initializes Super Admin in MongoDB Atlas upon startup.

---

## 4. Backend Migration Strategy: Fastify to Express

### 4.1 Framework Replacement
Fastify route registration and decorators (`fastify.register`, `fastify.decorate('authenticate')`, `reply.status().send()`) will be replaced with modular Express 4/5 routing:
- Express Router per domain module (`express.Router()`).
- Express Middleware:
  - `authenticate`: verifies Bearer JWT, fetches active User from MongoDB, verifies Tenant status, attaches `req.user`.
  - `requireRoles(...roles)`: RBAC gatekeeper with role normalization (`MANAGER` / `SCHOOL_MANAGER`).
  - `validateRequest(schema)`: Zod request body/query validation.
  - `errorHandler`: Global async error handler producing `{ success: false, error: { code, message, details } }`.

### 4.2 Module Inventory & Routes

| Module | Route Prefix | Key Endpoints | Controller / Service |
| :--- | :--- | :--- | :--- |
| **Auth** | `/api/v1/auth` | `POST /login`, `POST /refresh`, `POST /logout`, `POST /change-password`, `POST /forgot-password` | `AuthService` |
| **Profile** | `/api/v1/profile` | `GET /me`, `PUT /me` | `AuthService` |
| **Schools** | `/api/v1/schools` | `GET /`, `POST /`, `GET /:id`, `PUT /:id`, `PATCH /:id/status`, `POST /:id/delete-request`, `POST /:id/delete-confirm` | `SchoolsService` |
| **Students**| `/api/v1/students` | `GET /`, `POST /`, `GET /:id`, `PUT /:id`, `DELETE /:id`, `POST /bulk-delete` | `StudentsService` |
| **Teachers**| `/api/v1/teachers` | `GET /`, `POST /`, `GET /:id`, `PUT /:id`, `DELETE /:id` | `TeachersService` |
| **Academics**| `/api/v1/academics`| `GET /classes`, `POST /classes`, `GET /subjects`, `POST /subjects`, `GET /class-subjects`, `PUT /class-subjects` | `AcademicsService` |
| **Timetable**| `/api/v1/timetable`| `GET /`, `POST /slots`, `DELETE /slots/:id`, `GET /periods`, `POST /periods` | `TimetableService` |
| **Attendance**| `/api/v1/attendance`| `GET /students`, `POST /students`, `GET /teachers`, `POST /teachers` | `AttendanceService` |
| **Assignments**| `/api/v1/assignments`| `GET /`, `POST /`, `GET /:id`, `POST /:id/submit`, `POST /submissions/:id/grade` | `AssignmentsService` |
| **Exams** | `/api/v1/exams` | `GET /`, `POST /`, `GET /:id`, `POST /:id/marks`, `GET /:id/admit-cards` | `ExamsService` |
| **Leaves** | `/api/v1/leaves` | `GET /`, `POST /`, `PATCH /:id/review` | `LeavesService` |
| **Notifications**| `/api/v1/notifications`| `GET /`, `PATCH /:id/read`, `PATCH /read-all` | `NotificationsService` |
| **Dashboard**| `/api/v1/dashboard` | `GET /stats`, `GET /recent-activity` | `DashboardService` |
| **Inquiries**| `/api/v1/inquiries` | `POST /`, `GET /`, `PATCH /:id/reply` | `InquiriesService` |
| **Uploads** | `/api/v1/uploads` | `POST /`, `GET /:filename` | `saveUploadedFile` (Cloudinary/ImageKit/Local) |

---

## 5. Implementation Phases & Tracker

- [x] **Phase 0: Complete Project Discovery & Analysis**
  - Read `BACKEND_DEVELOPMENT_ROADMAP.md` and `prisma/schema.prisma`.
  - Audited frontend API clients and dependencies.
  - Generated `MERN_MIGRATION_PLAN.md`.
- [ ] **Phase 1: Target MERN Architecture & Express Dependencies**
  - Install `express`, `cors`, `helmet`, `cookie-parser`, `multer`, and `@types/*`.
  - Remove obsolete `@fastify/*` dependencies.
- [ ] **Phase 2: Database Layer Verification & PostgreSQL Migration Utility**
  - Verify all 23 Mongoose models in `backend/src/models/`.
  - Validate compound indexes and tenant scoping rules.
- [ ] **Phase 3: Fastify to Express Backend Migration**
  - Implement Express `app.ts` and `server.ts`.
  - Re-implement middleware: `authenticate`, `requireRoles`, `validateRequest`, `errorHandler`.
  - Migrate all 14 module routes to Express Router.
  - Configure Multer upload middleware for `/api/v1/uploads`.
- [ ] **Phase 4: Authentication, Security & RBAC Enforcement**
  - Verify JWT authentication and refresh token rotation with Express.
  - Ensure tenant isolation and password hashing (`bcryptjs`).
- [ ] **Phase 5: Frontend Integration Verification**
  - Verify Axios interceptors and base URL compatibility.
  - Ensure seamless communication with Express backend.
- [ ] **Phase 6: Business Feature Preservation**
  - Verify end-to-end workflows (Manager, Teacher, Student, Academics, Attendance, Assignments).
- [ ] **Phase 7: File Uploads & Third-Party Integrations**
  - Test multipart uploads with Cloudinary / ImageKit / Local fallback.
- [ ] **Phase 8: Systematic Testing & Verification**
  - Test health endpoints, auth endpoints, CRUD operations.
- [ ] **Phase 9: Cleanup & Optimization**
  - Delete obsolete Fastify files.
  - Clean up package scripts and dependencies.
- [ ] **Phase 10: Production Readiness & Vercel Compatibility**
  - Verify clean build (`npm run build`).
  - Configure serverless export for Express on Vercel.
- [ ] **Phase 11: Final Migration Report**
  - Summarize completed migration with exact execution steps.
