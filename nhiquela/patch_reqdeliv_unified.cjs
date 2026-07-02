const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'screens', 'RequestDeliv.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add missing state variables
if (!content.includes('waitingForDriver')) {
    content = content.replace(
        '  const [isMinimized, setIsMinimized] = useState(false); // toggle ver rota',
        '  const [isMinimized, setIsMinimized] = useState(false); // toggle ver rota\n  const [waitingForDriver, setWaitingForDriver] = useState(false);\n  const [selectedDriverForRequest, setSelectedDriverForRequest] = useState(null);'
    );
}

// 2. Fix scroll padding
const scrollPaddingRegex = /paddingBottom:\s*keyboardHeight\s*>\s*0\s*\?\s*keyboardHeight\s*\+\s*\d+\s*:\s*\d+/;
if (scrollPaddingRegex.test(content)) {
    content = content.replace(scrollPaddingRegex, 'paddingBottom: keyboardHeight > 0 ? keyboardHeight + 200 : 120');
}

// 3. Fix scroll position
const scrollYRegex = /scrollViewRef\.current\?\.scrollTo\(\{\s*y:\s*260,\s*animated:\s*true\s*\}\);/;
if (scrollYRegex.test(content)) {
    content = content.replace(scrollYRegex, 'scrollViewRef.current?.scrollTo({ y: 350, animated: true });');
}

// 4. Fix string interpolation text
if (content.includes('Procurando ${service?.name}...')) {
    content = content.replace('Procurando ${service?.name}...', 'Procurando serviço de {service?.name}...');
} else if (content.includes('Procurando motoristas...')) {
    content = content.replace('Procurando motoristas...', 'Procurando serviço de {service?.name}...');
}

// 5. Fix searchDrivers navigation to sendRequestToDriver
const searchBlock1 = `        if (drivers.length > 0) {
          clearTimeout(searchTimerRef.current);
          clearInterval(searchCounterRef.current);
          setIsSearching(false);
          // Navegar para detalhes do pedido com o primeiro motorista disponivel
          navigation.navigate('Pedidos');
          return;
        }`;
const searchBlock2 = `        if (drivers.length > 0) {
          clearTimeout(searchTimerRef.current);
          clearInterval(searchCounterRef.current);
          setIsSearching(false);
          sendRequestToDriver(drivers[0]);
          return;
        }`;

if (content.includes(searchBlock1)) {
    content = content.replace(searchBlock1, searchBlock2);
} else if (content.includes(searchBlock1.replace(/\r\n/g, '\n'))) {
    content = content.replace(searchBlock1.replace(/\r\n/g, '\n'), searchBlock2.replace(/\r\n/g, '\n'));
}

// 6. Add waitingForDriver Modal
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
        content = content.replace(splitPoint, '      </View>\r\n    </Modal>\r\n' + waitingModal.replace(/\n/g, '\r\n') + '\r\n      <Modal visible={showBusyModal} transparent animationType="fade">');
    } else if (content.includes(splitPointLF)) {
        content = content.replace(splitPointLF, '      </View>\n    </Modal>\n' + waitingModal + '\n      <Modal visible={showBusyModal} transparent animationType="fade">');
    }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('All patches applied successfully!');
