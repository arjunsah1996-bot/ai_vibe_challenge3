/* ─── SettingsPage — Profile, Budget & Master Activity Management ───────── */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getFactors,
  createFactor,
  updateFactor,
  deleteFactor,
  getGoal,
  createGoal,
  updateGoal,
} from '../api/client';
import type { EmissionFactor, Goal } from '../api/types';
import { CATEGORY_META, CATEGORY_OPTIONS, formatActivityType, formatCO2 } from '../api/types';
import './SettingsPage.css';

type SettingsTab = 'profile' | 'budget' | 'activities';

interface SettingsPageProps {
  onBack: () => void;
}

export default function SettingsPage({ onBack }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  return (
    <div className="settings-page">
      {/* Header */}
      <header className="settings-header">
        <button className="btn btn-ghost settings-back" onClick={onBack} id="settings-back-btn">
          ← Back to Dashboard
        </button>
        <h1 className="settings-title font-display">⚙️ Settings</h1>
      </header>

      {/* Tab bar */}
      <nav className="settings-tabs" role="tablist">
        {(['profile', 'budget', 'activities'] as SettingsTab[]).map(tab => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            className={`settings-tab ${activeTab === tab ? 'settings-tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
            id={`tab-${tab}`}
          >
            {tab === 'profile' && '👤 Profile'}
            {tab === 'budget' && '💰 Budget'}
            {tab === 'activities' && '📋 Activities'}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <div className="settings-content">
        {activeTab === 'profile' && <ProfileTab />}
        {activeTab === 'budget' && <BudgetTab />}
        {activeTab === 'activities' && <ActivitiesTab />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PROFILE TAB
   ═══════════════════════════════════════════════════════════════════════════ */
function ProfileTab() {
  const { user, updateProfile, changePassword } = useAuth();
  const [region, setRegion] = useState(user?.region || 'india');
  const [householdSize, setHouseholdSize] = useState(user?.household_size || 1);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const handleProfileSave = async () => {
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      await updateProfile(region, householdSize);
      setProfileMsg('✅ Profile updated successfully');
    } catch (err) {
      setProfileMsg(`❌ ${(err as Error).message}`);
    } finally {
      setProfileSaving(false);
      setTimeout(() => setProfileMsg(null), 3000);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordMsg('❌ New passwords do not match');
      return;
    }
    setPasswordSaving(true);
    setPasswordMsg(null);
    try {
      await changePassword(oldPassword, newPassword);
      setPasswordMsg('✅ Password changed successfully');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordMsg(`❌ ${(err as Error).message}`);
    } finally {
      setPasswordSaving(false);
      setTimeout(() => setPasswordMsg(null), 4000);
    }
  };

  return (
    <div className="settings-tab-content stagger-children">
      {/* Profile info */}
      <div className="glass-card settings-card">
        <h2 className="settings-card-title">Profile Information</h2>
        <div className="settings-form">
          <div className="form-group">
            <label className="form-label" htmlFor="profile-email">Email</label>
            <input
              id="profile-email"
              className="form-input"
              type="email"
              value={user?.email || ''}
              disabled
            />
            <span className="form-hint">Email cannot be changed</span>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="profile-region">Region</label>
            <select
              id="profile-region"
              className="form-input"
              value={region}
              onChange={e => setRegion(e.target.value)}
            >
              <option value="india">India</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="profile-household">Household Size</label>
            <input
              id="profile-household"
              className="form-input"
              type="number"
              min={1}
              max={20}
              value={householdSize}
              onChange={e => setHouseholdSize(Number(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Member Since</label>
            <input
              className="form-input"
              type="text"
              value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
              disabled
            />
          </div>
          {profileMsg && <div className="settings-msg" role="status">{profileMsg}</div>}
          <button
            className="btn btn-primary"
            onClick={handleProfileSave}
            disabled={profileSaving}
            id="save-profile-btn"
          >
            {profileSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Password change */}
      <div className="glass-card settings-card">
        <h2 className="settings-card-title">Change Password</h2>
        <div className="settings-form">
          <div className="form-group">
            <label className="form-label" htmlFor="pw-old">Current Password</label>
            <input
              id="pw-old"
              className="form-input"
              type="password"
              value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="pw-new">New Password</label>
            <input
              id="pw-new"
              className="form-input"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="pw-confirm">Confirm New Password</label>
            <input
              id="pw-confirm"
              className="form-input"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          {passwordMsg && <div className="settings-msg" role="status">{passwordMsg}</div>}
          <button
            className="btn btn-primary"
            onClick={handlePasswordChange}
            disabled={passwordSaving || !oldPassword || !newPassword || !confirmPassword}
            id="change-password-btn"
          >
            {passwordSaving ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   BUDGET TAB
   ═══════════════════════════════════════════════════════════════════════════ */
function BudgetTab() {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [targetKg, setTargetKg] = useState(200);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchGoal = useCallback(async () => {
    try {
      const g = await getGoal();
      setGoal(g);
      if (g) setTargetKg(g.target_kg_per_month);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchGoal(); }, [fetchGoal]);

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      if (goal) {
        const updated = await updateGoal(goal.id, { target_kg_per_month: targetKg });
        setGoal(updated);
        setMsg('✅ Budget updated successfully');
      } else {
        const created = await createGoal(targetKg);
        setGoal(created);
        setMsg('✅ Budget created successfully');
      }
    } catch (err) {
      setMsg(`❌ ${(err as Error).message}`);
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="settings-tab-content">
        <div className="glass-card settings-card">
          <div className="settings-loading">Loading budget data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-tab-content stagger-children">
      {/* Current status */}
      {goal && (
        <div className="glass-card settings-card">
          <h2 className="settings-card-title">Current Budget Status</h2>
          <div className="budget-status-grid">
            <div className="budget-stat">
              <span className="budget-stat-label">Monthly Target</span>
              <span className="budget-stat-value text-emerald">{formatCO2(goal.target_kg_per_month)}</span>
            </div>
            <div className="budget-stat">
              <span className="budget-stat-label">Used This Month</span>
              <span className="budget-stat-value text-golden">{formatCO2(goal.current_month_co2e || 0)}</span>
            </div>
            <div className="budget-stat">
              <span className="budget-stat-label">Daily Budget</span>
              <span className="budget-stat-value text-sky">{formatCO2(goal.daily_budget || 0)}</span>
            </div>
            <div className="budget-stat">
              <span className="budget-stat-label">Progress</span>
              <span className="budget-stat-value" style={{
                color: (goal.progress_pct || 0) > 90 ? 'var(--color-coral)' :
                       (goal.progress_pct || 0) > 70 ? 'var(--color-golden)' : 'var(--color-emerald)'
              }}>
                {Math.round(goal.progress_pct || 0)}%
              </span>
            </div>
            <div className="budget-stat">
              <span className="budget-stat-label">🔥 Streak</span>
              <span className="budget-stat-value text-emerald">{goal.streak_count} days</span>
            </div>
            <div className="budget-stat">
              <span className="budget-stat-label">Baseline</span>
              <span className="budget-stat-value">{goal.baseline_kg ? `${formatCO2(goal.baseline_kg)}/mo` : '—'}</span>
            </div>
          </div>
          {/* Progress bar */}
          <div className="budget-progress-wrap">
            <div className="progress-bar" style={{ height: 12 }}>
              <div
                className="progress-bar-fill"
                style={{
                  width: `${Math.min(goal.progress_pct || 0, 100)}%`,
                  background: (goal.progress_pct || 0) > 90
                    ? 'linear-gradient(135deg, #f43f5e, #ef4444)'
                    : (goal.progress_pct || 0) > 70
                    ? 'linear-gradient(135deg, #f59e0b, #fbbf24)'
                    : 'var(--gradient-primary)',
                }}
              />
            </div>
            <span className="budget-progress-label text-muted text-xs">
              {formatCO2(goal.current_month_co2e || 0)} / {formatCO2(goal.target_kg_per_month)} used
            </span>
          </div>
        </div>
      )}

      {/* Edit / Create */}
      <div className="glass-card settings-card">
        <h2 className="settings-card-title">
          {goal ? 'Update Monthly Budget' : 'Set Your Monthly Budget'}
        </h2>
        <p className="text-secondary text-sm" style={{ marginBottom: 'var(--space-lg)' }}>
          {goal
            ? 'Adjust your monthly carbon budget target. Your streak and progress will be recalculated.'
            : 'Set a monthly carbon budget to track your progress and build streaks.'}
        </p>
        <div className="settings-form">
          <div className="form-group">
            <label className="form-label" htmlFor="budget-target">Monthly Target (kg CO₂e)</label>
            <input
              id="budget-target"
              type="range"
              min={50}
              max={500}
              step={10}
              value={targetKg}
              onChange={e => setTargetKg(Number(e.target.value))}
              className="goal-slider"
            />
            <div className="budget-slider-labels">
              <span className="text-muted text-xs">50 kg</span>
              <span className="goal-slider-value">{targetKg} kg/month</span>
              <span className="text-muted text-xs">500 kg</span>
            </div>
          </div>
          {msg && <div className="settings-msg" role="status">{msg}</div>}
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
            id="save-budget-btn"
          >
            {saving ? 'Saving...' : goal ? 'Update Budget' : 'Set Budget →'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ACTIVITIES TAB — Master activity / emission factor management
   ═══════════════════════════════════════════════════════════════════════════ */
function ActivitiesTab() {
  const [factors, setFactors] = useState<EmissionFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingFactor, setEditingFactor] = useState<EmissionFactor | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const fetchFactors = useCallback(async () => {
    try {
      const data = await getFactors();
      setFactors(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchFactors(); }, [fetchFactors]);

  const filtered = factors.filter(f => {
    const matchSearch = !search ||
      f.activity_type.toLowerCase().includes(search.toLowerCase()) ||
      f.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCategory || f.category === filterCategory;
    return matchSearch && matchCat;
  });

  const handleDelete = async (id: number) => {
    try {
      await deleteFactor(id);
      setFactors(prev => prev.filter(f => f.id !== id));
      setMsg('✅ Activity deleted');
      setDeleteConfirm(null);
    } catch (err) {
      setMsg(`❌ ${(err as Error).message}`);
    }
    setTimeout(() => setMsg(null), 3000);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingFactor(null);
  };

  const handleModalSave = async (data: EmissionFactor) => {
    if (editingFactor) {
      // Update existing
      setFactors(prev => prev.map(f => f.id === data.id ? data : f));
    } else {
      // New
      setFactors(prev => [...prev, data]);
    }
    handleModalClose();
    setMsg(editingFactor ? '✅ Activity updated' : '✅ Activity added');
    setTimeout(() => setMsg(null), 3000);
  };

  if (loading) {
    return (
      <div className="settings-tab-content">
        <div className="glass-card settings-card">
          <div className="settings-loading">Loading activities...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-tab-content">
      <div className="glass-card settings-card">
        <div className="activities-header">
          <h2 className="settings-card-title">Master Activity List</h2>
          <button
            className="btn btn-primary"
            onClick={() => { setEditingFactor(null); setShowModal(true); }}
            id="add-activity-btn"
          >
            + Add Activity
          </button>
        </div>

        {/* Filters */}
        <div className="activities-filters">
          <input
            className="form-input activities-search"
            type="text"
            placeholder="Search activities..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            id="activity-search"
          />
          <select
            className="form-input activities-category-filter"
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            id="activity-filter"
          >
            <option value="">All Categories</option>
            {CATEGORY_OPTIONS.map(cat => (
              <option key={cat} value={cat}>
                {CATEGORY_META[cat]?.icon} {CATEGORY_META[cat]?.label || cat}
              </option>
            ))}
          </select>
        </div>

        {msg && <div className="settings-msg" role="status">{msg}</div>}

        {/* Table */}
        <div className="activities-table-wrap">
          <table className="activities-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Activity</th>
                <th>Unit</th>
                <th>kg CO₂e/unit</th>
                <th>Source</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="activities-empty">
                    No activities match your filters.
                  </td>
                </tr>
              )}
              {filtered.map(f => (
                <tr key={f.id}>
                  <td>
                    <span className="activity-cat-badge" style={{
                      background: `${CATEGORY_META[f.category]?.color || '#666'}20`,
                      color: CATEGORY_META[f.category]?.color || '#999',
                    }}>
                      {CATEGORY_META[f.category]?.icon} {CATEGORY_META[f.category]?.label || f.category}
                    </span>
                  </td>
                  <td className="font-semibold">{formatActivityType(f.activity_type)}</td>
                  <td className="text-muted">{f.unit}</td>
                  <td className="text-emerald font-semibold">{f.kg_co2e_per_unit}</td>
                  <td className="text-muted text-xs activity-source">{f.source}</td>
                  <td>
                    {deleteConfirm === f.id ? (
                      <div className="activity-confirm-delete">
                        <span className="text-xs text-coral">Delete?</span>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(f.id)}
                        >Yes</button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setDeleteConfirm(null)}
                        >No</button>
                      </div>
                    ) : (
                      <div className="activity-actions">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => { setEditingFactor(f); setShowModal(true); }}
                          title="Edit"
                        >✏️</button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setDeleteConfirm(f.id)}
                          title="Delete"
                        >🗑️</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="activities-count text-muted text-xs">
          Showing {filtered.length} of {factors.length} activities
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <FactorModal
          factor={editingFactor}
          onClose={handleModalClose}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
}

/* ─── Factor Add/Edit Modal ────────────────────────────────────────────── */
function FactorModal({
  factor,
  onClose,
  onSave,
}: {
  factor: EmissionFactor | null;
  onClose: () => void;
  onSave: (data: EmissionFactor) => void;
}) {
  const isEdit = !!factor;
  const [category, setCategory] = useState(factor?.category || 'household_energy');
  const [activityType, setActivityType] = useState(factor?.activity_type || '');
  const [unit, setUnit] = useState(factor?.unit || '');
  const [kgCo2e, setKgCo2e] = useState(factor?.kg_co2e_per_unit || 0);
  const [source, setSource] = useState(factor?.source || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityType || !unit || kgCo2e <= 0 || !source) {
      setError('All fields are required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isEdit && factor) {
        const updated = await updateFactor(factor.id, {
          category,
          activity_type: activityType.toLowerCase().replace(/\s+/g, '_'),
          unit,
          kg_co2e_per_unit: kgCo2e,
          source,
        });
        onSave(updated);
      } else {
        const created = await createFactor({
          category,
          activity_type: activityType.toLowerCase().replace(/\s+/g, '_'),
          unit,
          kg_co2e_per_unit: kgCo2e,
          source,
        });
        onSave(created);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="log-modal-overlay" onClick={onClose}>
      <form
        className="log-modal glass-card animate-fade-in-up factor-modal"
        onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit}
        role="dialog"
        aria-label={isEdit ? 'Edit activity' : 'Add activity'}
      >
        <h3 className="log-modal-title">{isEdit ? 'Edit Activity' : 'Add New Activity'}</h3>

        <div className="form-group">
          <label className="form-label" htmlFor="factor-category">Category</label>
          <select
            id="factor-category"
            className="form-input"
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            {CATEGORY_OPTIONS.map(cat => (
              <option key={cat} value={cat}>
                {CATEGORY_META[cat]?.icon} {CATEGORY_META[cat]?.label || cat}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="factor-type">Activity Name</label>
          <input
            id="factor-type"
            className="form-input"
            type="text"
            value={activityType}
            onChange={e => setActivityType(e.target.value)}
            placeholder="e.g., Electric Stove"
            required
          />
          <span className="form-hint">Will be stored as snake_case (e.g., electric_stove)</span>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="factor-unit">Unit</label>
            <input
              id="factor-unit"
              className="form-input"
              type="text"
              value={unit}
              onChange={e => setUnit(e.target.value)}
              placeholder="e.g., kWh, km, kg"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="factor-co2e">kg CO₂e per unit</label>
            <input
              id="factor-co2e"
              className="form-input"
              type="number"
              value={kgCo2e}
              onChange={e => setKgCo2e(Number(e.target.value))}
              step="0.001"
              min="0.001"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="factor-source">Source / Citation</label>
          <input
            id="factor-source"
            className="form-input"
            type="text"
            value={source}
            onChange={e => setSource(e.target.value)}
            placeholder="e.g., CEA India 2024"
            required
          />
        </div>

        {error && <div className="auth-error animate-fade-in" role="alert">⚠️ {error}</div>}

        <div className="log-modal-actions">
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={saving}
            id="save-factor-btn"
          >
            {saving ? 'Saving...' : isEdit ? 'Update Activity' : 'Add Activity →'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
