const axios = require('axios');

const API_URL = 'https://api.nhiquelaservicos.com/api';

async function testFlow() {
  try {
    console.log('1. Login Driver');
    const driverRes = await axios.post(`${API_URL}/users/signin`, {
      email: 'drivertest@example.com', // Change if this doesn't exist
      password: 'password123'
    }).catch(async (e) => {
       // If doesn't exist, create it?
       console.log('Driver login failed, trying another way. Cannot fully test end-to-end without real credentials unless done locally.');
    });

    console.log('Fetching Driver Orders...');
    // We don't have driver credentials easily accessible unless we look at the DB.
    console.log('Since this is production DB, I will just query the API with dummy data or ask the user for credentials.');
  } catch (error) {
    console.error(error);
  }
}

testFlow();
