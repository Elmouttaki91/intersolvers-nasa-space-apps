export const fmtTime = (s) => {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
};
export const fmt = (v, d = 1) => (v == null || Number.isNaN(v) ? '–' : Number(v).toFixed(d));
export const signed = (v, d = 1) => (v > 0 ? '+' : '') + Number(v).toFixed(d);
