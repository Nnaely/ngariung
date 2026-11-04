export type FlameTier = {
  min: number;
  name: string;
  color: string;
  glow: string;
};

/** Tingkatan api berdasarkan streak harian. */
export const FLAME_TIERS: FlameTier[] = [
  { min: 0, name: "Api Kecil", color: "#8A8A93", glow: "rgba(138,138,147,0.30)" },
  { min: 10, name: "Api Menyala", color: "#FFB43D", glow: "rgba(255,180,61,0.50)" },
  { min: 30, name: "Api Panas", color: "#FF6B3D", glow: "rgba(255,107,61,0.55)" },
  { min: 50, name: "Api Biru", color: "#5AC8FA", glow: "rgba(90,200,250,0.55)" },
  { min: 70, name: "Api Ungu", color: "#A78BFA", glow: "rgba(167,139,250,0.55)" },
  { min: 100, name: "Api Putih", color: "#F5F5F7", glow: "rgba(245,245,247,0.65)" },
  { min: 200, name: "Api Emas", color: "#FFD166", glow: "rgba(255,209,102,0.7)" },
  { min: 300, name: "Api Zamrud", color: "#34D399", glow: "rgba(52,211,153,0.7)" },
  { min: 500, name: "Api Dewa", color: "#FF2D55", glow: "rgba(255,45,85,0.8)" },
];

export function flameTier(streak: number): FlameTier {
  let current = FLAME_TIERS[0];
  for (const tier of FLAME_TIERS) {
    if (streak >= tier.min) current = tier;
  }
  return current;
}

export function nextFlameTier(streak: number): FlameTier | null {
  return FLAME_TIERS.find((t) => t.min > streak) ?? null;
}
