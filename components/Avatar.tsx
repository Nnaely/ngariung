export function Avatar({
  emoji,
  color,
  src,
  size = 40,
  className = "",
}: {
  emoji: string;
  color: string;
  src?: string;
  size?: number;
  className?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className={`shrink-0 rounded-full border object-cover ${className}`}
        style={{
          width: size,
          height: size,
          borderColor: `${color}55`,
          background: `${color}22`,
        }}
      />
    );
  }

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
