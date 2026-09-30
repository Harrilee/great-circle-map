import { sampleRoute } from './Globe';
import { getRouteDistance } from '../../utils/distance';
import getRoutes from '../../selectors/getRoutes';
const airportData = [
  { id: 1, iata: 'SFO', icao: 'KSFO', lat: 37.62, lng: -122.38 },
  { id: 2, iata: 'HND', icao: 'RJTT', lat: 35.55, lng: 139.78 },
  { id: 3, iata: 'SIN', icao: 'WSSS', lat: 1.36, lng: 103.99 }
];
const parse = routes => getRoutes({ airportData, router: { query: { routes } } });
it('preserves IATA, ICAO, slash expansion and multiple routes', () => {
  expect(parse('SFO-HND/SIN;RJTT-KSFO').routes.map(r => r.map(a => a.iata))).toEqual([
    ['SFO', 'HND'],
    ['SFO', 'SIN'],
    ['HND', 'SFO']
  ]);
  expect(parse('SFO-INVALID').error).toBeTruthy();
});
it('draws a short Pacific geodesic rather than a line across Greenwich', () => {
  const points = sampleRoute(airportData.slice(0, 2));
  expect(points.length).toBeGreaterThan(100);
  expect(points.every(p => Math.abs(p[0]) > 100 && p.every(Number.isFinite))).toBe(true);
  expect(points[0][0]).toBeCloseTo(-122.38, 5);
  expect(points[points.length - 1][0]).toBeCloseTo(139.78, 5);
  const distance = getRouteDistance(airportData.slice(0, 2));
  expect(distance).toBeGreaterThan(8200000);
  expect(distance).toBeLessThan(8400000);
});
it('handles near-antipodal and identical endpoints without NaNs', () => {
  for (const route of [
    [{ lat: 0, lng: 0 }, { lat: 0, lng: 180 }],
    [airportData[0], airportData[0]]
  ]) {
    expect(sampleRoute(route).every(p => p.every(Number.isFinite))).toBe(true);
  }
});
