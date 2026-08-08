const fs = require('fs');

try {
  let content = fs.readFileSync('screens/RequestService.jsx', 'utf8');

  // Insert sendRequestToDriver function
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
        latitude: originCoord.lat,
        longitude: originCoord.lng,
        targetDriverId: driver._id
      };

      await api.post('/request-deliver', payload, {
        headers: { authorization: \`Bearer \${token}\` }
      });
      
      // We don't navigate yet, we wait for driver to accept/reject via socket
      // A proper implementation would listen to a socket event here for 'order_updated'
      
    } catch (postError) {
      console.log('Erro ao criar pedido:', postError);
      Alert.alert("Erro", "Falha ao criar o pedido.");
      setWaitingForDriver(false);
    }
  };
  `;

  if (!content.includes('const sendRequestToDriver = async')) {
    content = content.replace(
      'const startPulse = () => {',
      functionCode + '\n  const startPulse = () => {'
    );
  }

  // Insert socket listener for order status
  const socketListenerCode = `
  useEffect(() => {
    if (waitingForDriver && selectedDriverForRequest) {
      // Check for WebSocket service or use an interval to poll
      // If order is rejected or cancelled, show alert
      const checkStatus = async () => {
         try {
           const { data } = await api.get('/request-deliver/userview');
           const myOrder = data.deliverRequests && data.deliverRequests[0];
           if (myOrder && myOrder.targetDriverId === selectedDriverForRequest._id) {
             if (myOrder.status === 'Cancelado') {
                Alert.alert("Motorista Indisponível", "O motorista não pôde aceitar a corrida.");
                setWaitingForDriver(false);
                setSelectedDriverForRequest(null);
             } else if (myOrder.status === 'Aceite pelo entregador') {
                setWaitingForDriver(false);
                setShowDriverList(false);
                navigation.navigate('Pedidos');
             }
           }
         } catch(e){}
      };
      const interval = setInterval(checkStatus, 3000);
      return () => clearInterval(interval);
    }
  }, [waitingForDriver, selectedDriverForRequest]);
  `;

  if (!content.includes('if (waitingForDriver && selectedDriverForRequest) {')) {
    content = content.replace(
      'const startPulse = () => {',
      socketListenerCode + '\n  const startPulse = () => {'
    );
  }

  // Insert the Driver List Modal UI
  const modalUI = `
      {/* Lista de Motoristas Disponíveis */}
      <Modal visible={showDriverList} animationType="slide" transparent={true}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modernModal, { height: '80%', padding: 15 }]}>
             <View style={styles.headerRow}>
                <Text style={styles.mainTitle}>Motoristas Disponíveis</Text>
                <TouchableOpacity onPress={() => setShowDriverList(false)} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color="#1A1A1A" />
                </TouchableOpacity>
             </View>
             
             {waitingForDriver ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                   <ActivityIndicator size="large" color="#7F00FF" />
                   <Text style={{ marginTop: 20, fontSize: 16, fontWeight: '600' }}>Aguardando confirmação do motorista...</Text>
                </View>
             ) : (
             <FlatList 
               data={foundDrivers}
               keyExtractor={item => item._id}
               style={{ width: '100%' }}
               renderItem={({item}) => {
                 let finalPrice = price;
                 if (item.allowCustomPrice && item.customPrice) {
                    finalPrice = item.customPrice * (item.distance || 1);
                 } else if (service?.basePrice) {
                    finalPrice = (service.basePrice || price) * (item.distance || 1);
                 }
                 
                 return (
                   <TouchableOpacity 
                     style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' }}
                     onPress={() => sendRequestToDriver(item)}
                   >
                      <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' }}>
                         <Ionicons name="person" size={24} color="#9CA3AF" />
                      </View>
                      <View style={{ marginLeft: 15, flex: 1 }}>
                         <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A' }}>{item.name}</Text>
                         <Text style={{ fontSize: 13, color: '#6B7280' }}>
                            {item.deliveryman?.transport_type} • {item.deliveryman?.transport_registration}
                         </Text>
                         <Text style={{ fontSize: 13, color: '#7F00FF', marginTop: 2, fontWeight: '600' }}>
                            A {(item.distance || 0).toFixed(1)} km
                         </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                         <Text style={{ fontSize: 18, fontWeight: '800', color: '#10B981' }}>{finalPrice.toFixed(2)} MT</Text>
                         <Text style={{ fontSize: 12, color: '#6B7280' }}>Total</Text>
                      </View>
                   </TouchableOpacity>
                 );
               }}
               ListEmptyComponent={() => <Text style={{ textAlign: 'center', marginTop: 20 }}>Nenhum motorista encontrado.</Text>}
             />
             )}
          </View>
        </View>
      </Modal>
  `;

  if (!content.includes('visible={showDriverList}')) {
    content = content.replace(
      '{showBusyModal && (',
      modalUI + '\n      {showBusyModal && ('
    );
  }

  fs.writeFileSync('screens/RequestService.jsx', content, 'utf8');
  console.log('Patched RequestService.jsx for specific driver selection successfully.');
} catch (e) {
  console.error('Error patching:', e);
}
