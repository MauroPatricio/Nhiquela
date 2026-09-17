import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const JWT_SECRET = 'Pgbkw0DQCkiJC3+tSmTaIA==';
const BASE_URL = 'http://localhost:5000/api/request-service';

// Mock user for the token
const mockUser = {
  id: '6a5e4a995d60838b20e798ba', // some mock id
  name: 'Stress Test User',
  email: 'stress@test.com',
  phoneNumber: '840000000',
  isAdmin: false,
  isSeller: false,
  isDeliveryMan: false
};

const token = jwt.sign(
  {
    _id: mockUser.id,
    name: mockUser.name,
    email: mockUser.email,
    phoneNumber: mockUser.phoneNumber,
    isAdmin: mockUser.isAdmin,
    isSeller: mockUser.isSeller,
    isDeliveryMan: mockUser.isDeliveryMan
  },
  JWT_SECRET,
  { expiresIn: '1d' }
);

async function runStressTest(concurrentRequests) {
  console.log(`Starting stress test with ${concurrentRequests} concurrent requests...`);
  
  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;

  const requestPayload = {
    name: 'Stress Test Order',
    phoneNumber: '840000000',
    goodType: 'Documento',
    transportType: 'Motociclo', 
    deliverCity: 'Maputo',
    reason: 'Stress Test',
    origin: 'Av. Julius Nyerere, Maputo',
    destination: 'Av. 24 de Julho, Maputo',
    originDetails: { lat: -25.968691, lng: 32.593003 },
    destinationDetails: { lat: -25.972352, lng: 32.580138 },
    paymentOption: 'CASH',
    description: 'Test',
    paymentMethod: 'Dinheiro',
    deliveryPrice: 100,
    serviceId: '6a537d74c55cef36ed551114' // Mock valid service ID length
  };

  const requests = Array.from({ length: concurrentRequests }).map((_, i) => {
    return fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestPayload)
    }).then(res => {
      if (res.ok) successCount++;
      else failCount++;
      return res.json();
    }).catch(err => {
      failCount++;
    });
  });

  await Promise.all(requests);
  
  const endTime = Date.now();
  console.log(`Stress Test Completed in ${endTime - startTime}ms.`);
  console.log(`Successful Requests: ${successCount}`);
  console.log(`Failed Requests: ${failCount}`);
  console.log(`Average Latency: ${(endTime - startTime) / concurrentRequests}ms per request (simultaneous)`);
}

runStressTest(100);
