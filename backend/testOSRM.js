const axios = require('axios');

async function testOSRM() {
  try {
    const originLoc = { lat: -25.9692, lng: 32.5732 };
    const destLoc = { lat: -25.96, lng: 32.58 };
    const url = `http://router.project-osrm.org/route/v1/driving/${originLoc.lng},${originLoc.lat};${destLoc.lng},${destLoc.lat}?overview=simplified&geometries=geojson`;
    console.log('Fetching', url);
    const response = await axios.get(url);
    console.log(response.data);
  } catch (error) {
    console.error('Erro:', error.message);
  }
}

testOSRM();
