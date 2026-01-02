export default function Sparkline({ points = [], height = 32 }) {
  if (!points.length) return null;
  const width = 120;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const coords = points
    .map((p, i) => {
      const x = Math.round((i / Math.max(points.length - 1, 1)) * width);
      const y = Math.round(height - ((p - min) / range) * height);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline fill="none" stroke="var(--accent)" strokeWidth="2" points={coords} />
    </svg>
  );
}
