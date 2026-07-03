import { Geodesic } from 'geographiclib';

const geodesic = Geodesic.WGS84;

export function getRouteDistance(route) {
  let total = 0;
  for (let i = 1; i < route.length; i += 1) {
    const { s12 } = geodesic.Inverse(
      route[i - 1].lat,
      route[i - 1].lng,
      route[i].lat,
      route[i].lng
    );
    total += s12;
  }
  return total;
}

export function makeDistanceReadable(distance, distanceUnit) {
  switch (distanceUnit) {
    case 'km':
      return `${Math.round(distance / 1000)} km`;
    case 'mi':
      return `${Math.round(distance / 1609.344)} mi`;
    case 'nm':
      return `${Math.round(distance / 1852)} nm`;
    default:
      return null;
  }
}
