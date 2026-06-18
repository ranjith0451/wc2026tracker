export const VENUES = {
  "Estadio Azteca, Mexico City": {
    city: "Mexico City", country: "Mexico", capacity: 87523,
    lat: 19.3033, lon: -99.1506,
    surface: "Natural Grass", opened: 1966,
  },
  "Estadio Akron, Zapopan": {
    city: "Guadalajara", country: "Mexico", capacity: 49850,
    lat: 20.6893, lon: -103.4674,
    surface: "Natural Grass", opened: 2010,
  },
  "Estadio BBVA, Monterrey": {
    city: "Monterrey", country: "Mexico", capacity: 53464,
    lat: 25.6694, lon: -100.2462,
    surface: "Natural Grass", opened: 2015,
  },
  "BMO Field, Toronto": {
    city: "Toronto", country: "Canada", capacity: 45736,
    lat: 43.6332, lon: -79.4187,
    surface: "Natural Grass", opened: 2007,
  },
  "BC Place, Vancouver": {
    city: "Vancouver", country: "Canada", capacity: 54500,
    lat: 49.2767, lon: -123.1118,
    surface: "FieldTurf", opened: 1983,
  },
  "SoFi Stadium, Inglewood": {
    city: "Los Angeles", country: "USA", capacity: 70240,
    lat: 33.9535, lon: -118.3392,
    surface: "FieldTurf", opened: 2020,
  },
  "Levi's Stadium, Santa Clara": {
    city: "San Francisco Bay Area", country: "USA", capacity: 68500,
    lat: 37.4033, lon: -121.9694,
    surface: "Natural Grass", opened: 2014,
  },
  "MetLife Stadium, NJ": {
    city: "East Rutherford, NJ", country: "USA", capacity: 82500,
    lat: 40.8136, lon: -74.0745,
    surface: "FieldTurf", opened: 2010,
  },
  "MetLife Stadium, New York/NJ": {
    city: "East Rutherford, NJ", country: "USA", capacity: 82500,
    lat: 40.8136, lon: -74.0745,
    surface: "FieldTurf", opened: 2010,
  },
  "Gillette Stadium, Foxborough": {
    city: "Boston", country: "USA", capacity: 65878,
    lat: 42.0909, lon: -71.2643,
    surface: "FieldTurf", opened: 2002,
  },
  "NRG Stadium, Houston": {
    city: "Houston", country: "USA", capacity: 72220,
    lat: 29.6847, lon: -95.4107,
    surface: "Natural Grass", opened: 2002,
  },
  "AT&T Stadium, Arlington": {
    city: "Dallas", country: "USA", capacity: 80000,
    lat: 32.7480, lon: -97.0930,
    surface: "FieldTurf", opened: 2009,
  },
  "AT&T Stadium, Dallas": {
    city: "Dallas", country: "USA", capacity: 80000,
    lat: 32.7480, lon: -97.0930,
    surface: "FieldTurf", opened: 2009,
  },
  "Lincoln Financial Field, Philly": {
    city: "Philadelphia", country: "USA", capacity: 69796,
    lat: 39.9008, lon: -75.1675,
    surface: "Natural Grass", opened: 2003,
  },
  "Mercedes-Benz Stadium, Atlanta": {
    city: "Atlanta", country: "USA", capacity: 71000,
    lat: 33.7554, lon: -84.4010,
    surface: "FieldTurf", opened: 2017,
  },
  "Lumen Field, Seattle": {
    city: "Seattle", country: "USA", capacity: 69000,
    lat: 47.5952, lon: -122.3316,
    surface: "FieldTurf", opened: 2002,
  },
  "Hard Rock Stadium, Miami": {
    city: "Miami", country: "USA", capacity: 65326,
    lat: 25.9580, lon: -80.2389,
    surface: "Natural Grass", opened: 1987,
  },
  "Arrowhead Stadium, Kansas City": {
    city: "Kansas City", country: "USA", capacity: 76416,
    lat: 39.0489, lon: -94.4839,
    surface: "Natural Grass", opened: 1972,
  },
};

export function getVenue(venueStr) {
  return VENUES[venueStr] || null;
}
