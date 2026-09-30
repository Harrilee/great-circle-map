import { searchAirports } from './AirportPicker';
const airports = [
  { id: 1, iata: 'BFI', icao: 'KBFI', city: 'Seattle', name: 'Boeing Field' },
  { id: 2, iata: 'SEA', icao: 'KSEA', city: 'Seattle', name: 'Seattle Tacoma International' },
  { id: 3, iata: 'SFO', icao: 'KSFO', city: 'San Francisco', name: 'San Francisco International' }
];
it('prioritizes exact airport codes over city matches', () => {
  expect(searchAirports(airports, 'sea')[0].iata).toBe('SEA');
  expect(searchAirports(airports, 'ksfo')[0].iata).toBe('SFO');
});
it('finds airports by city or airport name without requiring codes', () => {
  expect(searchAirports(airports, 'seattle').map(a => a.iata)).toEqual(['BFI', 'SEA']);
  expect(searchAirports(airports, 'boeing')[0].iata).toBe('BFI');
  expect(searchAirports(airports, '[')).toEqual([]);
});
