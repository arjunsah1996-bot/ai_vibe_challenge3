/* ─── WorldStateMapper — pure function: metrics → 3D scene params ──────── */
/* This mirrors backend/app/engine/calculator.py's compute_world_state. */
/* No Three.js imports — just numbers in, numbers out. Unit-testable.     */

import type { DashboardData, WorldState } from '../api/types';

/**
 * Map user dashboard metrics to scene parameters.
 *
 * This is the client-side implementation of worldState = f(userMetrics).
 * The backend also computes this — this is used for instant client-side
 * interpolation while waiting for API responses.
 */
export function mapMetricsToWorldState(data: DashboardData | null): WorldState {
  if (!data) {
    return {
      haze_density: 0.3,
      foliage_density: 0.7,
      light_warmth: 0.8,
      river_clarity: 0.7,
      grove_size: 0,
      wildlife_count: 10,
      overall_score: 0.7,
    };
  }

  return data.world_state;
}

/**
 * Interpolate between two world states for smooth transitions.
 */
export function lerpWorldState(
  from: WorldState,
  to: WorldState,
  t: number,
): WorldState {
  const lerp = (a: number, b: number) => a + (b - a) * t;
  return {
    haze_density: lerp(from.haze_density, to.haze_density),
    foliage_density: lerp(from.foliage_density, to.foliage_density),
    light_warmth: lerp(from.light_warmth, to.light_warmth),
    river_clarity: lerp(from.river_clarity, to.river_clarity),
    grove_size: Math.round(lerp(from.grove_size, to.grove_size)),
    wildlife_count: Math.round(lerp(from.wildlife_count, to.wildlife_count)),
    overall_score: lerp(from.overall_score, to.overall_score),
  };
}

/**
 * Convert world state to CSS-usable values for the 2D fallback.
 */
export function worldStateToCSS(ws: WorldState): Record<string, string> {
  const hue = 120 + ws.overall_score * 20; // Green range
  const saturation = 30 + ws.overall_score * 40;
  const lightness = 10 + ws.overall_score * 15;

  return {
    '--scene-bg': `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    '--scene-haze': `rgba(200, 200, 200, ${ws.haze_density * 0.5})`,
    '--scene-glow': `rgba(52, 211, 153, ${ws.overall_score * 0.3})`,
    '--scene-warmth': `${ws.light_warmth}`,
    '--river-clarity': `${ws.river_clarity}`,
  };
}
