# CRM Frontend — React + TypeScript

This is the frontend for the CRM Lead Management System. Built with React 18 + Vite + TypeScript + shadcn/ui + Tailwind CSS.

---

## Folder Structure

```
frontend/
├── src/
│   ├── main.tsx                        # React app entry point
│   ├── App.tsx                         # Root component — router setup
│   │
│   ├── lib/
│   │   ├── api.ts                      # Axios instance — base URL, interceptors, token attach
│   │   ├── socket.ts                   # Socket.io connection setup
│   │   ├── utils.ts                    # Helper functions (cn, formatDate, formatCurrency, etc.)
│   │   └── constants.ts                # App wide constants (pipeline stages, roles, etc.)
│   │
│   ├── store/                          # Zustand global state
│   │   ├── auth.store.ts               # User info, tokens, login/logout actions
│   │   └── notification.store.ts       # Unread count, notification list
│   │
│   ├── hooks/                          # Custom React hooks
│   │   ├── useAuth.ts                  # Auth related hooks
│   │   ├── usePermission.ts            # Permission check hook — can user do this action?
│   │   └── useDebounce.ts              # Search input debounce
│   │
│   ├── types/                          # TypeScript type definitions
│   │   ├── auth.types.ts               # User, Token types
│   │   ├── lead.types.ts               # Lead, Pipeline types
│   │   ├── api.types.ts                # API response wrapper types
│   │   └── index.ts                    # Re-exports sab types
│   │
│   ├── components/
│   │   ├── ui/                         # shadcn/ui base components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── table.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── card.tsx
│   │   │   ├── select.tsx
│   │   │   ├── toast.tsx
│   │   │   └── ...
│   │   │
│   │   ├── layout/                     # App shell components
│   │   │   ├── AppLayout.tsx           # Main layout — sidebar + header + content
│   │   │   ├── Sidebar.tsx             # Left navigation sidebar
│   │   │   ├── Header.tsx              # Top header — search, notifications, profile
│   │   │   └── SuperAdminLayout.tsx    # Super Admin ka alag layout
│   │   │
│   │   └── common/                     # Shared reusable components
│   │       ├── DataTable.tsx           # Universal table — pagination, search, filters
│   │       ├── DynamicForm.tsx         # Dynamic fields render karta hai (custom fields)
│   │       ├── KanbanBoard.tsx         # Pipeline drag-drop view
│   │       ├── PageHeader.tsx          # Page title + breadcrumb + action buttons
│   │       ├── ConfirmDialog.tsx       # Delete/action confirm popup
│   │       ├── EmptyState.tsx          # Jab koi data nahi hota
│   │       ├── LoadingSpinner.tsx      # Loading states
│   │       └── StatusBadge.tsx         # Colored status badges
│   │
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── Login.tsx               # Login page — Admin/User
│   │   │   └── ChangePassword.tsx      # First login pe password change
│   │   │
│   │   ├── super-admin/
│   │   │   ├── Dashboard.tsx           # Super Admin dashboard
│   │   │   └── Companies.tsx           # Companies list + create + activate/deactivate
│   │   │
│   │   ├── dashboard/
│   │   │   └── Dashboard.tsx           # Main CRM dashboard — KPIs, charts, activity
│   │   │
│   │   ├── leads/
│   │   │   ├── index.tsx               # Leads list (table + kanban toggle)
│   │   │   ├── LeadDetail.tsx          # Single lead detail page
│   │   │   └── LeadForm.tsx            # Create/edit lead form
│   │   │
│   │   ├── clients/
│   │   │   ├── index.tsx               # Clients list
│   │   │   └── ClientDetail.tsx        # Client 360° view
│   │   │
│   │   ├── quotations/
│   │   │   ├── index.tsx               # Quotations list
│   │   │   ├── QuotationBuilder.tsx    # Create quotation — line items
│   │   │   └── QuotationDetail.tsx     # View quotation + send + status
│   │   │
│   │   ├── finance/
│   │   │   ├── Invoices.tsx
│   │   │   ├── Payments.tsx
│   │   │   └── Expenses.tsx
│   │   │
│   │   ├── reports/
│   │   │   ├── SalesReport.tsx
│   │   │   ├── LeadReport.tsx
│   │   │   └── ActivityReport.tsx
│   │   │
│   │   ├── users/
│   │   │   ├── index.tsx               # Users list
│   │   │   └── UserForm.tsx            # Create/edit user + roles
│   │   │
│   │   ├── masters/
│   │   │   ├── LeadMasters.tsx         # Lead sources, statuses, categories, custom fields
│   │   │   ├── ClientMasters.tsx
│   │   │   └── SalesMasters.tsx        # Pipeline stages, deal types
│   │   │
│   │   └── settings/
│   │       ├── CompanySettings.tsx
│   │       ├── NotificationSettings.tsx
│   │       └── IntegrationSettings.tsx
│   │
│   └── router/
│       ├── index.tsx                   # All routes defined here
│       ├── PrivateRoute.tsx            # JWT check — nahi hai to login pe redirect
│       ├── SuperAdminRoute.tsx         # Super Admin only routes
│       └── PermissionRoute.tsx         # Permission check — nahi hai to 403
│
├── public/
│   └── favicon.ico
│
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── .env
└── .env.example
```

---

## State Management

### Zustand Store — `auth.store.ts`

```typescript
// Global auth state
{
  user: User | null,
  accessToken: string | null,
  isSuperAdmin: boolean,
  
  // Actions
  setAuth: (user, token) => void,
  logout: () => void,
}
```

### React Query — Server State

```typescript
// Leads list example
const { data, isLoading } = useQuery({
  queryKey: ['leads', filters],
  queryFn: () => leadsApi.getAll(filters),
});

// Create lead
const { mutate } = useMutation({
  mutationFn: leadsApi.create,
  onSuccess: () => {
    queryClient.invalidateQueries(['leads']); // List refresh ho jayegi
  },
});
```

---

## API Setup — Axios

```typescript
// lib/api.ts
// Axios automatically:
// 1. Base URL lagata hai (VITE_API_URL)
// 2. JWT token har request mein attach karta hai
// 3. 401 aane pe refresh token se new token leta hai
// 4. Dobara 401 aaye to logout karta hai
```

---

## Permission System

```typescript
// hooks/usePermission.ts
const { can } = usePermission();

// Check karo before rendering
if (can('leads', 'add')) {
  return <Button>Add Lead</Button>;
}

// Route level bhi check hota hai
<PermissionRoute module="leads" action="view">
  <LeadsPage />
</PermissionRoute>
```

---

## Dynamic Forms

Admin custom fields configure karta hai settings mein. Frontend automatically render karta hai:

```typescript
// DynamicForm.tsx
// API se fields fetch karta hai: GET /api/masters/custom-fields?entity=lead
// Fir type ke hisaab se render karta hai:
// text → <Input>
// select → <Select>
// date → <DatePicker>
// multi_select → <MultiSelect>
// checkbox → <Checkbox>
// textarea → <Textarea>
```

---

## UI Design Rules

- **Font**: Inter (Google Fonts)
- **Sidebar**: Dark (`#0f172a`) — always visible on desktop
- **Content**: White/light gray background
- **Primary Color**: Indigo/Blue (`#4f46e5`)
- **Table rows**: Hover effect, clickable rows
- **Forms**: Inline validation, error messages below fields
- **Loading**: Skeleton loaders (not spinners)
- **Empty state**: Illustration + message + action button
- **Mobile**: Responsive but desktop-first

---

## Running the Project

```bash
# Development
pnpm run dev

# Production build
pnpm run build

# Preview production build
pnpm run preview

# Type check
pnpm run tsc --noEmit
```

---

## Environment Variables

```env
# Backend API URL
VITE_API_URL=http://localhost:3001/api

# Socket.io URL
VITE_SOCKET_URL=http://localhost:3001
```

---

## Important Notes

- `src/components/ui/` — ye files shadcn/ui se copy karte hain, khud mat likho
- React Query ki `queryKey` mein filters dalo — cache sahi kaam karega
- Zustand store mein sirf global state rakho — local state ke liye `useState` use karo
- Sab API calls `lib/api.ts` ke axios instance se karo — direct fetch mat use karo
- `.env` kabhi git mein push mat karo
