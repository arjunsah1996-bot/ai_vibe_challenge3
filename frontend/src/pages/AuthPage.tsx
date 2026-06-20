/* ─── Auth Page — Login / Register with immersive nature theme ────────── */

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './AuthPage.css';

export default function AuthPage() {
  const { login, register, error, clearError } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [region, setRegion] = useState('india');
  const [householdSize, setHouseholdSize] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, region, householdSize);
      }
    } catch {
      // Error is set in AuthContext
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMode = () => {
    setMode(m => (m === 'login' ? 'register' : 'login'));
    clearError();
  };

  return (
    <div className="auth-page">
      {/* Animated background */}
      <div className="auth-bg">
        <div className="auth-bg-orb auth-bg-orb--1" />
        <div className="auth-bg-orb auth-bg-orb--2" />
        <div className="auth-bg-orb auth-bg-orb--3" />
        <div className="auth-bg-particles">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="auth-particle" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }} />
          ))}
        </div>
      </div>

      <div className="auth-container animate-fade-in">
        {/* Logo & branding */}
        <div className="auth-header">
          <div className="auth-logo">
            <span className="auth-logo-icon">🌍</span>
            <h1 className="auth-logo-text">EcoSphere</h1>
          </div>
          <p className="auth-tagline">
            Understand · Track · Reduce your carbon footprint
          </p>
        </div>

        {/* Form card */}
        <form className="auth-card glass-card" onSubmit={handleSubmit}>
          <h2 className="auth-card-title">
            {mode === 'login' ? 'Welcome Back' : 'Join EcoSphere'}
          </h2>
          <p className="auth-card-subtitle">
            {mode === 'login'
              ? 'Sign in to continue your journey'
              : 'Start tracking your environmental impact'}
          </p>

          {error && (
            <div className="auth-error animate-fade-in" role="alert">
              <span>⚠️</span> {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              className="form-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              className="form-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'register' ? 'At least 8 characters' : '••••••••'}
              required
              minLength={mode === 'register' ? 8 : 1}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            />
          </div>

          {mode === 'register' && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="auth-region">Region</label>
                <select
                  id="auth-region"
                  className="form-input"
                  value={region}
                  onChange={e => setRegion(e.target.value)}
                >
                  <option value="india">India</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="auth-household">Household Size</label>
                <input
                  id="auth-household"
                  className="form-input"
                  type="number"
                  min={1}
                  max={20}
                  value={householdSize}
                  onChange={e => setHouseholdSize(Number(e.target.value))}
                />
              </div>
            </>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg auth-submit"
            disabled={submitting}
            id="auth-submit-btn"
          >
            {submitting ? (
              <span className="auth-spinner" />
            ) : mode === 'login' ? (
              'Sign In →'
            ) : (
              'Create Account →'
            )}
          </button>

          <div className="auth-toggle">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            <button type="button" className="btn btn-ghost btn-sm" onClick={toggleMode}>
              {mode === 'login' ? 'Sign Up' : 'Sign In'}
            </button>
          </div>

          {mode === 'login' && (
            <div className="auth-demo-hint">
              <span className="text-muted text-xs">Demo: demo@ecosphere.app / demo1234</span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
