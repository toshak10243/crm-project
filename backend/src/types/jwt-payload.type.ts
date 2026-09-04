// JWT token ke andar jo data hota hai uska type
// Ye TypeScript ko batata hai ki payload mein kya expect karo

export interface JwtPayload {
  sub: string;          // User ID
  role: string;         // 'admin' | 'manager' | 'agent'
  dbName: string;       // 'crm_client_abc_corp'
  companySlug: string;  // 'abc-corp'
  type: string;         // 'access' | 'refresh'
  iat?: number;         // Issued at
  exp?: number;         // Expires at
}

export interface SuperAdminJwtPayload {
  sub: string;          // Super Admin ID
  email: string;
  type: 'super_admin';
  iat?: number;
  exp?: number;
}