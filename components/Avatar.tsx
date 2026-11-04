export function Avatar({
  emoji,
  color,
  size = 40,
  className = "",
}: {
  emoji: string;
  color: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-full border ${className}`}
      style={{
        width: size,
        height: size,
        background: `${color}22`,
        borderColor: `${color}55`,
        fontSize: Math.round(size * 0.56),
        lineHeight: 1,
      }}
      aria-hidden="true"
    >
      {emoji}
    </span>
  );
}
