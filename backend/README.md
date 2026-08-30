# CRM Backend — NestJS API Server

This is the backend for the CRM Lead Management System. Built with NestJS + TypeScript + PostgreSQL (raw SQL).

---

## Folder Structure

```
backend/
├── src/
│   ├── main.ts                        # App entry point — server start hota hai yahan se
│   ├── app.module.ts                  # Root module — sab modules yahan register hote hain
│   │
│   ├── config/
│   │   └── env.config.ts              # Environment variables ko structured form mein export karta hai
│   │
│   ├── database/
│   │   ├── db-manager.service.ts      # New client ka database create karta hai, tables provision karta hai
│   │   └── tenant-pool.service.ts     # Har tenant ka pg connection pool cache karta hai
│   │
│   ├── common/
│   │   ├── guards/
│   │   │   ├── jwt.guard.ts           # Normal user/admin JWT verify karta hai
│   │   │   ├── super-admin.guard.ts   # Sirf Super Admin access allow karta hai
│   │   │   ├── roles.guard.ts         # Role check karta hai (admin, manager, agent)
│   │   │   └── ip.guard.ts            # IP whitelist check karta hai (agar enabled ho)
│   │   │
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts   # @CurrentUser() — JWT se user info nikalata hai
│   │   │   ├── current-db.decorator.ts     # @CurrentDb() — tenant DB pool inject karta hai
│   │   │   └── roles.decorator.ts          # @Roles('admin') — roles set karta hai
│   │   │
│   │   ├── filters/
│   │   │   └── global-exception.filter.ts  # Sab errors yahan handle hote hain — clean response deta hai
│   │   │
│   │   ├── interceptors/
│   │   │   ├── response.interceptor.ts     # Sab responses ko standard format mein wrap karta hai
│   │   │   └── audit-log.interceptor.ts    # Write operations ko audit_logs mein save karta hai
│   │   │
│   │   └── pipes/
│   │       └── validation.pipe.ts          # DTO validation — galat data aane se rokta hai
│   │
│   ├── modules/
│   │   ├── super-admin/               # Phase 1 — Super Admin ka poora module
│   │   │   ├── super-admin.module.ts
│   │   │   ├── super-admin.controller.ts
│   │   │   ├── super-admin.service.ts
│   │   │   └── dto/
│   │   │       ├── login.dto.ts
│   │   │       └── create-company.dto.ts
│   │   │
│   │   ├── auth/                      # Phase 1 — Client login/logout/refresh
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/
│   │   │   │   └── jwt.strategy.ts
│   │   │   └── dto/
│   │   │       ├── login.dto.ts
│   │   │       └── change-password.dto.ts
│   │   │
│   │   ├── users/                     # Phase 1 — User management (CRUD, roles)
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   └── dto/
│   │   │       ├── create-user.dto.ts
│   │   │       └── update-user.dto.ts
│   │   │
│   │   ├── leads/                     # Phase 2
│   │   ├── clients/                   # Phase 5
│   │   ├── quotations/                # Phase 4
│   │   ├── deals/                     # Phase 4
│   │   ├── tasks/                     # Phase 3
│   │   ├── activities/                # Phase 3
│   │   ├── documents/                 # Phase 4
│   │   ├── finance/                   # Phase 5
│   │   ├── automation/                # Phase 6
│   │   ├── notifications/             # Phase 3
│   │   ├── reports/                   # Phase 7
│   │   ├── ai/                        # Phase 6
│   │   ├── masters/                   # Phase 7
│   │   ├── settings/                  # Phase 7
│   │   └── integrations/              # Phase 7
│   │
│   └── websocket/
│       └── notifications.gateway.ts   # Socket.io gateway — real-time notifications
│
├── sql/
│   ├── master/
│   │   └── 001_master_schema.sql      # crm_master database ki tables
│   └── tenant/
│       └── 001_tenant_schema.sql      # Har client database ki tables
│
├── uploads/                           # Uploaded files yahan store honge
├── .env                               # Environment variables (git mein nahi aata)
├── .env.example                       # Template — copy karke .env banao
├── package.json
├── nest-cli.json
└── tsconfig.json
```

---

## How Tenant Database Works

```
1. Super Admin → POST /super-admin/companies { name, email, slug }

2. Backend kya karta hai:
   a. crm_master.companies mein entry insert karta hai
   b. CREATE DATABASE crm_client_{slug} run karta hai
   c. sql/tenant/001_tenant_schema.sql us database pe run karta hai
   d. Admin user create karta hai uss database mein
   e. Temporary password generate karta hai
   f. Email bhejta hai admin ko credentials ke saath

3. Admin login karta hai:
   POST /auth/login { email, password, slug: "abc-corp" }
   
4. Backend:
   a. crm_master mein slug se db_name dhundta hai
   b. Us database mein user verify karta hai
   c. JWT banata hai — payload mein dbName hota hai
   
5. Har agle request pe:
   a. JWT se dbName nikalata hai
   b. TenantPoolService se us DB ka connection pool leta hai
   c. Pool ko request mein inject karta hai
   d. Controller/Service us pool se queries chalata hai
```

---

## API Endpoints

### Super Admin

```
POST   /api/super-admin/auth/login           → Super Admin login
POST   /api/super-admin/auth/refresh         → Token refresh
GET    /api/super-admin/companies            → All companies list
POST   /api/super-admin/companies            → New company create + DB provision
PATCH  /api/super-admin/companies/:id/activate    → Company activate
PATCH  /api/super-admin/companies/:id/deactivate  → Company deactivate
```

### Client Auth

```
POST   /api/auth/login                       → Admin/User login
POST   /api/auth/refresh                     → Token refresh
POST   /api/auth/logout                      → Logout
PATCH  /api/auth/change-password             → Password change
GET    /api/auth/me                          → Apni profile dekho
```

### Users (Admin only)

```
GET    /api/users                            → All users list
POST   /api/users                            → New user create
GET    /api/users/:id                        → User detail
PATCH  /api/users/:id                        → User update
DELETE /api/users/:id                        → User delete
PATCH  /api/users/:id/activate               → Activate/deactivate user
```

---

## Response Format

Sab API responses is format mein aate hain:

```json
// Success
{
  "success": true,
  "data": { ... },
  "message": "Lead created successfully"
}

// List with pagination
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}

// Error
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Email is required",
  "statusCode": 400
}
```

---

## JWT Token Structure

```json
// Access Token payload
{
  "sub": "user-uuid-here",
  "role": "admin",
  "dbName": "crm_client_abc_corp",
  "companySlug": "abc-corp",
  "type": "access",
  "iat": 1234567890,
  "exp": 1234568790
}
```

---

## Database Queries — Raw SQL Style

```typescript
// ORM nahi use karte — seedha SQL likhte hain
// $1, $2 parameterized queries use karo — SQL injection se bachav

// Example — Lead dhundna
const result = await pool.query(
  `SELECT * FROM leads WHERE id = $1 AND is_deleted = false`,
  [leadId]
);

// Example — Lead create karna
const result = await pool.query(
  `INSERT INTO leads (name, email, phone, source_id, assigned_to, created_by)
   VALUES ($1, $2, $3, $4, $5, $6)
   RETURNING *`,
  [name, email, phone, sourceId, assignedTo, createdBy]
);
```

---

## Security

- Passwords: `bcrypt` with cost factor 12
- JWT: Access token (15 min) + Refresh token (30 days)
- Refresh tokens: One-time use, stored as hash in DB
- Rate limiting: 5 login attempts per minute per IP
- SQL injection: Parameterized queries only
- CORS: Only frontend URL allowed
- Helmet: Security headers on all responses
- IP whitelist: Optional per company (Admin configures it)
- Audit logs: All create/update/delete operations logged

---

## Running the Project

```bash
# Development
pnpm run start:dev

# Production build
pnpm run build
pnpm run start:prod

# Run tests
pnpm run test

# Setup commands
pnpm run migrate          # SQL migrations chalao
pnpm run seed:super-admin # Pehla super admin banao
```

---

## Important Notes

- Koi ORM nahi hai — TypeORM ya Prisma bilkul use nahi kiya
- Sab tables manually SQL se banate hain (`sql/` folder mein)
- Har module apna folder mein complete hai — loosely coupled
- Comments Hinglish mein likhe hain throughout the code
- `.env` file kabhi git mein push mat karo
