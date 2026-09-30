export const markerDefaults = {
  labelSize: 12,
  labelOpacity: 100,
  labelForeground: '#e7f2f6',
  labelBackground: '#07131d',
  pointSize: 9
};

export function readMarkerStyle(query) {
  const number = (key, min, max) => {
    const value = query[key] === undefined || query[key] === '' ? NaN : Number(query[key]);
    return Number.isFinite(value)
      ? Math.min(max, Math.max(min, Math.round(value)))
      : markerDefaults[key];
  };
  const color = key =>
    /^#[0-9a-f]{6}$/i.test(query[key] || '') ? query[key] : markerDefaults[key];
  return {
    labelSize: number('labelSize', 8, 32),
    labelOpacity: number('labelOpacity', 0, 100),
    labelForeground: color('labelForeground'),
    labelBackground: color('labelBackground'),
    pointSize: number('pointSize', 2, 24)
  };
}
