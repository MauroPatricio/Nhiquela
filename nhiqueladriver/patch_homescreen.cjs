const fs = require('fs');

try {
  let content = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');

  // Insert Sound State and play/stop functions
  const soundCode = `
  // --- ADDED FOR NEW ORDER RINGTONE ---
  const [ringtoneSound, setRingtoneSound] = useState<Audio.Sound | null>(null);
  const ringtoneTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [incomingOrder, setIncomingOrder] = useState<any>(null);

  const startRingtone = async (order: any) => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=classic-phone-ring-99705.mp3' },
        { shouldPlay: true, isLooping: true }
      );
      setRingtoneSound(sound);
      setIncomingOrder(order);
      
      // Auto-reject after 30 seconds
      if (ringtoneTimerRef.current) clearTimeout(ringtoneTimerRef.current);
      ringtoneTimerRef.current = setTimeout(() => {
         stopRingtone();
         handleRejectOrder(order.id);
      }, 30000);
    } catch (error) {
      console.log('Error playing ringtone:', error);
    }
  };

  const stopRingtone = async () => {
    if (ringtoneTimerRef.current) {
      clearTimeout(ringtoneTimerRef.current);
      ringtoneTimerRef.current = null;
    }
    if (ringtoneSound) {
      await ringtoneSound.stopAsync();
      await ringtoneSound.unloadAsync();
      setRingtoneSound(null);
    }
    setIncomingOrder(null);
  };

  const handleRejectOrder = async (orderId: string) => {
    try {
       await fetch(\`\${api.defaults.baseURL}/request-deliver/\${orderId}/reject\`, {
         method: 'PUT',
         headers: {
            'Authorization': api.defaults.headers.common['Authorization'] || ''
         }
       });
       setAllTrips(prev => prev.filter(t => t.id !== orderId));
       stopRingtone();
    } catch (e) {
       console.log('Error rejecting order', e);
    }
  };
  // ------------------------------------
  `;

  if (!content.includes('const startRingtone = async')) {
    content = content.replace(
      'const [lastUpdate, setLastUpdate] = useState(new Date());',
      'const [lastUpdate, setLastUpdate] = useState(new Date());\n' + soundCode
    );
  }

  // Modify handleOrderWebSocketUpdate to trigger sound
  const targetCode = `const newFormattedOrder = formatOrder(data, currentPosition);`;
  const replacementCode = `const newFormattedOrder = formatOrder(data, currentPosition);
            
            // Check if it's a new pending order that is specifically assigned to me via targetDriverId
            // The WS event is just 'new_order'. If it's pending (stepStatus === 3) and no accepted trip yet:
            if (newFormattedOrder.stepStatus === 3 && !acceptedTrip) {
               // Only trigger if we aren't already ringing for it
               if (!incomingOrder || incomingOrder.id !== newFormattedOrder.id) {
                  startRingtone(newFormattedOrder);
               }
            }`;
            
  if (!content.includes('startRingtone(newFormattedOrder)')) {
    content = content.replace(targetCode, replacementCode);
  }

  // Intercept normal Accept to stop ringtone
  const acceptTarget = `const acceptedData = await acceptOrderByDeliveryman(trip.id);`;
  const acceptReplace = `stopRingtone();\n      const acceptedData = await acceptOrderByDeliveryman(trip.id);`;
  if (!content.includes(acceptReplace)) {
    content = content.replace(acceptTarget, acceptReplace);
  }

  // UI modification: show aggressive modal for incoming order
  const modalUI = `
      {/* INCOMING ORDER MODAL */}
      <Modal visible={!!incomingOrder} transparent={true} animationType="fade">
         <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={{ width: '100%', backgroundColor: '#FFF', borderRadius: 24, padding: 25, alignItems: 'center' }}>
               <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center', marginBottom: 15 }}>
                  <Ionicons name="notifications-outline" size={30} color="#D97706" />
               </View>
               <Text style={{ fontSize: 22, fontWeight: '800', marginBottom: 10, textAlign: 'center' }}>Novo Pedido Direto!</Text>
               <Text style={{ fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 5 }}>Distância: {incomingOrder?.distance} km</Text>
               <Text style={{ fontSize: 24, fontWeight: '700', color: '#10B981', marginVertical: 15 }}>{incomingOrder?.price} MT</Text>
               <Text style={{ color: '#EF4444', fontWeight: 'bold', marginBottom: 20 }}>Tens 30 segundos para aceitar!</Text>
               
               <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between' }}>
                  <TouchableOpacity 
                     style={{ flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginRight: 10 }}
                     onPress={() => { stopRingtone(); handleRejectOrder(incomingOrder?.id); }}
                  >
                     <Text style={{ color: '#4B5563', fontWeight: 'bold', fontSize: 16 }}>Rejeitar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                     style={{ flex: 1, backgroundColor: '#7F00FF', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginLeft: 10 }}
                     onPress={() => {
                         stopRingtone();
                         acceptOrder(incomingOrder);
                     }}
                  >
                     <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>Aceitar</Text>
                  </TouchableOpacity>
               </View>
            </View>
         </View>
      </Modal>
  `;

  if (!content.includes('INCOMING ORDER MODAL')) {
    content = content.replace('{/* Modal de Sucesso */}', modalUI + '\n      {/* Modal de Sucesso */}');
  }

  fs.writeFileSync('src/screens/HomeScreen.tsx', content, 'utf8');
  console.log('Patched HomeScreen.tsx for driver selection ringtone and timeout successfully.');
} catch (e) {
  console.error('Error patching:', e);
}
