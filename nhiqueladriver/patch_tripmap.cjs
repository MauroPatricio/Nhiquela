const fs = require('fs');

let content = fs.readFileSync('src/components/TripMap.tsx', 'utf8');

// Add Linking to imports if not there
if (!content.includes('Linking')) {
  content = content.replace('import { \n  StyleSheet, \n  Dimensions, \n  View, \n  Text, \n  Animated, \n  TouchableOpacity,\n  Modal,\n  Alert \n} from "react-native";', 'import { \n  StyleSheet, \n  Dimensions, \n  View, \n  Text, \n  Animated, \n  TouchableOpacity,\n  Modal,\n  Alert,\n  Linking \n} from "react-native";');
}

const target = `      {/* 🔥 INFO BOX SUPERIOR */}
      <View style={[styles.statusBox, { backgroundColor: statusInfo.color }]}>
        <Ionicons name={statusInfo.icon as any} size={20} color="#FFF" />
        <Text style={styles.statusText}>{statusInfo.title}</Text>
      </View>`;

const replacement = `      {/* 🔥 INFO BOX SUPERIOR */}
      <View style={[styles.statusBox, { backgroundColor: statusInfo.color }]}>
        <Ionicons name={statusInfo.icon as any} size={20} color="#FFF" />
        <Text style={styles.statusText}>{statusInfo.title}</Text>
      </View>

      {/* 🔥 INFO CLIENTE */}
      {tripData && tripData.user && (
        <View style={styles.clientInfoBox}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Ionicons name="person-circle-outline" size={24} color="#333" style={{ marginRight: 8 }} />
            <View>
              <Text style={styles.clientName}>{tripData.user.name || 'Cliente'}</Text>
              <Text style={styles.clientPhone}>{tripData.user.phoneNumber || 'N/A'}</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.callButton}
            onPress={() => {
              if (tripData.user.phoneNumber) {
                Linking.openURL(\`tel:\${tripData.user.phoneNumber}\`);
              }
            }}
          >
            <Ionicons name="call" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}`;

const styleTarget = `  statusText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
  },`;

const styleReplacement = `  statusText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
  },
  clientInfoBox: {
    position: "absolute",
    top: 90,
    alignSelf: "center",
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  clientName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  clientPhone: {
    fontSize: 12,
    color: '#666',
  },
  callButton: {
    backgroundColor: '#27AE60',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },`;

if (content.includes(target) && content.includes(styleTarget)) {
  content = content.replace(target, replacement);
  content = content.replace(styleTarget, styleReplacement);
  fs.writeFileSync('src/components/TripMap.tsx', content);
  console.log('TripMap updated with Client Info box.');
} else {
  console.log('Target strings not found in TripMap.tsx');
}
