export const formatDate = (date) => new Date(date).toLocaleString();

export const formatNumber = (num) => {
  if (!Number.isFinite(num)) return "-";
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}b`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}m`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return num.toFixed(1);
};
