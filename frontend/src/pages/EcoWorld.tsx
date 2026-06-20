/* ─── EcoWorld — Main app page with 3D scene + overlays ─────────────────── */

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getDashboard, getCategories, getTips, getGoal, logActivity, submitTipFeedback, createGoal } from '../api/client';
import type { CategoryInfo, DashboardData, InsightsData, Goal } from '../api/types';
import { CATEGORY_META, formatActivityType, formatCO2 } from '../api/types';
import EcoScene from '../world/EcoScene';
import TrendCharts from '../components/TrendCharts';
import './EcoWorld.css';

interface EcoWorldProps {
  onNavigateSettings: () => void;
}

export default function EcoWorld({ onNavigateSettings }: EcoWorldProps) {
  const { user, logout } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [logQuantity, setLogQuantity] = useState<number>(0);
  const [selectedFactorId, setSelectedFactorId] = useState<number | null>(null);
  const [logMessage, setLogMessage] = useState<string | null>(null);
  const [goalTarget, setGoalTarget] = useState<number>(200);
  const [scrollY, setScrollY] = useState(0);
  const [webglSupported, setWebglSupported] = useState(true);

  // Check WebGL
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      setWebglSupported(!!gl);
    } catch {
      setWebglSupported(false);
    }
  }, []);

  // Reduced motion check
  const prefersReducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const use3D = webglSupported && !prefersReducedMotion;

  // Fetch data
  const refreshData = useCallback(async () => {
    try {
      const [dashData, catData, tipsData, goalData] = await Promise.all([
        getDashboard(),
        getCategories(),
        getTips(),
        getGoal(),
      ]);
      setDashboard(dashData);
      setCategories(catData);
      setInsights(tipsData);
      setGoal(goalData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshData(); }, [refreshData]);

  // Scroll tracking
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Log an activity
  const handleLog = async () => {
    if (!selectedFactorId || logQuantity <= 0) return;
    try {
      const result = await logActivity(selectedFactorId, logQuantity);
      setLogMessage(`✅ Logged ${formatCO2(result.computed_co2e)} CO₂e`);
      setLogQuantity(0);
      setSelectedFactorId(null);
      setTimeout(() => setLogMessage(null), 3000);
      refreshData();
    } catch (err) {
      setLogMessage(`❌ ${(err as Error).message}`);
    }
  };

  // Tip feedback
  const handleTipFeedback = async (tipId: string, action: 'accept' | 'dismiss') => {
    await submitTipFeedback(tipId, action);
    refreshData();
  };

  // Create goal
  const handleCreateGoal = async () => {
    try {
      const g = await createGoal(goalTarget);
      setGoal(g);
    } catch (err) {
      console.error(err);
    }
  };

  // Scroll-section awareness
  const getActiveSection = () => {
    const vh = window.innerHeight;
    if (scrollY < vh * 0.3) return 'dashboard';
    if (scrollY < vh * 1.3) return 'household';
    if (scrollY < vh * 2.3) return 'transport';
    if (scrollY < vh * 3.3) return 'food';
    return 'goals';
  };

  const currentSection = getActiveSection();

  if (loading) {
    return (
      <div className="eco-loading">
        <div className="eco-loading-spinner" />
        <p>Loading your ecosystem...</p>
      </div>
    );
  }

  return (
    <div className="eco-world">
      {/* 3D background scene */}
      {use3D && dashboard && (
        <div className="canvas-wrapper">
          <Suspense fallback={null}>
            <EcoScene worldState={dashboard.world_state} scrollProgress={scrollY / (window.innerHeight * 4)} />
          </Suspense>
        </div>
      )}

      {/* Non-3D gradient background fallback */}
      {!use3D && (
        <div className="eco-fallback-bg" style={{
          '--score': dashboard?.world_state?.overall_score ?? 0.7,
        } as React.CSSProperties} />
      )}

      {/* Navigation dots */}
      <nav className="eco-nav" aria-label="Section navigation">
        <div className="eco-nav-user">
          <span className="eco-nav-avatar">🌿</span>
          <span className="eco-nav-email">{user?.email}</span>
          <button className="btn btn-ghost btn-sm eco-nav-settings" onClick={onNavigateSettings} id="settings-btn" title="Settings">⚙️</button>
          <button className="btn btn-ghost btn-sm" onClick={logout} id="logout-btn">Logout</button>
        </div>
        <div className="eco-nav-dots">
          {['dashboard', 'household', 'transport', 'food', 'goals'].map(section => (
            <button
              key={section}
              className={`eco-nav-dot ${currentSection === section ? 'active' : ''}`}
              onClick={() => {
                const idx = ['dashboard', 'household', 'transport', 'food', 'goals'].indexOf(section);
                window.scrollTo({ top: idx * window.innerHeight, behavior: 'smooth' });
              }}
              aria-label={`Go to ${section}`}
              id={`nav-${section}`}
            >
              <span className="eco-nav-dot-label">{section.charAt(0).toUpperCase() + section.slice(1)}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Log notification */}
      {logMessage && (
        <div className="eco-toast animate-fade-in-up" role="status">
          {logMessage}
        </div>
      )}

      {/* ═══ SECTION 1: Dashboard (Sky / Forest Canopy) ═══ */}
      <section className="eco-section eco-section--dashboard" id="section-dashboard">
        <div className="eco-section-content">
          <div className="dashboard-hero">
            <h1 className="dashboard-title font-display">
              Your Ecosystem
              <span className={`dashboard-trend badge ${
                dashboard?.trend_direction === 'improving' ? 'badge-success' :
                dashboard?.trend_direction === 'worsening' ? 'badge-danger' : 'badge-info'
              }`}>
                {dashboard?.trend_direction === 'improving' ? '↓ Improving' :
                 dashboard?.trend_direction === 'worsening' ? '↑ Worsening' : '→ Stable'}
              </span>
            </h1>
            <p className="dashboard-subtitle text-secondary">
              {dashboard?.world_state?.overall_score !== undefined && dashboard.world_state.overall_score >= 0.7
                ? '🌿 Your ecosystem is thriving! Keep it up.'
                : dashboard?.world_state?.overall_score !== undefined && dashboard.world_state.overall_score >= 0.4
                ? '🌱 Your ecosystem needs attention. Small changes make a difference.'
                : '🏭 Your ecosystem is struggling. Let\'s work on reducing your footprint.'}
            </p>
          </div>

          <div className="dashboard-grid stagger-children">
            {/* Monthly total */}
            <div className="glass-card dashboard-stat-card">
              <div className="stat-label">This Month</div>
              <div className="stat-value text-emerald">
                {formatCO2(dashboard?.current_month_total ?? 0)}
              </div>
              <div className="stat-sub text-muted">
                CO₂e emitted
              </div>
            </div>

            {/* Baseline comparison */}
            <div className="glass-card dashboard-stat-card">
              <div className="stat-label">Daily Average</div>
              <div className="stat-value text-golden">
                {formatCO2(dashboard?.baseline_daily_avg ?? 0)}
              </div>
              <div className="stat-sub text-muted">
                per day baseline
              </div>
            </div>

            {/* Ecosystem score */}
            <div className="glass-card dashboard-stat-card">
              <div className="stat-label">Ecosystem Health</div>
              <div className="stat-value" style={{
                color: `hsl(${(dashboard?.world_state?.overall_score ?? 0.5) * 120}, 70%, 60%)`
              }}>
                {Math.round((dashboard?.world_state?.overall_score ?? 0.5) * 100)}%
              </div>
              <div className="stat-sub text-muted">
                overall score
              </div>
            </div>

            {/* Previous month */}
            <div className="glass-card dashboard-stat-card">
              <div className="stat-label">Previous Month</div>
              <div className="stat-value text-sky">
                {dashboard?.previous_month_total ? formatCO2(dashboard.previous_month_total) : '—'}
              </div>
              <div className="stat-sub text-muted">
                CO₂e total
              </div>
            </div>
          </div>

          {/* Charts */}
          {dashboard && <TrendCharts dashboard={dashboard} />}

          {/* Category breakdown */}
          <div className="category-breakdown glass-card">
            <h3>Your Carbon Footprint by Category</h3>
            <div className="category-bars stagger-children">
              {dashboard?.category_breakdown?.map(cat => {
                const meta = CATEGORY_META[cat.category] || { label: cat.category, icon: '📊', color: '#666' };
                return (
                  <div key={cat.category} className="category-bar-item">
                    <div className="category-bar-header">
                      <span>{meta.icon} {meta.label}</span>
                      <span className="text-muted">{formatCO2(cat.total_co2e)} ({cat.percentage}%)</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${cat.percentage}%`,
                          background: meta.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 2: Household Activity Capture ═══ */}
      <section className="eco-section eco-section--household" id="section-household">
        <div className="eco-section-content">
          <h2 className="eco-section-title font-display">🏠 Household Energy</h2>
          <p className="text-secondary">Log your daily household energy consumption</p>
          <div className="preset-grid stagger-children">
            {categories
              .filter(c => c.category === 'household_energy' || c.category === 'backup_power')
              .flatMap(c => c.activities)
              .map(factor => (
                <button
                  key={factor.id}
                  className={`preset-card glass-card ${selectedFactorId === factor.id ? 'preset-card--active' : ''}`}
                  onClick={() => {
                    setSelectedFactorId(factor.id);
                    setLogQuantity(factor.default_quantity ?? 1);
                    setActivePanel('log');
                  }}
                  id={`preset-${factor.activity_type}`}
                >
                  <div className="preset-card-icon">
                    {CATEGORY_META[factor.category]?.icon || '⚡'}
                  </div>
                  <div className="preset-card-name">{formatActivityType(factor.activity_type)}</div>
                  <div className="preset-card-factor text-muted text-xs">
                    {factor.kg_co2e_per_unit} kg/{factor.unit}
                  </div>
                </button>
              ))}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 3: Transport ═══ */}
      <section className="eco-section eco-section--transport" id="section-transport">
        <div className="eco-section-content">
          <h2 className="eco-section-title font-display">🚗 Transport</h2>
          <p className="text-secondary">How did you travel today?</p>
          <div className="preset-grid stagger-children">
            {categories
              .filter(c => c.category === 'transport')
              .flatMap(c => c.activities)
              .map(factor => (
                <button
                  key={factor.id}
                  className={`preset-card glass-card ${selectedFactorId === factor.id ? 'preset-card--active' : ''}`}
                  onClick={() => {
                    setSelectedFactorId(factor.id);
                    setLogQuantity(factor.default_quantity ?? 1);
                    setActivePanel('log');
                  }}
                  id={`preset-${factor.activity_type}`}
                >
                  <div className="preset-card-icon">
                    {factor.activity_type.includes('walk') ? '🚶' :
                     factor.activity_type.includes('cycl') ? '🚲' :
                     factor.activity_type.includes('bus') ? '🚌' :
                     factor.activity_type.includes('metro') ? '🚇' :
                     factor.activity_type.includes('auto') ? '🛺' :
                     factor.activity_type.includes('two') ? '🏍️' :
                     factor.activity_type.includes('car') ? '🚗' :
                     factor.activity_type.includes('taxi') ? '🚕' :
                     factor.activity_type.includes('train') ? '🚆' :
                     factor.activity_type.includes('flight') ? '✈️' : '🚗'}
                  </div>
                  <div className="preset-card-name">{formatActivityType(factor.activity_type)}</div>
                  <div className="preset-card-factor text-muted text-xs">
                    {factor.kg_co2e_per_unit} kg/{factor.unit}
                  </div>
                </button>
              ))}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 4: Food, Shopping, Waste ═══ */}
      <section className="eco-section eco-section--food" id="section-food">
        <div className="eco-section-content">
          <h2 className="eco-section-title font-display">🍽️ Food, Shopping & Waste</h2>
          <p className="text-secondary">Track your consumption and waste habits</p>
          <div className="preset-grid stagger-children">
            {categories
              .filter(c => ['food_diet', 'shopping', 'waste', 'occasional'].includes(c.category))
              .flatMap(c => c.activities)
              .map(factor => (
                <button
                  key={factor.id}
                  className={`preset-card glass-card ${selectedFactorId === factor.id ? 'preset-card--active' : ''}`}
                  onClick={() => {
                    setSelectedFactorId(factor.id);
                    setLogQuantity(factor.default_quantity ?? 1);
                    setActivePanel('log');
                  }}
                  id={`preset-${factor.activity_type}`}
                >
                  <div className="preset-card-icon">
                    {CATEGORY_META[factor.category]?.icon || '📦'}
                  </div>
                  <div className="preset-card-name">{formatActivityType(factor.activity_type)}</div>
                  <div className="preset-card-factor text-muted text-xs">
                    {factor.kg_co2e_per_unit} kg/{factor.unit}
                  </div>
                </button>
              ))}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 5: Goals & Insights (River) ═══ */}
      <section className="eco-section eco-section--goals" id="section-goals">
        <div className="eco-section-content">
          <div className="goals-insights-grid">
            {/* Goal panel */}
            <div className="glass-card goal-panel">
              <h2 className="eco-section-title font-display">🌊 Goals & Streaks</h2>
              {goal ? (
                <div className="goal-details stagger-children">
                  <div className="goal-progress-ring">
                    <svg viewBox="0 0 120 120" className="goal-ring-svg">
                      <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(52,211,153,0.1)" strokeWidth="8" />
                      <circle
                        cx="60" cy="60" r="52"
                        fill="none"
                        stroke="url(#goalGradient)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${Math.min((goal.progress_pct || 0) / 100, 1) * 327} 327`}
                        transform="rotate(-90 60 60)"
                      />
                      <defs>
                        <linearGradient id="goalGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#34d399" />
                          <stop offset="100%" stopColor="#0ea5e9" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="goal-ring-text">
                      <span className="goal-ring-pct">{Math.round(goal.progress_pct || 0)}%</span>
                      <span className="goal-ring-label">used</span>
                    </div>
                  </div>
                  <div className="goal-stats">
                    <div className="goal-stat">
                      <span className="goal-stat-label">Target</span>
                      <span className="goal-stat-value">{formatCO2(goal.target_kg_per_month)}/mo</span>
                    </div>
                    <div className="goal-stat">
                      <span className="goal-stat-label">Daily Budget</span>
                      <span className="goal-stat-value text-golden">{formatCO2(goal.daily_budget || 0)}</span>
                    </div>
                    <div className="goal-stat">
                      <span className="goal-stat-label">🔥 Streak</span>
                      <span className="goal-stat-value text-emerald">{goal.streak_count} days</span>
                    </div>
                    <div className="goal-stat">
                      <span className="goal-stat-label">Baseline</span>
                      <span className="goal-stat-value">{goal.baseline_kg ? formatCO2(goal.baseline_kg) + '/mo' : '—'}</span>
                    </div>
                  </div>
                  {/* Grove visualization */}
                  <div className="goal-grove">
                    <div className="goal-grove-label text-muted text-xs">Your grove ({goal.streak_count} trees)</div>
                    <div className="goal-grove-trees">
                      {Array.from({ length: Math.min(goal.streak_count, 20) }).map((_, i) => (
                        <span key={i} className="goal-tree" style={{ animationDelay: `${i * 0.1}s` }}>🌳</span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="goal-create">
                  <p className="text-secondary">Set a monthly carbon budget to track your progress.</p>
                  <div className="goal-create-form">
                    <label className="form-label" htmlFor="goal-target">Monthly Target (kg CO₂e)</label>
                    <input
                      id="goal-target"
                      type="range"
                      min={50}
                      max={500}
                      step={10}
                      value={goalTarget}
                      onChange={e => setGoalTarget(Number(e.target.value))}
                      className="goal-slider"
                    />
                    <span className="goal-slider-value">{goalTarget} kg/month</span>
                    <button className="btn btn-primary" onClick={handleCreateGoal} id="create-goal-btn">
                      Set Goal →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Insights panel */}
            <div className="glass-card insight-panel">
              <h2 className="eco-section-title font-display">✨ Personalized Insights</h2>
              {insights?.anomalies && insights.anomalies.length > 0 && (
                <div className="insight-anomalies">
                  {insights.anomalies.map((a, i) => (
                    <div key={i} className="insight-anomaly badge-warning">
                      ⚠️ {a}
                    </div>
                  ))}
                </div>
              )}
              <div className="insight-tips stagger-children">
                {insights?.tips?.slice(0, 5).map((tip) => (
                  <div key={tip.id} className="insight-tip glass-card">
                    <div className="tip-header">
                      <span className="tip-category badge badge-info">
                        {CATEGORY_META[tip.category]?.icon} {CATEGORY_META[tip.category]?.label || tip.category}
                      </span>
                      <span className="tip-saving text-emerald font-semibold">
                        −{formatCO2(tip.potential_saving_kg)}/mo
                      </span>
                    </div>
                    <h4 className="tip-title">{tip.title}</h4>
                    <p className="tip-desc text-muted text-sm">{tip.description}</p>
                    <div className="tip-actions">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleTipFeedback(tip.id, 'accept')}
                        id={`tip-accept-${tip.id}`}
                      >
                        ✓ I'll try this
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleTipFeedback(tip.id, 'dismiss')}
                        id={`tip-dismiss-${tip.id}`}
                      >
                        Not now
                      </button>
                    </div>
                  </div>
                ))}
                {(!insights?.tips || insights.tips.length === 0) && (
                  <p className="text-muted">Log more activities to get personalized insights.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Activity Log Modal ═══ */}
      {activePanel === 'log' && selectedFactorId && (
        <div className="log-modal-overlay" onClick={() => setActivePanel(null)}>
          <div className="log-modal glass-card animate-fade-in-up" onClick={e => e.stopPropagation()} role="dialog" aria-label="Log activity">
            <h3 className="log-modal-title">Log Activity</h3>
            {(() => {
              const factor = categories.flatMap(c => c.activities).find(a => a.id === selectedFactorId);
              if (!factor) return null;
              return (
                <>
                  <div className="log-modal-factor">
                    <span className="text-lg">{CATEGORY_META[factor.category]?.icon}</span>
                    <span className="font-semibold">{formatActivityType(factor.activity_type)}</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="log-quantity">
                      Quantity ({factor.unit})
                    </label>
                    <input
                      id="log-quantity"
                      type="number"
                      className="form-input"
                      value={logQuantity}
                      onChange={e => setLogQuantity(Number(e.target.value))}
                      min={0.1}
                      step={0.1}
                      autoFocus
                    />
                  </div>
                  <div className="log-modal-preview">
                    <span className="text-muted">Estimated CO₂e:</span>
                    <span className="text-emerald font-semibold text-lg">
                      {formatCO2(logQuantity * factor.kg_co2e_per_unit)}
                    </span>
                  </div>
                  <div className="log-modal-actions">
                    <button className="btn btn-primary btn-lg" onClick={handleLog} id="confirm-log-btn">
                      Log Activity →
                    </button>
                    <button className="btn btn-ghost" onClick={() => setActivePanel(null)}>
                      Cancel
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Firefly companion */}
      {insights && insights.tips.length > 0 && (
        <div className="firefly-companion animate-float" title="I have insights for you!">
          <span className="firefly-glow">✨</span>
        </div>
      )}
    </div>
  );
}
