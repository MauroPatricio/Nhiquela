import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  Alert,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { COLORS } from "../styles/colors";

const DriverHeader = ({ batteryLevel }) => {
  const { user, logout, profileImage } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // ✅ Memoized image to avoid unnecessary re-renders
  const imageSource = useMemo(() => {
    const deliverymanPhoto = user?.deliveryman?.photo;
    const userPhoto = user?.photo;
    let imageUri = deliverymanPhoto || userPhoto || profileImage;

    if (!imageUri)
      return { uri: "https://via.placeholder.com/150/007bff/ffffff?text=DR" };

    if (imageUri.startsWith("data:image")) return { uri: imageUri };
    if (imageUri.startsWith("http")) return { uri: imageUri };
    if (imageUri.length > 100 && !imageUri.startsWith("data:"))
      return { uri: `data:image/jpeg;base64,${imageUri}` };

    return { uri: "https://via.placeholder.com/150/007bff/ffffff?text=DR" };
  }, [user?.deliveryman?.photo, user?.photo, profileImage]);

  // ✅ Safe logout with loading lock
  const handleLogout = () => {
    if (isLoggingOut) return;

    Alert.alert(
      "Confirmar Logout",
      "Tem certeza que deseja sair da sua conta?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sair",
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoggingOut(true);
              await logout();
            } catch (error) {
              Alert.alert(
                "Erro",
                "Não foi possível fazer logout. Tente novamente."
              );
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  return (
    <LinearGradient
      colors={[COLORS.primaryDark, COLORS.primary, COLORS.primaryLight]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.profileContainer}>
        <Image
          source={imageSource}
          style={styles.userAvatar}
          defaultSource={require("../assets/icon.png")}
          onError={(error) =>
            console.log(
              "❌ [DriverHeader] Erro ao carregar imagem:",
              error.nativeEvent.error
            )
          }
        />
        <View style={styles.textContainer}>
          <Text style={styles.welcomeText}>Bem-vindo(a)</Text>
          <Text style={styles.userName}>
            {user?.deliveryman?.name || user?.name || "Motorista"}
          </Text>
        </View>
      </View>

      <View style={styles.rightContainer}>
        {/* 🔋 Mostra o nível da bateria se disponível */}
        {batteryLevel !== undefined && (
          <View style={styles.batteryContainer}>
            <Ionicons name="battery-half" size={14} color={COLORS.white} />
            <Text style={styles.batteryText}>{batteryLevel}%</Text>
          </View>
        )}

        {/* 🚪 Botão de logout */}
        <TouchableOpacity onPress={handleLogout} disabled={isLoggingOut}>
          <MaterialCommunityIcons
            name="logout"
            size={24}
            color={COLORS.white}
            style={{ opacity: isLoggingOut ? 0.6 : 1 }}
          />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

export default React.memo(DriverHeader);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 3,
  },
  profileContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  userAvatar: {
    width: 45,
    height: 45,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: COLORS.white,
    backgroundColor: COLORS.white,
  },
  textContainer: {
    marginLeft: 10,
  },
  welcomeText: {
    color: COLORS.white,
    fontSize: 12,
    opacity: 0.8,
  },
  userName: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "bold",
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  batteryContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },
  batteryText: {
    color: COLORS.white,
    fontSize: 11,
    marginLeft: 4,
  },
});
