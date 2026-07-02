const fs = require('fs');
let content = fs.readFileSync('src/screens/MapScreen.tsx', 'utf8');

const oldUseEffect = `    const startAutoUpdate = async () => {
      try {
        const storedTripString = await AsyncStorage.getItem("acceptedTrip");
        if (!storedTripString) return;
  
        const storedTrip = JSON.parse(storedTripString);
        const orderId = storedTrip.id;

        // Conectar ao Socket do Backend para Rastreamento em Tempo Real
        const isDev = process.env.NODE_ENV !== 'production';
        const backendUrl = process.env.EXPO_PUBLIC_API_URL?.replace('/api', '') || (isDev ? 'http://localhost:5000' : 'https://api.nhiquelaservicos.com');
        socket = io(backendUrl);
  
        await updateDeliverymanLocation(orderId);
  
        // Atualiza a localização a cada 5 segundos via socket
        interval = setInterval(async () => {
          try {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const locationData = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              heading: loc.coords.heading
            };
            
            // Emite a localização em tempo real para o cliente
            socket.emit('updateDriverLocation', {
              orderId,
              location: locationData
            });

            // Fallback: Atualiza na API também, mas num intervalo maior se necessário
            await updateDeliverymanLocation(orderId);
          } catch (err) {
            console.log("Erro ao capturar GPS para socket", err);
          }
        }, 5000);
  
      } catch (error) {
        console.error("Erro ao iniciar atualização automática da localização:", error);
      }
    };
  
    startAutoUpdate();
  
    return () => {
      if (interval) clearInterval(interval);
      if (socket) socket.disconnect();
    };`;

const newUseEffect = `    let locationSubscription: Location.LocationSubscription | null = null;
    
    const startAutoUpdate = async () => {
      try {
        const storedTripString = await AsyncStorage.getItem("acceptedTrip");
        if (!storedTripString) return;
  
        const storedTrip = JSON.parse(storedTripString);
        const orderId = storedTrip.id;

        const isDev = process.env.NODE_ENV !== 'production';
        const backendUrl = process.env.EXPO_PUBLIC_API_URL?.replace('/api', '') || (isDev ? 'http://localhost:5000' : 'https://api.nhiquelaservicos.com');
        socket = io(backendUrl);
  
        // Iniciar envio seguro e contínuo sem setInterval overlapping
        locationSubscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
          (loc) => {
            const locationData = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              heading: loc.coords.heading
            };
            
            if (socket) {
              socket.emit('updateDriverLocation', { orderId, location: locationData });
            }
            
            // Opcional: Atualizar na API (não bloquear se falhar)
            updateDeliverymanLocation(orderId).catch(() => {});
          }
        );
      } catch (error) {
        console.error("Erro ao iniciar watchPosition:", error);
      }
    };
  
    startAutoUpdate();
  
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
      if (socket) {
        socket.disconnect();
      }
    };`;

if (content.includes('setInterval(')) {
  content = content.replace(oldUseEffect, newUseEffect);
  fs.writeFileSync('src/screens/MapScreen.tsx', content);
  console.log('MapScreen patched');
} else {
  console.log('MapScreen not patched. Content not found.');
}
