const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'screens', 'RequestDeliv.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const functionCode = `
  const sendRequestToDriver = async (driver) => {
    try {
      setSelectedDriverForRequest(driver);
      setWaitingForDriver(true);
      
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const storedUserData = await AsyncStorage.getItem('userData');
      let token = '';
      let phoneNumber = '';
      if (storedUserData) {
        const parsed = JSON.parse(storedUserData);
        token = parsed.token;
        phoneNumber = parsed.phoneNumber;
      }

      let finalPrice = price;
      if (driver.allowCustomPrice && driver.customPrice) {
        finalPrice = driver.customPrice * (driver.distance || 1);
      } else if (service?.basePrice) {
        finalPrice = (service.basePrice || price) * (driver.distance || 1);
      }

      const payload = {
        name: service.name,
        phoneNumber: phoneNumber || '000000000',
        goodType: reason,
        transportType: driver.deliveryman?.transport_type || 'N/A',
        deliverCity: originText || 'N/A',
        origin: originText,
        destination: destText,
        paymentOption: 'Dinheiro',
        description: reason,
        paymentMethod: 'Dinheiro',
        deliveryPrice: finalPrice,
        isPaid: false,
        stepStatus: 3,
        latitude: originCoord?.lat,
        longitude: originCoord?.lng,
        targetDriverId: driver._id
      };

      await api.post('/request-deliver', payload, {
        headers: { authorization: \`Bearer \${token}\` }
      });
      
    } catch (postError) {
      console.log('Erro ao criar pedido:', postError);
      Alert.alert("Erro", "Falha ao criar o pedido.");
      setWaitingForDriver(false);
    }
  };
`;

const useE = `    return () => {
      clearTimeout(searchTimerRef.current);
      clearInterval(searchCounterRef.current);
      clearInterval(pollInterval);
    };
  }, [isSearching, radius]);`;

if (!content.includes('sendRequestToDriver')) {
    if (content.includes(useE)) {
        content = content.replace(useE, useE + '\\n' + functionCode);
        console.log('Inserted sendRequestToDriver using CRLF style');
    } else if (content.includes(useE.replace(/\\r\\n/g, '\\n'))) {
        content = content.replace(useE.replace(/\\r\\n/g, '\\n'), useE.replace(/\\r\\n/g, '\\n') + '\\n' + functionCode);
        console.log('Inserted sendRequestToDriver using LF style');
    } else {
        console.log('Could not find insertion point for sendRequestToDriver');
    }
} else {
    console.log('sendRequestToDriver already exists!');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done!');
