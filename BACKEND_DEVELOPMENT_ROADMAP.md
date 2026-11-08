# DigiSchool ERP --- Backend Development Roadmap

> **Purpose:** This is the master implementation plan for building the
> DigiSchool ERP backend in phases. Keep this file in the repository
> root as `BACKEND_DEVELOPMENT_ROADMAP.md`.
>
> **Important:** This document is a plan, not permission to implement
> everything at once. Work on **one phase at a time** and stop at the
> phase boundary. Do not start the next phase until the user explicitly
> asks to continue.

------------------------------------------------------------------------

## 1. Project context

DigiSchool is an existing React 19 + TypeScript + Vite frontend. Its
current data layer is largely simulated with Zustand and `localStorage`.
The backend must replace those mock services without unnecessarily
changing the existing UI.

The frontend is organized around application-level concerns and domain
features:

-   `src/app/` --- application setup, providers, router and route guards
-   `src/components/` --- reusable shared and UI components
-   `src/config/` --- permissions and navigation configuration
-   `src/constants/` --- shared constants
-   `src/context/` --- frontend contexts
-   `src/features/` --- domain-oriented modules such as auth, students,
    teachers, attendance, assignments and exams
-   Each feature may have its own `pages/`, `components/`, `services/`,
    `types/`, `schemas/`, `hooks/` or `store/`, as appropriate.

The backend should follow the same **domain-oriented thinking**: keep
each business feature in its own module. Do not copy frontend-only
folders such as `pages`, `hooks`, `components`, `context` or UI stores
into the backend. Backend modules should contain only the files needed
for HTTP handling, business rules, data access, validation and tests.

### Main roles

1.  `SUPER_ADMIN` --- platform owner; manages school tenants.
2.  `MANAGER` --- school manager/principal; manages school operations.
3.  `TEACHER` --- classroom and academic workflows.
4.  `STUDENT` --- student workflows.
5.  `PARENT` --- planned role; implement only when its requirements and
    frontend are ready.

### Existing major workflows

-   Authentication and mandatory first-login password change
-   School/tenant onboarding, activation/deactivation and deletion
    confirmation
-   Student and teacher management
-   Classes, subjects and periods
-   Timetable management and conflict prevention
-   Student period attendance and teacher attendance
-   Assignments, file submissions and grading
-   Exams, question-paper upload/review, marks and admit cards
-   Multi-level leave approvals
-   Notifications and role-specific dashboards

Fees, detailed reports and parent workflows are incomplete/planned in
the current frontend. Do not invent their business rules during
implementation.

------------------------------------------------------------------------

## 2. Architecture decisions

### 2.1 Recommended stack

Use a small, maintainable TypeScript backend:

  -----------------------------------------------------------------------
  Concern                 Decision                Why
  ----------------------- ----------------------- -----------------------
  Runtime                 Node.js 22 LTS          Stable supported Node
                                                  runtime

  Language                TypeScript              Type safety and
                                                  consistency with
                                                  frontend

  HTTP framework          Fastify                 Lightweight, fast and
                                                  plugin-based

  Database                PostgreSQL              Relational data,
                                                  constraints and
                                                  transactions suit ERP
                                                  workflows

  ORM and migrations      Prisma                  Type-safe database
                                                  access and
                                                  beginner-friendly
                                                  schema/migration
                                                  workflow

  Validation              Zod                     Reuse familiar
                                                  validation concepts and
                                                  validate request data

  Authentication          Short-lived JWT access  Supports authenticated
                          token + securely stored API access and
                          refresh-token session   revocation

  Password hashing        Argon2id                Passwords must never be
                                                  stored in plain text

  File storage            Local development       Avoid storing file
                          storage behind a        bytes/base64 in
                          storage service;        PostgreSQL
                          production object       
                          storage when needed     

  Tests                   Node test tooling       Verify business rules
                          compatible with the     and prevent regressions
                          selected stack          
  -----------------------------------------------------------------------

**Do not add Redis, BullMQ, Socket.IO, microservices, Kubernetes,
GraphQL or a message broker in the initial build.** They are not
prerequisites for the current workflows. Add a tool only when a concrete
requirement justifies it.

Do not add duplicate libraries that solve the same problem. Before
installing a dependency, explain what exact requirement it satisfies and
check whether the existing stack already covers it.

### 2.2 Architecture style

Use a **modular monolith**. It is one backend application, divided into
independent business modules. This is simpler to develop, run, test and
deploy than microservices, while keeping the code organized for future
growth.

Each module owns its routes, schemas, service/business logic and
database-facing operations. Shared infrastructure belongs in `core/` or
`shared/` only when it is genuinely used by multiple modules.

### 2.3 Proposed backend folder structure

Create the backend as a separate top-level folder. The exact structure
can be adjusted slightly if implementation reveals a real need, but do
not create empty or speculative folders.

``` text
DigiSchool/
├── frontend/                         # Existing React application — preserve it
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma             # Database schema
│   │   └── migrations/               # Versioned database migrations
│   ├── src/
│   │   ├── app.ts                    # Fastify app registration
│   │   ├── server.ts                 # Server startup and graceful shutdown
│   │   ├── config/
│   │   │   ├── env.ts                # Environment parsing and validation
│   │   │   └── constants.ts          # Only genuinely shared constants
│   │   ├── core/
│   │   │   ├── errors/               # Central application error types/handler
│   │   │   ├── plugins/              # Fastify plugins: database, auth, etc.
│   │   │   ├── hooks/                # Shared request lifecycle hooks
│   │   │   └── types/                # Shared backend types, if needed
│   │   ├── shared/
│   │   │   ├── utils/                # Small, reusable utilities
│   │   │   └── validators/           # Truly shared validation helpers
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── auth.schema.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   └── auth.types.ts
│   │   │   ├── users/
│   │   │   ├── schools/
│   │   │   ├── students/
│   │   │   ├── teachers/
│   │   │   ├── academics/            # Classes, subjects and periods
│   │   │   ├── timetable/
│   │   │   ├── attendance/
│   │   │   ├── assignments/
│   │   │   ├── exams/
│   │   │   ├── leaves/
│   │   │   ├── notifications/
│   │   │   └── dashboard/
│   │   └── routes/
│   │       └── index.ts              # API version prefix and module registration
│   ├── tests/                        # Integration tests and test helpers
│   ├── .env.example                  # Names/placeholders only; no real secrets
│   ├── .gitignore
│   ├── package.json
│   ├── package-lock.json
│   └── tsconfig.json
└── BACKEND_DEVELOPMENT_ROADMAP.md
```

A module should start small. Add a `repository`, `controller`, `types`,
`tests` subfolder or another file only when its size or responsibility
makes that separation useful. Do not create a file just to fill a
template.

Suggested module responsibility:

-   `*.routes.ts` --- HTTP method, URL, auth/role requirements and
    request-to-service wiring.
-   `*.schema.ts` --- request parameter/body/query validation.
-   `*.service.ts` --- business rules and orchestration.
-   `*.types.ts` --- module-specific types only when they are not
    already generated/inferred safely.
-   Database access --- use Prisma through a shared database plugin
    initially. Extract repositories only where they improve clarity or
    testability.

------------------------------------------------------------------------

## 3. Rules that apply to every phase

1.  **One phase at a time.** Complete the current phase, test it and
    report the result. Then stop.
2.  **Do not modify the frontend** unless a phase explicitly requires a
    small integration change and the user has approved that phase.
3.  **Preserve existing frontend behavior and naming** where practical.
    Map the API to the existing feature services and types instead of
    redesigning the UI.
4.  **No unnecessary packages.** Prefer Node.js, Fastify, TypeScript,
    Prisma and Zod. Do not install a library for a problem already
    solved by the chosen stack.
5.  **No fake completion.** Do not leave placeholder endpoints,
    hardcoded success responses or mock database behavior while claiming
    a feature is complete.
6.  **No secrets in source control.** Keep credentials in `.env`; commit
    only `.env.example` with safe placeholders.
7.  **Validate all external input** at the API boundary.
8.  **Enforce authorization on the server.** Hiding a frontend button is
    not security.
9.  **Enforce tenant isolation on every school-scoped query.** Never
    trust a client-supplied `schoolId` as proof of access.
10. **Use database constraints and transactions** for operations that
    must succeed or fail together.
11. **Never store passwords in plain text** or file contents as base64
    in ordinary database columns.
12. **Add tests for important business rules**, especially tenant
    boundaries, role permissions, timetable conflicts and attendance
    restrictions.
13. **Keep documentation current.** Update this roadmap's phase
    checklist and add concise setup instructions as implementation
    progresses.
14. **Explain PostgreSQL steps in beginner-friendly language.** Do not
    assume the user knows database servers, databases, tables, SQL,
    migrations or connection strings.
15. Before destructive commands, database resets or deleting data,
    explain the impact and use a safe development database. Never reset
    a database containing user data.

------------------------------------------------------------------------

## 4. Phase-by-phase implementation plan

### Phase 0 --- Backend foundation and local development setup

**Goal:** Create a clean backend workspace that starts successfully. No
business features yet.

Tasks:

1.  Inspect the repository root and existing frontend scripts. Do not
    alter frontend configuration.
2.  Create `backend/` and initialize a minimal Node.js + TypeScript
    project.
3.  Install only the dependencies required for Fastify, TypeScript
    development and environment validation.
4.  Create the Fastify application entry point and server entry point.
5.  Add environment-variable validation and a safe `.env.example`.
6.  Add a simple health endpoint, for example `GET /api/v1/health`.
7.  Add consistent JSON error handling and a not-found response.
8.  Add development, build, start and type-check scripts.
9.  Confirm the backend can start and build.

**Beginner explanation required:** Explain what Node.js, npm, a backend
server, an API endpoint, a port and an environment variable mean.
Explain every command before asking the user to run it.

**Acceptance checks:**

-   Backend installs from its lockfile.
-   TypeScript check and production build pass.
-   Server starts locally.
-   Health endpoint returns a real success response.
-   No frontend files were changed.

**Stop after Phase 0.**

### Phase 1 --- PostgreSQL fundamentals and local database setup

**Goal:** Help the user understand and run PostgreSQL locally before
using it in application code.

Teach these concepts in simple language:

1.  **Database:** an organized place where application data is stored.
2.  **PostgreSQL:** the database software/server.
3.  **Database server:** the running PostgreSQL process that accepts
    connections.
4.  **Database:** one named collection of data inside the PostgreSQL
    server.
5.  **Table:** data arranged in rows and columns, similar to a
    spreadsheet.
6.  **Row and column:** one record and one field of a record.
7.  **Primary key:** a unique identifier for a row.
8.  **Foreign key:** a link from one table to another.
9.  **SQL:** the language used to read and change relational data.
10. **Migration:** a tracked change to the database structure.

Practical steps:

1.  Check the user's operating system and whether PostgreSQL is already
    installed.
2.  Give the simplest suitable installation path for that machine. Do
    not assume it is installed.
3.  Start PostgreSQL and verify that the server is running.
4.  Create a development database named `digischool_dev`.
5.  Explain how to connect to it using one beginner-friendly database
    client or terminal command. Avoid making the user install several
    database GUIs.
6.  Run a harmless test query such as `SELECT version();`.
7.  Put the connection URL in `backend/.env` and keep it out of Git.
8.  Explain the parts of the connection URL without exposing real
    passwords in chat.
9.  Verify the connection from the backend in the next phase.

**Do not create the full application schema in this phase.**

**Acceptance checks:**

-   PostgreSQL is running locally.
-   `digischool_dev` exists.
-   User can connect and run a simple SQL query.
-   `.env` is ignored by Git and `.env.example` contains only
    placeholders.

**Stop after Phase 1.**

### Phase 2 --- Prisma setup and first database migration

**Goal:** Connect the backend to PostgreSQL and learn the safe
schema-change workflow.

Tasks:

1.  Add Prisma and initialize its configuration.
2.  Configure the PostgreSQL connection using the validated environment
    variable.
3.  Explain the Prisma schema and how it maps to PostgreSQL tables.
4.  Create only the initial minimal schema needed for the first real
    feature: school tenants and user identity.
5.  Explain IDs, required/optional fields, unique constraints, relations
    and indexes before finalizing the schema.
6.  Create and apply the first named migration.
7.  Generate the Prisma client.
8.  Add a small database connectivity check.
9.  Verify the tables and constraints using Prisma and a SQL query.
10. Explain how to inspect migration history and how to recover safely
    from a failed development migration. Do not casually delete
    migration history.

**Acceptance checks:**

-   Prisma connects to PostgreSQL.
-   Migration applies successfully.
-   Tables and constraints exist as designed.
-   Generated Prisma client is usable.
-   A repeatable setup process is documented.

**Stop after Phase 2.**

### Phase 3 --- Core identity, authentication and authorization

**Goal:** Implement secure login and server-side role checks.

Scope:

-   Central user identity
-   Role definitions: `SUPER_ADMIN`, `MANAGER`, `TEACHER`, `STUDENT`;
    keep `PARENT` planned until its requirements are ready
-   Password hashing with Argon2id
-   Login, refresh, logout and change-password flows
-   Short-lived access token and refresh-token session handling
-   First-login mandatory password change
-   Current-user/profile endpoint
-   Authentication and role authorization hooks
-   Basic login rate limiting and safe error messages

Important decisions:

-   Never return password hashes or refresh-token secrets.
-   Store refresh-token hashes or equivalent revocable session records
    server-side.
-   Use secure cookie settings appropriate to local development and
    production.
-   Do not rely on a role or tenant ID sent in a request body.
-   Do not allow inactive users to authenticate.

**Acceptance checks:**

-   Valid credentials authenticate.
-   Invalid credentials fail safely.
-   Passwords are hashed.
-   Refresh and logout behavior is tested.
-   Role restrictions are tested.
-   Mandatory password change is enforced by the backend.

**Stop after Phase 3.**

### Phase 4 --- Multi-tenant school management

**Goal:** Build Super Admin school onboarding and tenant lifecycle
management.

Scope:

-   Create/list/view/update school tenants
-   Activate/deactivate a school
-   Create the initial Manager account transactionally with school
    onboarding
-   Inactive-school access restrictions
-   School deletion request and OTP confirmation workflow
-   OTP hashing, expiry, one-time use and attempt limits
-   Audit important administrative actions

**Critical tenant rule:** Every school-owned record must be scoped to
the authenticated tenant. The server derives the tenant from the
authenticated identity/session and verifies resource ownership.

**Acceptance checks:**

-   Super Admin can manage schools.
-   A Manager belongs to the correct school.
-   One school's user cannot access another school's records.
-   Inactive tenant restrictions work on the API, not just in the UI.
-   School creation and Manager creation either both succeed or both
    roll back.

**Stop after Phase 4.**

### Phase 5 --- Student and teacher management

**Goal:** Replace student and teacher mock data with persistent records.

Scope:

-   Create, list, view, update and deactivate students
-   Create, list, view, update and deactivate teachers
-   Search, pagination and filters supported by the existing frontend
-   Profile and login-account relationship
-   Unique school-scoped identifiers such as roll number and employee ID
-   Safe account provisioning and password setup

**Acceptance checks:**

-   CRUD operations persist in PostgreSQL.
-   Duplicate identifiers are rejected clearly.
-   Tenant isolation and role access are tested.
-   Pagination and filtering are stable.

**Stop after Phase 5.**

### Phase 6 --- Academic setup: classes, subjects and periods

**Goal:** Build the base academic configuration used by timetable,
attendance and exams.

Scope:

-   Create and manage classes
-   Map subjects to classes
-   Create and manage school periods
-   Academic-year handling where required by the current UI
-   Validate references and prevent duplicate mappings

**Acceptance checks:**

-   Only authorized school staff can manage academic setup.
-   Duplicate class/subject/period configurations are rejected.
-   Other modules can reference these records by stable IDs.

**Stop after Phase 6.**

### Phase 7 --- Timetable management

**Goal:** Persist timetable configuration and prevent scheduling
collisions.

Scope:

-   Create/update/read timetable slots
-   Assign class, period, teacher and subject
-   Enforce one slot per class/period/day
-   Enforce no teacher double-booking in overlapping slots
-   Respect the existing manager-controlled teacher-edit setting
-   Validate that teacher and class belong to the same tenant

**Acceptance checks:**

-   Class timetable conflicts are blocked.
-   Teacher timetable conflicts are blocked.
-   Invalid cross-school assignments are blocked.
-   Concurrent changes cannot silently create duplicate slots.

**Stop after Phase 7.**

### Phase 8 --- Student and teacher attendance

**Goal:** Implement attendance rules on the server.

Scope:

-   Teacher daily attendance
-   Student period-wise attendance
-   Attendance history and summaries
-   Enforce the minimum five-minute elapsed period rule using server
    time and configured school timezone
-   Enforce the 15-day historical edit restriction on the server
-   Prevent duplicate attendance records
-   Record who marked or changed attendance

**Acceptance checks:**

-   Attendance can be recorded and retrieved.
-   Duplicate records are prevented.
-   Early marking is rejected according to the configured rule.
-   Historical edits outside the allowed window are rejected.
-   Attendance summaries match stored records.

**Stop after Phase 8.**

### Phase 9 --- Assignments, file submissions and grading

**Goal:** Implement the homework workflow and safe file handling.

Scope:

-   Teachers create assignments for classes/subjects
-   Students view assignments and submit work
-   Teachers review and grade submissions
-   Due-date and submission status rules
-   File metadata and upload/download authorization

File handling:

-   Do not store base64 files in PostgreSQL.
-   Use a storage service abstraction.
-   Start with a safe local development storage implementation if
    appropriate.
-   Use object storage such as S3-compatible storage for production when
    configured.
-   Validate file size, extension and actual content type; generate safe
    storage names.

**Acceptance checks:**

-   Only the intended class can view/submit an assignment.
-   A student cannot submit on behalf of another student.
-   Only authorized teachers can grade.
-   Files cannot be accessed by guessing another user's URL.

**Stop after Phase 9.**

### Phase 10 --- Exams, papers, marks and admit cards

**Goal:** Implement the examination lifecycle.

Scope:

-   Create exam schedules and class mappings
-   Assign subject/paper responsibilities
-   Upload and review question papers
-   Approve/reject papers with rejection reason
-   Enter and retrieve marks
-   Admit-card clearance and approval
-   Generate/download PDF admit cards
-   Enforce the actual fee/attendance eligibility rules confirmed by the
    product requirements

**Important:** The current report mentions fee clearance in admit-card
eligibility, but the fees module is not complete. Do not invent fee
calculation or payment rules. Confirm the required policy before
implementing fee-dependent behavior.

**Acceptance checks:**

-   Exam and subject relationships are correct.
-   Paper approval transitions are validated.
-   Marks are within allowed limits.
-   Students can access only their own admit cards and results.
-   PDF generation and eligibility checks are tested.

**Stop after Phase 10.**

### Phase 11 --- Leave application and approval workflow

**Goal:** Implement the multi-level leave process.

Scope:

-   Student leave application
-   Student request routed to the relevant class teacher
-   Teacher approval/forwarding to Manager
-   Manager final approval/rejection
-   Teacher leave request routed to Manager
-   Remarks, timestamps and approval history
-   Prevent invalid status transitions

**Acceptance checks:**

-   Only the assigned reviewer can take the next action.
-   Invalid transitions are rejected.
-   Approval history is retained.
-   Tenant boundaries are enforced.

**Stop after Phase 11.**

### Phase 12 --- Notifications and dashboard data

**Goal:** Replace notification and dashboard mock aggregation with
backend data.

Scope:

-   Notification creation and listing
-   Read/unread state
-   Role/class/user targeting
-   Pagination and unread count
-   Dashboard summary endpoints for each implemented role
-   Efficient aggregation queries

Start with normal API polling/refetch through the frontend's existing
TanStack Query setup. Add real-time sockets only if a demonstrated
requirement needs them.

**Acceptance checks:**

-   Users receive only notifications intended for them.
-   Read state is per recipient where required.
-   Dashboard totals match underlying records.
-   No unnecessary N+1 query patterns are introduced.

**Stop after Phase 12.**

### Phase 13 --- Frontend API integration

**Goal:** Connect the existing React features to the real backend
without redesigning the UI.

Tasks:

1.  Review each existing `features/<feature>/services/` file and map its
    mock behavior to the implemented API.
2.  Configure the existing Axios API client and base URL.
3.  Replace one feature's mock service at a time.
4.  Use TanStack Query for server state and invalidation.
5.  Keep Zustand for appropriate client-only state, not as a second
    database.
6.  Handle loading, empty, validation, unauthorized, forbidden and
    server-error states.
7.  Confirm that frontend types match API response contracts.
8.  Remove mock persistence only after the corresponding real API
    workflow passes end-to-end testing.

**Acceptance checks:**

-   Existing pages still render and behave correctly.
-   No feature is silently left on mock data while appearing connected.
-   Authentication survives refresh as designed.
-   Role and tenant restrictions are enforced by the backend.
-   Main workflows pass end-to-end tests.

**Stop after Phase 13.**

### Phase 14 --- Security, reliability and production readiness

**Goal:** Prepare the application for a controlled production
deployment.

Scope:

-   Security headers, CORS allowlist and secure cookies
-   Rate limits for sensitive endpoints
-   Request size limits and upload restrictions
-   Input validation and safe error responses
-   Audit logging for sensitive actions
-   Database backup and restore procedure
-   Production migrations and deployment environment
-   Health/readiness checks and structured logs
-   Dependency and secret review
-   Integration and end-to-end test coverage
-   Performance checks using realistic data

Do not add Redis, queues or distributed infrastructure unless measured
requirements justify them.

**Acceptance checks:**

-   Production configuration has no development secrets.
-   Backups and restore are tested.
-   Tenant-isolation tests pass.
-   Critical workflows pass end-to-end tests.
-   Deployment and rollback steps are documented.

**Stop after Phase 14.**

------------------------------------------------------------------------

## 5. PostgreSQL learning approach

The user is new to PostgreSQL. Teach database concepts exactly when they
become necessary:

  -----------------------------------------------------------------------
  When                                Teach
  ----------------------------------- -----------------------------------
  Phase 1                             Server, database, table, row,
                                      column, SQL and connection URL

  Phase 2                             Schema, primary key, foreign key,
                                      relation, unique constraint, index
                                      and migration

  Phase 3                             How users and sessions are stored;
                                      why password hashes are used

  Phase 4                             Tenant IDs, relationships and why
                                      every school query needs tenant
                                      scope

  Phase 5 onward                      Joins, filtering, sorting,
                                      pagination, transactions and
                                      constraints as they arise
  -----------------------------------------------------------------------

For every database operation, explain:

-   What problem it solves
-   Which table(s) it affects
-   What the query or migration changes
-   How to verify the result
-   How to avoid damaging existing data

Use Prisma for ordinary application database operations. Teach basic SQL
alongside it so the user understands what is happening. Do not require
the user to become an advanced DBA before development can proceed.

------------------------------------------------------------------------

## 6. First implementation instruction

When development begins, start with **Phase 0 only**.

Before making changes:

1.  Read this roadmap fully.
2.  Inspect the existing repository and frontend structure.
3.  Confirm the current working directory and Git status.
4.  Do not modify or reformat frontend files.
5.  Implement only Phase 0.
6.  Run the phase's acceptance checks.
7.  Update this roadmap's checklist with what was actually completed.
8.  Summarize changed files, commands run, test/build results and any
    manual step the user must perform.
9.  Stop and wait for the user's instruction before starting Phase 1.

### Current phase tracker

-   [x] Phase 0 --- Backend foundation
-   [x] Phase 1 --- PostgreSQL fundamentals and local setup
-   [x] Phase 2 --- Prisma and first migration
-   [x] Phase 3 --- Authentication and authorization
-   [x] Phase 4 --- Multi-tenant school management
-   [x] Phase 5 --- Students and teachers
-   [x] Phase 6 --- Academic setup
-   [x] Phase 7 --- Timetable
-   [x] Phase 8 --- Attendance
-   [x] Phase 9 --- Assignments and submissions
-   [x] Phase 10 --- Exams and admit cards
-   [x] Phase 11 --- Leave workflow
-   [x] Phase 12 --- Notifications and dashboards
-   [x] Phase 13 --- Frontend API integration
-   [x] Phase 14 --- Security and production readiness

------------------------------------------------------------------------

## 7. Definition of done for a phase

A phase is complete only when:

-   Its stated scope is implemented (not merely scaffolded).
-   Type checks/builds pass.
-   Relevant automated tests pass.
-   Important failure cases are checked.
-   No unrelated frontend or backend behavior was changed.
-   Setup or usage instructions are documented.
-   This roadmap's tracker is updated accurately.
-   The user receives a clear summary and the work stops at the phase
    boundary.
