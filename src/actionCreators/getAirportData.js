import Papa from 'papaparse';
import assetUrl from '../utils/assetUrl';

// This function is only called once, when the website first loads
// Fetch the data for all ~9,400 airports, and put it into the redux store
export default function getAirportData() {
  return (dispatch, getState) => {
    const { airportData } = getState();

    if (airportData.length === 0) {
      Papa.parse(assetUrl('airports.csv'), {
        download: true,
        header: true,
        dynamicTyping: true,
        complete: results => {
          dispatch({
            type: 'RECEIVE_AIRPORT_DATA',
            data: results.data.filter(a => Number.isFinite(a.lat) && Number.isFinite(a.lng))
          });
        }
      });
    }
  };
}
