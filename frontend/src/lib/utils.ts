import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// shadcn/ui ka cn utility -- class names merge karta hai
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Date format karo -- Indian format
export function formatDate(date: string | Date | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Date + Time format
export function formatDateTime(date: string | Date | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Currency format -- Indian Rupees
export function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Plan badge color
export function getPlanColor(plan: string): string {
  const colors: Record<string, string> = {
    trial: 'badge-trial',
    active: 'badge-active',
    expired: 'badge-expired',
    suspended: 'badge-suspended',
  };
  return colors[plan] || 'badge';
}

// Plan label
export function getPlanLabel(plan: string): string {
  const labels: Record<string, string> = {
    trial: 'Trial',
    active: 'Active',
    expired: 'Expired',
    suspended: 'Suspended',
  };
  return labels[plan] || plan;
}

// Days remaining calculate karo
export function getDaysRemaining(date: string | Date | null): number {
  if (!date) return 0;
  const diff = new Date(date).getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Truncate text
export function truncate(text: string, length: number = 50): string {
  if (!text) return '-';
  return text.length > length ? text.substring(0, length) + '...' : text;
}

// Avatar initials generate karo
export function getInitials(name: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}