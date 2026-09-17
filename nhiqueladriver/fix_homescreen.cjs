const fs = require('fs');
let content = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');

const badPatch = '                  <TouchableOpacity \\n' +
'                     style={{ flex: 1, backgroundColor: \\'#7F00FF\\', paddingVertical: 15, borderRadius: 12, alignItems: \\'center\\', marginLeft: 10 }}\\n' +
'                     onPress={() => {\\n' +
'                         stopRingtone();\\n' +
'                         acceptTrip(incomingOrder.id, incomingOrder.isRequestService);\\n' +
'                     }}\\n' +
'                  >      <Ionicons name="car-outline" size={64} color={COLORS.gray} />';

content = content.replace(badPatch, '                <Ionicons name="car-outline" size={64} color={COLORS.gray} />');

// Now fix acceptOrder correctly
content = content.replace(
  'acceptOrder(incomingOrder);',
  'acceptTrip(incomingOrder.id, incomingOrder.isRequestService);'
);

// Now fix api.defaults.baseURL
if (content.includes('api.defaults.baseURL')) {
  content = content.replace(
    'await fetch(`${api.defaults.baseURL}/request-deliver/${orderId}/reject`, {',
    'const token = await AsyncStorage.getItem("userToken");\\n       await fetch(`${API_BASE_URL}/api/request-deliver/${orderId}/reject`, {'
  );
  content = content.replace(
    "'Authorization': api.defaults.headers.common['Authorization'] || ''",
    "'Authorization': `Bearer ${token}`"
  );
}

fs.writeFileSync('src/screens/HomeScreen.tsx', content, 'utf8');
console.log('Fixed HomeScreen.tsx');
