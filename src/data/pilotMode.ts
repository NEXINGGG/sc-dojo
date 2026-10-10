// Vite folds DEV to false in every production build, including builds with the flag set.
export const isScA2Pilot = import.meta.env.DEV && import.meta.env.VITE_SC_A2_PILOT === '1';

export const isScBFoundationPilot = import.meta.env.DEV && import.meta.env.VITE_SC_B_PILOT === 'foundation';
export const isScBPilot = import.meta.env.DEV &&
  (import.meta.env.VITE_SC_B_PILOT === '1' || isScBFoundationPilot);
