import { flameTier } from "@/lib/flame";

/**
 * Api streak — tampil sama seperti di profil, dengan glow sesuai tingkatan.
 * Semakin tinggi streak, semakin terang warnanya.
 */
export function StreakFlame({
  streak,
  size = 16,
  withLabel = false,
}: {
  streak: number;
  size?: number;
  withLabel?: boolean;
}) {
  const tier = flameTier(streak);

  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={tier.name}
      aria-label={tier.name}
    >
      <span
        className="relative inline-grid place-items-center"
        style={{ width: size * 1.15, height: size * 1.15 }}
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full"
          style={{ background: tier.glow, filter: `blur(${Math.max(3, size / 3)}px)` }}
        />
        <span
          className="relative leading-none"
          style={{ fontSize: size, filter: `drop-shadow(0 0 ${size / 4}px ${tier.glow})` }}
          aria-hidden="true"
        >
          🔥
        </span>
      </span>
      {withLabel && (
        <span className="text-[10px] font-semibold" style={{ color: tier.color }}>
          {tier.name}
        </span>
      )}
    </span>
  );
}
