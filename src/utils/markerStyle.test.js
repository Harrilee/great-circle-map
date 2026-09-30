import { markerDefaults, readMarkerStyle } from './markerStyle';
it('keeps old share links on the default style', () => {
  expect(readMarkerStyle({})).toEqual(markerDefaults);
});
it('accepts custom styles and preserves fully transparent labels', () => {
  expect(
    readMarkerStyle({
      labelSize: '20',
      labelOpacity: '0',
      labelForeground: '#FF1234',
      labelBackground: '#123456',
      pointSize: '16'
    })
  ).toEqual({
    labelSize: 20,
    labelOpacity: 0,
    labelForeground: '#FF1234',
    labelBackground: '#123456',
    pointSize: 16
  });
});
it('bounds URL numbers and rejects invalid CSS color values', () => {
  const result = readMarkerStyle({
    labelSize: '999',
    labelOpacity: '-20',
    pointSize: 'NaN',
    labelForeground: 'url(bad)',
    labelBackground: 'red'
  });
  expect(result).toEqual({ ...markerDefaults, labelSize: 32, labelOpacity: 0 });
});
