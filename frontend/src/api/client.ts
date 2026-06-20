/* ─── API Client — typed fetch wrapper with JWT management ─────────────── */

import type {
  Activity,
  ActivityListResponse,
  CategoryInfo,
  DashboardData,
  EmissionFactor,
  FactorCreateRequest,
  FactorUpdateRequest,
  Goal,
  InsightsData,
  TokenResponse,
  User,
} from './types';

const API_BASE = 'http://localhost:8000/api';

// ─── Token management ──────────────────────────────────────────────────
function getToken(): string | null {
  return localStorage.getItem('ecosphere_token');
}

export function setToken(token: string): void {
  localStorage.setItem('ecosphere_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('ecosphere_token');
}

export function hasToken(): boolean {
  return !!getToken();
}

// ─── Base fetch ────────────────────────────────────────────────────────
async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json();
}

// ─── Auth ──────────────────────────────────────────────────────────────
export async function register(
  email: string,
  password: string,
  region: string = 'india',
  householdSize: number = 1,
): Promise<TokenResponse> {
  const data = await apiFetch<TokenResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      region,
      household_size: householdSize,
    }),
  });
  setToken(data.access_token);
  return data;
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  const data = await apiFetch<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(data.access_token);
  return data;
}

export async function getMe(): Promise<TokenResponse['user']> {
  return apiFetch('/auth/me');
}

export async function updateProfile(
  region?: string,
  householdSize?: number,
): Promise<User> {
  return apiFetch('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify({
      region,
      household_size: householdSize,
    }),
  });
}

export async function changePassword(
  oldPassword: string,
  newPassword: string,
): Promise<{ message: string }> {
  return apiFetch('/auth/me/password', {
    method: 'PUT',
    body: JSON.stringify({
      old_password: oldPassword,
      new_password: newPassword,
    }),
  });
}

// ─── Factors ───────────────────────────────────────────────────────────
export async function getFactors(): Promise<EmissionFactor[]> {
  return apiFetch('/factors');
}

export async function getCategories(): Promise<CategoryInfo[]> {
  return apiFetch('/factors/categories');
}

export async function createFactor(body: FactorCreateRequest): Promise<EmissionFactor> {
  return apiFetch('/factors', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateFactor(
  factorId: number,
  body: FactorUpdateRequest,
): Promise<EmissionFactor> {
  return apiFetch(`/factors/${factorId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function deleteFactor(factorId: number): Promise<{ message: string }> {
  return apiFetch(`/factors/${factorId}`, {
    method: 'DELETE',
  });
}

// ─── Activities ────────────────────────────────────────────────────────
export async function logActivity(
  factorId: number,
  quantity: number,
  loggedAt?: string,
): Promise<Activity> {
  return apiFetch('/activities', {
    method: 'POST',
    body: JSON.stringify({
      factor_id: factorId,
      quantity,
      logged_at: loggedAt,
    }),
  });
}

export async function getActivities(
  page: number = 1,
  pageSize: number = 20,
  category?: string,
): Promise<ActivityListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  if (category) params.set('category', category);
  return apiFetch(`/activities?${params}`);
}

export async function deleteActivity(id: number): Promise<void> {
  return apiFetch(`/activities/${id}`, { method: 'DELETE' });
}

// ─── Insights ──────────────────────────────────────────────────────────
export async function getDashboard(): Promise<DashboardData> {
  return apiFetch('/insights/dashboard');
}

export async function getTips(): Promise<InsightsData> {
  return apiFetch('/insights/tips');
}

export async function submitTipFeedback(
  tipId: string,
  action: 'accept' | 'dismiss',
): Promise<void> {
  return apiFetch(`/insights/tips/${tipId}/feedback`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  });
}

// ─── Goals ─────────────────────────────────────────────────────────────
export async function createGoal(targetKg: number): Promise<Goal> {
  return apiFetch('/goals', {
    method: 'POST',
    body: JSON.stringify({ target_kg_per_month: targetKg }),
  });
}

export async function getGoal(): Promise<Goal | null> {
  return apiFetch('/goals');
}

export async function updateGoal(
  goalId: number,
  update: { target_kg_per_month?: number; streak_count?: number },
): Promise<Goal> {
  return apiFetch(`/goals/${goalId}`, {
    method: 'PATCH',
    body: JSON.stringify(update),
  });
}
