
export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  type: string;
}

export interface UserSession {
  id: number;
  user_id: number;
  session_id: string;
  date: string;
  productive_time: number; // minutes
  neutral_time: number;
  wasted_time: number;
  idle_time: number;
  total_time: number;
  device_id: string;
}

export interface KPIData {
  label: string;
  actual: string;
  target: string;
  percentage: number;
  status: 'red' | 'yellow' | 'green';
}

export interface UsageBreakdown {
  name: string;
  category: 'domain' | 'app';
  totalTime: string;
  percentage: string;
}

export type TimeRange = 'daily' | 'yesterday' | 'weekly' | 'monthly' | 'custom';
