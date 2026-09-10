const fs = require('fs');

const file = 'd:/Projectos/Nhiquela/Nhiquela_Driver_V1.0.0/src/screens/HomeScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

const searchStr = `      <View style={styles.routeSummaryContainer}>
        <Animated.View
          style={[
            styles.animatedBackground,
            {
              <Ionicons name="location" size={12} color="#FFF" />
              <Text style={styles.locationSharingText}>Localização compartilhada</Text>
            </View>
          )}

          {isAccepted && !isInTransit && (`;

const replaceStr = `      <View style={styles.routeSummaryContainer}>
        {/* 🔥 INDICADOR DE LOCALIZAÇÃO COMPARTILHADA */}
        {isAccepted && isSharingLocation && (
          <View style={styles.locationSharingBadge}>
            <Ionicons name="location" size={12} color="#FFF" />
            <Text style={styles.locationSharingText}>Localização compartilhada</Text>
          </View>
        )}

        {isAccepted && !isInTransit && (`;

content = content.replace(searchStr, replaceStr);

fs.writeFileSync(file, content);
console.log("HomeScreen syntax fixed!");
