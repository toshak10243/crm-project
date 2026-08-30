Enterprise Multi-Tenant Lead Management & CRM SystemA production-grade, zero-cost architecture Lead Management CRM built with strict database isolation per tenant, dynamic form rendering via PostgreSQL JSONB, granular role-based access control (RBAC), and a modern enterprise UI.What is this Project?This system is an isolated multi-tenant CRM designed for B2B client management. Unlike traditional shared-table multi-tenancy where all tenants share the same tables and filter via tenant_id, this system uses a Dedicated Database per Tenant strategy.Core Operational HierarchySuper Admin (Platform Owner)
    └── Admin (Tenant / Client Organization Owner)
            └── Users (Sales Agents / Team Managers)
Super Admin:Manages client organizations manually upon offline payment confirmation.Triggers dynamic database creation: CREATE DATABASE crm_client_{slug}.  Controls activation/suspension of tenant databases.  Admin (Tenant Owner):Manages their dedicated instance, sales pipelines, custom lead forms, team members, and role permissions.  Enforces first-login mandatory password resets.  Users (Agents & Managers):Handle lead ingestion, follow-ups, quotations, deal lifecycles, and conversions.  Tech Stack & Zero-Cost ArchitectureLayerTechnologyRationaleBackendNestJS (TypeScript)Scalable modular framework, dependency injection, and guards.  DatabasePostgreSQLRaw SQL via pg & pg-pool. Full query control, zero ORM overhead.  Caching & QueuesRedis + BullMQTenant connection caching, rate limiting, and async jobs.  FrontendReact 19 + TypeScript + ViteBlazing fast enterprise single-page application.  UI ComponentsTailwind CSS + Radix UI + LucideHigh-density, accessible MNC-standard design system.  State ManagementZustand + TanStack QueryClient state and optimized server-state caching.  Project Structurecrm-project/
├── backend/                  # NestJS API Gateway & Multi-Tenant Services
│   ├── scripts/              # Master DB initialization scripts
│   ├── sql/
│   │   ├── master/           # Master schema (companies & super admin)
│   │   └── tenant/           # Tenant baseline schema (leads, users, forms)
│   ├── src/
│   │   ├── common/           # Guards, Decorators, Dynamic Tenant Pool Manager
│   │   ├── config/           # Environment configuration
│   │   └── modules/          # Super-Admin, Auth, Users, Leads modules
│   └── .env
│
├── frontend/                 # Vite + React 19 SPA
│   ├── src/
│   │   ├── components/       # Layouts, Navigation, and UI components
│   │   ├── pages/            # Super Admin & Tenant dashboards, Auth screens
│   │   ├── router/           # Protected routing and guards
│   │   └── store/            # Global Zustand auth stores
│   └── tailwind.config.js
│
└── README.md
PrerequisitesEnsure you have the following installed on your system:Node.js: v20+ or v24+  pnpm: v10+ or v11+  PostgreSQL: v15+ running locally on port 5432  Redis: Running locally on port 6379  Local Setup & Installation1. Clone the RepositoryBashgit clone https://github.com/toshak10243/crm-project.git
cd crm-project
2. Backend SetupStep A: Configure Environment VariablesCreate a .env file inside the backend/ directory:Code snippet# Master Database Configuration (Master DB for companies metadata)
MASTER_DB_HOST=localhost
MASTER_DB_PORT=5432
MASTER_DB_NAME=crm_master
MASTER_DB_USER=postgres
MASTER_DB_PASSWORD=your_actual_postgres_password

# Redis Configuration (For cache and queues)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Secrets (Tokens generate karne ke liye secrets)
JWT_ACCESS_SECRET=your_super_secret_access_key_min_32_chars_123
JWT_REFRESH_SECRET=your_super_secret_refresh_key_min_32_chars_456
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=30d

# Initial Super Admin Seed Credentials (Pehli baar login karne ke liye)
SUPER_ADMIN_EMAIL=superadmin@yourcrm.com
SUPER_ADMIN_PASSWORD=SuperSecurePass123!

# App Configuration
PORT=3001
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
Step B: Install Dependencies & Run MigrationsBashcd backend

# Dependencies install karein
pnpm install

# Master DB create karein aur Super Admin seed karein
npx ts-node scripts/init-master.ts

# Backend development server start karein
pnpm run start:dev
The backend server will run on http://localhost:3001/api.3. Frontend SetupStep A: Install DependenciesBashcd ../frontend

# Frontend dependencies install karein
pnpm install
Step B: Start Development ServerBashpnpm run dev
The frontend application will be live at http://localhost:5173/.How to Test the Full FlowSuper Admin Access:Visit http://localhost:5173/login.Toggle to Super Admin Portal.  Login with superadmin@yourcrm.com and SuperSecurePass123!.  Provision a New Tenant:Click Provision New Client in the Super Admin dashboard.Enter Company Name (e.g., Acme Corp), Slug (acme_corp), Admin Name, Email, and Temporary Password.NestJS will automatically create a dedicated PostgreSQL database crm_client_acme_corp, execute baseline tables, seed default pipeline stages, and create the Admin user.  Tenant Admin First-Time Login:Sign out from Super Admin.Switch to Client Login tab.  Enter Slug (acme_corp), Admin Email, and Temporary Password.  Set a permanent password on the forced reset screen.  Access the Tenant CRM Dashboard and manage users under the Team & Permissions tab.  Security Best PracticesStrict Tenant Isolation: Dynamic connection pooling prevents cross-database data leaks.  Raw Parameterized Queries: SQL injection prevention via strictly indexed parameters ($1, $2) across all modules.  Forced Password Rotation: New tenant admins and agents must update their default credentials before gaining dashboard access.  Security Headers & Sanitization: Enabled via Helmet and NestJS global validation pipes.LicenseThis project is licensed under the MIT License.
