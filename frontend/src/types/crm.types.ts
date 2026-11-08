// CRM TypeScript Types for Admin & Sales Modules

export interface Lead {
  id: string;
  lead_number?: number;
  name: string;
  email?: string;
  phone?: string;
  alternate_phone?: string;
  company?: string;
  designation?: string;
  source_id?: string;
  source_name?: string;
  status_id?: string;
  status_name?: string;
  status_color?: string;
  pipeline_stage_id?: string;
  stage_name?: string;
  stage_color?: string;
  industry_id?: string;
  category_id?: string;
  score?: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  assigned_name?: string;
  assigned_by?: string;
  assigned_at?: string;
  custom_data?: Record<string, any>;
  tags?: string[];
  country?: string;
  state?: string;
  city?: string;
  address?: string;
  pincode?: string;
  website?: string;
  is_duplicate?: boolean;
  duplicate_of?: string;
  converted_at?: string;
  converted_to?: string;
  is_deleted?: boolean;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface FollowupTask {
  id: string;
  entity_type: 'lead' | 'client';
  entity_id: string;
  entity_name?: string;
  entity_phone?: string;
  title: string;
  description?: string;
  type: 'follow_up' | 'call' | 'meeting' | 'email' | 'whatsapp' | 'custom';
  due_date: string;
  assigned_to?: string;
  assigned_name?: string;
  is_completed: boolean;
  completed_at?: string;
  created_by?: string;
  created_at: string;
}

export interface Activity {
  id: string;
  entity_type: 'lead' | 'client';
  entity_id: string;
  type: 'call' | 'email' | 'whatsapp' | 'meeting' | 'note' | 'sms';
  subject?: string;
  description?: string;
  outcome?: string;
  duration_mins?: number;
  scheduled_at?: string;
  completed_at?: string;
  is_completed?: boolean;
  created_by?: string;
  creator_name?: string;
  created_at: string;
}

export interface MasterItem {
  id: string;
  name: string;
  color?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface Branch {
  id: string;
  name: string;
  code?: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  created_at: string;
}

export interface FormField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: 'text' | 'number' | 'select' | 'date' | 'textarea' | 'checkbox';
  is_required: boolean;
  options?: string[];
  sort_order: number;
}

