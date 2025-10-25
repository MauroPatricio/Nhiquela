// components/DriverHeader.tsx - COM SUPORTE PARA BASE64
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  Alert
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../styles/colors";
import { useAuth } from "../context/AuthContext";

type Props = {
  onMenuPress: () => void;
  onNotificationPress: () => void;
  onStartTrip?: () => void;
  currentLocation?: string;
  batteryLevel?: number;
  isConnected?: boolean;
  profileImage?: string;
  todayEarnings?: string;
  totalPassengers?: number;
  credit?: string;
  userRating?: number;
};

export default function DriverHeader({
  onMenuPress,
  onNotificationPress,
  currentLocation = "Maputo, MZ",
  batteryLevel = 85,
  isConnected = true,
  profileImage,
  todayEarnings = "MZN 0,00",
  totalPassengers = 12,
  credit = "MZN 0,00",
  userRating = 4.9,
}: Props) {
  // ✅ USAR DADOS DO CONTEXTO
  const { user, logout } = useAuth();

  // ✅ FUNÇÃO PARA CONFIRMAR LOGOUT
  const handleLogout = () => {
    Alert.alert(
      "Confirmar Logout",
      "Tem certeza que deseja sair da sua conta?",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Sair",
          style: "destructive",
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error("❌ [DriverHeader] Erro no logout:", error);
              Alert.alert("Erro", "Não foi possível fazer logout. Tente novamente.");
            }
          }
        }
      ]
    );
  };

  // ✅ FUNÇÃO PARA DETETAR E FORMATAR IMAGEM (BASE64 OU URL)
  const getProfileImageSource = () => {
    // Primeiro verificar se há foto do deliveryman
    const deliverymanPhoto = user?.deliveryman?.photo;
    // Depois verificar se há foto direta do user
    const userPhoto = user?.photo;
    
    // Prioridade: deliveryman photo -> user photo -> profileImage -> placeholder
    let imageUri = deliverymanPhoto || userPhoto || profileImage;

    if (!imageUri) {
      return { uri: "https://via.placeholder.com/150/007bff/ffffff?text=DR" };
    }

    // ✅ SE FOR BASE64, usar diretamente
    if (imageUri.startsWith('data:image')) {
      return { uri: imageUri };
    }

    // ✅ SE FOR URL, verificar se é válida
    if (imageUri.startsWith('http')) {
      return { uri: imageUri };
    }

    // ✅ SE FOR APENAS BASE64 SEM PREFIXO, adicionar prefixo
    if (imageUri.length > 100 && !imageUri.startsWith('data:') && !imageUri.startsWith('http')) {
      // Assumir que é JPEG (mais comum)
      const base64WithPrefix = `data:image/jpeg;base64,${imageUri}`;
      return { uri: base64WithPrefix };
    }

    // ✅ FALLBACK: usar placeholder
    return { uri: "https://via.placeholder.com/150/007bff/ffffff?text=DR" };
  };

  // ✅ FUNÇÃO PARA SAUDAÇÃO POR HORÁRIO
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  // ✅ FUNÇÃO PARA PEGAR PRIMEIRO NOME (AGORA DO CONTEXTO)
  const getFirstName = () => {
    if (!user?.name) {
      return 'Motorista';
    }
    const firstName = user.name.split(' ')[0];
    return firstName;
  };

  // ✅ FUNÇÃO PARA OBTER STATUS DO REGISTO
  const getRegistrationStatus = () => {
    const status = user?.deliveryman?.register_conformance;    
    switch (status) {
      case "CONFORMANCE":
        return { text: "Registo Aprovado", color: COLORS.success };
      case "INCONFORMANCE":
        return { text: "Registo Recusado", color: COLORS.error };
      case "PENDING_CONFORMANCE":
        return { text: "Aguardando Aprovação", color: COLORS.warning };
      default:
        return { text: "Não Registado", color: COLORS.gray100 };
    }
  };

  // ✅ DADOS DO MOTORISTA DO CONTEXTO
  const userName = user?.name || '';
  const isDeliveryMan = user?.isDeliveryMan || false;
  const transportType = user?.deliveryman?.transport_type;
  const vehicleColor = user?.deliveryman?.transport_color;
  const vehiclePlate = user?.deliveryman?.transport_registration;
  const registrationStatus = getRegistrationStatus();

  // ✅ OBTER A FONTE DA IMAGEM
  const imageSource = getProfileImageSource();

  return (
    <LinearGradient
      colors={COLORS.gradientDark}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Top Row */}
      <View style={styles.topRow}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>Nhiquela+</Text>
          
          {/* ✅ BADGE DINÂMICO - PREMIUM OU MOTORISTA */}
          {isDeliveryMan ? (
            <View style={styles.deliveryBadge}>
              <Ionicons name="car-sport" size={12} color={COLORS.success} />
              <Text style={styles.deliveryText}>MOTORISTA</Text>
            </View>
          ) : (
            <View style={styles.premiumBadge}>
              <Ionicons name="diamond" size={12} color={COLORS.warning} />
              <Text style={styles.premiumText}></Text>
            </View>
          )}
        </View>

        <View style={styles.headerRight}>
          <View style={styles.onlineStatus}>
            <Ionicons
              name="ellipse"
              size={14}
              color={isConnected ? COLORS.success : COLORS.error}
            />
            <Text style={styles.onlineText}>
              {isConnected ? 'Online' : 'Offline'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.notificationButton}
            onPress={onNotificationPress}
          >
            <Ionicons
              name="notifications-outline"
              size={24}
              color={COLORS.white}
            />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>

          {/* ✅ BOTÃO DE LOGOUT ADICIONADO */}
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={handleLogout}
          >
            <Ionicons 
              name="log-out-outline" 
              size={24} 
              color={COLORS.white} 
            />
          </TouchableOpacity>

         
        </View>
      </View>

      {/* Informações do Usuário */}
      <View style={styles.userInfo}>
        <Image
          source={imageSource}
          style={styles.userAvatar}
          onError={(error) => {
          }}
          onLoad={() => {
          }}
        />

        <View style={styles.userDetails}>
          <Text style={styles.greeting}>
            {getGreeting()}, {getFirstName()}! 👋
          </Text>
          
          <Text style={styles.userStatus}>
            {isConnected ? 'Pronto para novas viagens' : 'Offline'}
          </Text>
          
          {/* ✅ INFO DO VEÍCULO (APENAS PARA MOTORISTAS) - AGORA DO CONTEXTO */}
          {isDeliveryMan && (
            <View style={styles.vehicleInfoContainer}>
              {transportType ? (
                <Text style={styles.vehicleInfo}>
                  {transportType} 
                  {vehicleColor && ` • ${vehicleColor}`}
                  {vehiclePlate && ` • ${vehiclePlate}`}
                </Text>
              ) : (
                <Text style={styles.vehicleInfo}>
                  Veículo não registado
                </Text>
              )}
              
              {/* ✅ STATUS DO REGISTO */}
              <View style={[styles.registrationStatus, { backgroundColor: registrationStatus.color + '20' }]}>
                <Ionicons 
                  name={
                    registrationStatus.text === "Registo Aprovado" ? "checkmark-circle" :
                    registrationStatus.text === "Registo Recusado" ? "close-circle" :
                    "time"
                  } 
                  size={10} 
                  color={registrationStatus.color} 
                />
                <Text style={[styles.registrationStatusText, { color: registrationStatus.color }]}>
                  {registrationStatus.text}
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={16} color={COLORS.warning} />
          <Text style={styles.rating}>{userRating}</Text>
        </View>
      </View>

      {/* Localização */}
      <View style={styles.locationContainer}>
        <Ionicons name="location" size={14} color={COLORS.white} />
        <Text style={styles.locationText}>{currentLocation}</Text>
      </View>

      {/* Métricas */}
      <View style={styles.metricsContainer}>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{todayEarnings}</Text>
          <Text style={styles.metricLabel}>Hoje</Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{totalPassengers}</Text>
          <Text style={styles.metricLabel}>Viagens</Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{credit}</Text>
          <Text style={styles.metricLabel}>Crédito</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: "bold",
    marginRight: 8,
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  premiumText: {
    color: COLORS.warning,
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 4,
  },
  deliveryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(76, 217, 100, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deliveryText: {
    color: COLORS.success,
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 4,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  onlineStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  onlineText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  notificationButton: {
    padding: 4,
    marginRight: 8,
    position: "relative",
  },
  // ✅ NOVO ESTILO PARA O BOTÃO DE LOGOUT
  logoutButton: {
    padding: 4,
    marginRight: 8,
  },
  iconButton: {
    padding: 4,
  },
  notificationBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.secondaryLight,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  userDetails: {
    flex: 1,
    marginLeft: 12,
  },
  greeting: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  userStatus: {
    color: COLORS.gray100,
    fontSize: 12,
  },
  vehicleInfoContainer: {
    marginTop: 4,
  },
  vehicleInfo: {
    color: COLORS.gray100,
    fontSize: 11,
    fontStyle: 'italic',
  },
  registrationStatus: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  registrationStatusText: {
    fontSize: 9,
    fontWeight: "600",
    marginLeft: 4,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rating: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  locationText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  metricsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  metricItem: {
    alignItems: "center",
    flex: 1,
  },
  metricValue: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 2,
  },
  metricLabel: {
    color: COLORS.gray100,
    fontSize: 10,
    fontWeight: "500",
  },
  metricDivider: {
    width: 1,
    height: 20,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
});