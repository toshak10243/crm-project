// Auth related TypeScript types

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  username?: string;
  role?: string;
  mustChangePassword?: boolean;
  companySlug?: string;
  avatarUrl?: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  adminName: string;
  adminEmail: string;
  phone?: string;
  plan: 'trial' | 'active' | 'expired' | 'suspended';
  trialEndsAt?: string;
  subscriptionStartAt?: string;
  subscriptionEndsAt?: string;
  subscriptionPlan?: string;
  subscriptionAmount?: number;
  isActive: boolean;
  activatedAt?: string;
  createdAt: string;
}

export interface PaymentRequest {
  id: string;
  companyId: string;
  companyName: string;
  adminEmail: string;
  adminName: string;
  plan: string;
  amount: number;
  paymentMode?: string;
  referenceNo?: string;
  screenshotUrl?: string;
  notes?: string;
  status: 'pending' | 'verified' | 'rejected';
  createdAt: string;
}

export interface DashboardStats {
  total_companies: number;
  active_trials: number;
  active_subscriptions: number;
  expired: number;
  suspended: number;
  new_this_month: number;
  trials_ending_in_2days: number;
  subscriptions_expiring_soon: number;
  pending_payments: number;
}