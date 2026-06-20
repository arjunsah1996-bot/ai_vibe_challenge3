/* ─── API Types — TypeScript contracts matching backend Pydantic schemas ─── */

export interface User {
  id: number;
  email: string;
  region: string;
  household_size: number;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface EmissionFactor {
  id: number;
  category: string;
  activity_type: string;
  region: string;
  unit: string;
  kg_co2e_per_unit: number;
  source: string;
  version: string;
  effective_from: string;
  default_quantity?: number;
}

export interface CategoryInfo {
  category: string;
  activities: EmissionFactor[];
}

export interface Activity {
  id: number;
  factor_id: number;
  quantity: number;
  computed_co2e: number;
  logged_at: string;
  category?: string;
  activity_type?: string;
  unit?: string;
}

export interface ActivityListResponse {
  items: Activity[];
  total: number;
  page: number;
  page_size: number;
}

export interface DailyTotal {
  date: string;
  total_co2e: number;
}

export interface CategoryBreakdown {
  category: string;
  total_co2e: number;
  percentage: number;
}

export interface WorldState {
  haze_density: number;
  foliage_density: number;
  light_warmth: number;
  river_clarity: number;
  grove_size: number;
  wildlife_count: number;
  overall_score: number;
}

export interface DashboardData {
  daily_totals: DailyTotal[];
  category_breakdown: CategoryBreakdown[];
  current_month_total: number;
  previous_month_total: number | null;
  baseline_daily_avg: number | null;
  trend_direction: 'improving' | 'worsening' | 'stable';
  world_state: WorldState;
}

export interface Tip {
  id: string;
  category: string;
  title: string;
  description: string;
  potential_saving_kg: number;
  confidence: number;
  is_anomaly: boolean;
}

export interface InsightsData {
  tips: Tip[];
  anomalies: string[];
  top_category: string;
  top_category_pct: number;
}

export interface Goal {
  id: number;
  target_kg_per_month: number;
  baseline_kg: number | null;
  streak_count: number;
  created_at: string;
  current_month_co2e?: number;
  progress_pct?: number;
  daily_budget?: number;
}

// ─── Request types ─────────────────────────────────────────────────────
export interface UserUpdateRequest {
  region?: string;
  household_size?: number;
}

export interface PasswordChangeRequest {
  old_password: string;
  new_password: string;
}

export interface FactorCreateRequest {
  category: string;
  activity_type: string;
  region?: string;
  unit: string;
  kg_co2e_per_unit: number;
  source: string;
}

export interface FactorUpdateRequest {
  category?: string;
  activity_type?: string;
  region?: string;
  unit?: string;
  kg_co2e_per_unit?: number;
  source?: string;
}

// Utility type for category display names and icons
export const CATEGORY_META: Record<string, { label: string; icon: string; color: string }> = {
  household_energy: { label: 'Household Energy', icon: '🏠', color: '#f59e0b' },
  backup_power: { label: 'Backup Power', icon: '🔋', color: '#ef4444' },
  transport: { label: 'Transport', icon: '🚗', color: '#3b82f6' },
  food_diet: { label: 'Food & Diet', icon: '🍽️', color: '#10b981' },
  shopping: { label: 'Shopping', icon: '🛍️', color: '#8b5cf6' },
  waste: { label: 'Waste', icon: '♻️', color: '#6366f1' },
  occasional: { label: 'Occasional', icon: '🎉', color: '#ec4899' },
};

export const CATEGORY_OPTIONS = Object.keys(CATEGORY_META);

export function formatActivityType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export function formatCO2(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} t`;
  if (kg >= 1) return `${kg.toFixed(1)} kg`;
  return `${(kg * 1000).toFixed(0)} g`;
}
