const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'screens', 'RequestDeliv.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const searchBlockOld = `        if (drivers.length > 0) {
          clearTimeout(searchTimerRef.current);
          clearInterval(searchCounterRef.current);
          setIsSearching(false);
          // Navegar para detalhes do pedido com o primeiro motorista disponivel
          navigation.navigate('Pedidos');
          return;
        }`;

const searchBlockNew = `        if (drivers.length > 0) {
          clearTimeout(searchTimerRef.current);
          clearInterval(searchCounterRef.current);
          setIsSearching(false);
          sendRequestToDriver(drivers[0]);
          return;
        }`;

if (content.includes(searchBlockOld)) {
    content = content.replace(searchBlockOld, searchBlockNew);
    console.log('Patched search logic!');
} else {
    console.log('Search logic not found, already patched?');
}

const waitingModal = `
    <Modal visible={waitingForDriver} transparent animationType="fade">
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <View style={{
          backgroundColor: '#FFF',
          borderRadius: 28,
          padding: 32,
          width: '88%',
          alignItems: 'center',
          elevation: 20,
          shadowColor: '#7F00FF',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.2,
          shadowRadius: 20,
        }}>
          {/* Radar pulse */}
          <View style={{ width: 110, height: 110, justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
            <Animated.View style={[styles.radarCenter, {
              position: 'absolute',
              width: 110,
              height: 110,
              borderRadius: 55,
              backgroundColor: 'rgba(168, 85, 247, 0.15)',
              transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2] }) }],
              opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] })
            }]} />
            <Animated.View style={[styles.radarCenter, {
              position: 'absolute',
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: 'rgba(168, 85, 247, 0.2)',
              transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }],
              opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })
            }]} />
            <View style={[styles.radarCenter, { backgroundColor: '#F3E8FF', width: 64, height: 64, borderRadius: 32 }]}>
              <MaterialCommunityIcons name="clock-outline" size={30} color="#A855F7" />
            </View>
          </View>

          <Text style={{ fontSize: 20, fontWeight: '800', color: '#1A1A1A', textAlign: 'center' }}>
            A aguardar confirmação do motorista...
          </Text>
          <Text style={{ color: '#6B7280', marginTop: 6, fontSize: 14, textAlign: 'center' }}>
            Enviámos o seu pedido. Por favor aguarde enquanto o motorista analisa.
          </Text>
        </View>
      </View>
    </Modal>
`;

if (!content.includes('visible={waitingForDriver}')) {
    const splitPoint = '      </View>\r\n    </Modal>\r\n\r\n      <Modal visible={showBusyModal} transparent animationType="fade">';
    const splitPointLF = '      </View>\n    </Modal>\n\n      <Modal visible={showBusyModal} transparent animationType="fade">';
    
    if (content.includes(splitPoint)) {
        content = content.replace(splitPoint, '      </View>\r\n    </Modal>\r\n' + waitingModal + '\r\n      <Modal visible={showBusyModal} transparent animationType="fade">');
        console.log('Patched modal (CRLF)!');
    } else if (content.includes(splitPointLF)) {
        content = content.replace(splitPointLF, '      </View>\n    </Modal>\n' + waitingModal + '\n      <Modal visible={showBusyModal} transparent animationType="fade">');
        console.log('Patched modal (LF)!');
    } else {
        console.log('Modal split point not found!');
    }
} else {
    console.log('Waiting modal already exists!');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done!');
