import { showMessage } from "react-native-flash-message";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Animated,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS } from "../styles/colors";
import { useAuth } from "../context/AuthContext";
import api from "../api/apiConfig";

type Props = {
  navigation: any;
};

export default function ProfileScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [autoAccept, setAutoAccept] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [driverStats, setDriverStats] = useState({ totalTrips: 0, rating: 4.8 });

  // ✅ DADOS DO USUÁRIO DO CONTEXTO
  const getMemberSince = () => {
    if (user?.createdAt) return new Date(user.createdAt).getFullYear().toString();
    return "2024";
  };

  const userData = {
    name: user?.name || "Motorista",
    email: user?.email || "email@exemplo.com",
    phone: user?.phoneNumber ? `+258 ${user.phoneNumber}` : "+258 84 000 0000",
    level: user?.isDeliveryMan ? "Motorista" : "Passageiro",
    memberSince: getMemberSince(), // Podes adicionar este campo no user se necessário
    totalTrips: driverStats.totalTrips, // Podes adicionar estatísticas depois
    rating: driverStats.rating,
    vehicle: user?.deliveryman?.transport_type || "Veículo não registado",
    licensePlate: user?.deliveryman?.transport_registration || "Não definida",
    vehicleColor: user?.deliveryman?.transport_color || "Não definida",
  };

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    loadUserPreferences();
  }, []);

  const loadUserPreferences = async () => {
    try {
      const preferences = await AsyncStorage.getItem("userPreferences");
      if (preferences) {
        const { notifications: notif, darkMode: dark, autoAccept: auto } = JSON.parse(preferences);
        setNotifications(notif);
        setDarkMode(dark);
        setAutoAccept(auto);
      }
    } catch (error) {
      console.error("Erro ao carregar preferências:", error);
    }
  };

  const savePreferences = async () => {
    try {
      const preferences = { notifications, darkMode, autoAccept };
      await AsyncStorage.setItem("userPreferences", JSON.stringify(preferences));
      showMessage({
        message: "✅ Sucesso",
        description: "Preferências salvas com sucesso!",
        type: "success",
        icon: "auto",
        duration: 3000,
      });
    } catch (error) {
      showMessage({
        message: "❌ Erro",
        description: "Não foi possível salvar as preferências.",
        type: "danger",
        icon: "auto",
        duration: 3000,
      });
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Sair da Conta",
      "Tem certeza que deseja sair?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sair",
          onPress: async () => {
            await logout();
            navigation.reset({
              index: 0,
              routes: [{ name: "Login" }],
            });
          },
        },
      ]
    );
  };

  // ✅ FUNÇÃO PARA OBTER FOTO DO PERFIL
  const getProfileImageSource = () => {
    const deliverymanPhoto = user?.deliveryman?.photo;
    const userPhoto = user?.photo;
    
    let imageUri = deliverymanPhoto || userPhoto;

    if (!imageUri) {
      return { uri: "https://via.placeholder.com/150/007bff/ffffff?text=DR" };
    }

    // ✅ LIDAR COM BASE64
    if (imageUri.startsWith('data:image')) {
      return { uri: imageUri };
    }

    if (imageUri.startsWith('http')) {
      return { uri: imageUri };
    }

    // ✅ BASE64 SEM PREFIXO
    if (imageUri.length > 100 && !imageUri.startsWith('data:') && !imageUri.startsWith('http')) {
      const base64WithPrefix = `data:image/jpeg;base64,${imageUri}`;
      return { uri: base64WithPrefix };
    }

    return { uri: "https://via.placeholder.com/150/007bff/ffffff?text=DR" };
  };

  const StatCard = ({ title, value, icon, color }: any) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Ionicons name={icon} size={20} color={color} />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );

  const MenuItem = ({ icon, title, subtitle, onPress, isSwitch, value, onValueChange }: any) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} disabled={isSwitch}>
      <View style={styles.menuLeft}>
        <View style={styles.menuIcon}>
          <Ionicons name={icon} size={22} color={COLORS.primary} />
        </View>
        <View style={styles.menuText}>
          <Text style={styles.menuTitle}>{title}</Text>
          {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {isSwitch ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: "#767577", true: COLORS.primary + "80" }}
          thumbColor={value ? COLORS.primary : "#f4f3f4"}
        />
      ) : (
        <Ionicons name="chevron-forward" size={20} color="#666" />
      )}
    </TouchableOpacity>
  );

  const imageSource = getProfileImageSource();

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header do Perfil */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image
              source={imageSource}
              style={styles.avatar}
              onError={(error) => console.log("❌ Erro ao carregar imagem:", error)}
            />
            <View style={styles.premiumBadge}>
              <Ionicons 
                name={user?.isDeliveryMan ? "car-sport" : "diamond"} 
                size={16} 
                color={user?.isDeliveryMan ? COLORS.success : "#FFD700"} 
              />
            </View>
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{userData.name}</Text>
            <View style={[
              styles.levelBadge, 
              { backgroundColor: user?.isDeliveryMan ? "rgba(76, 217, 100, 0.1)" : "rgba(255, 215, 0, 0.1)" }
            ]}>
              <Ionicons 
                name={user?.isDeliveryMan ? "car-sport" : "star"} 
                size={14} 
                color={user?.isDeliveryMan ? COLORS.success : "#B8860B"} 
              />
              <Text style={[
                styles.levelText, 
                { color: user?.isDeliveryMan ? COLORS.success : "#B8860B" }
              ]}>
                {userData.level}
              </Text>
            </View>
            <Text style={styles.userEmail}>{userData.email}</Text>
            <Text style={styles.userPhone}>{userData.phone}</Text>
            <Text style={styles.userSince}>Membro desde {userData.memberSince}</Text>
          </View>
        </View>

        {/* Estatísticas */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Estatísticas</Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="Viagens"
              value={userData.totalTrips}
              icon="car-outline"
              color={COLORS.primary}
            />
            <StatCard
              title="Avaliação"
              value={userData.rating}
              icon="star-outline"
              color="#FFB800"
            />
            <StatCard
              title="Nível"
              value={userData.level}
              icon={user?.isDeliveryMan ? "car-sport" : "trophy-outline"}
              color={user?.isDeliveryMan ? COLORS.success : "#27AE60"}
            />
          </View>
        </View>

        {/* ✅ INFORMACOES DO VEÍCULO - APENAS PARA MOTORISTAS */}
        {user?.isDeliveryMan && (
          <View style={styles.vehicleSection}>
            <Text style={styles.sectionTitle}>Veículo</Text>
            <View style={styles.vehicleCard}>
              <View style={styles.vehicleHeader}>
                <Ionicons name="car-sport" size={24} color={COLORS.primary} />
                <Text style={styles.vehicleModel}>{userData.vehicle}</Text>
              </View>
              <View style={styles.vehicleDetails}>
                <View style={styles.vehicleDetail}>
                  <Ionicons name="card" size={16} color="#666" />
                  <Text style={styles.vehicleText}>{userData.licensePlate}</Text>
                </View>
                {userData.vehicleColor !== "Não definida" && (
                  <View style={styles.vehicleDetail}>
                    <Ionicons name="color-palette" size={16} color="#666" />
                    <Text style={styles.vehicleText}>{userData.vehicleColor}</Text>
                  </View>
                )}
              </View>
              
              {/* ✅ STATUS DO REGISTO DO MOTORISTA */}
              {user?.deliveryman?.register_conformance && (
                <View style={styles.registrationStatus}>
                  <Ionicons 
                    name={
                      user.deliveryman.register_conformance === "CONFORMANCE" ? "checkmark-circle" :
                      user.deliveryman.register_conformance === "INCONFORMANCE" ? "close-circle" :
                      "time"
                    } 
                    size={14} 
                    color={
                      user.deliveryman.register_conformance === "CONFORMANCE" ? COLORS.success :
                      user.deliveryman.register_conformance === "INCONFORMANCE" ? COLORS.error :
                      COLORS.warning
                    } 
                  />
                  <Text style={[
                    styles.registrationStatusText,
                    { 
                      color: 
                        user.deliveryman.register_conformance === "CONFORMANCE" ? COLORS.success :
                        user.deliveryman.register_conformance === "INCONFORMANCE" ? COLORS.error :
                        COLORS.warning
                    }
                  ]}>
                    {user.deliveryman.register_conformance === "CONFORMANCE" ? "Registo Aprovado" :
                     user.deliveryman.register_conformance === "INCONFORMANCE" ? "Registo Recusado" :
                     "Aguardando Aprovação"}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Menu de Configurações */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Configurações</Text>
          
          <View style={styles.menuGroup}>
            <MenuItem
              icon="notifications-outline"
              title="Notificações"
              subtitle="Receber alertas de viagens"
              isSwitch={true}
              value={notifications}
              onValueChange={setNotifications}
            />
            <MenuItem
              icon="moon-outline"
              title="Modo Escuro"
              subtitle="Tema escuro para melhor visibilidade"
              isSwitch={true}
              value={darkMode}
              onValueChange={setDarkMode}
            />
            {user?.isDeliveryMan && (
              <MenuItem
                icon="flash-outline"
                title="Aceitar Automaticamente"
                subtitle="Aceitar viagens automaticamente"
                isSwitch={true}
                value={autoAccept}
                onValueChange={setAutoAccept}
              />
            )}
          </View>

          <View style={styles.menuGroup}>
            <MenuItem
              icon="person-outline"
              title="Editar Perfil"
              subtitle="Alterar informações pessoais"
              onPress={() => navigation.navigate("EditProfile", { user })}
            />
            <MenuItem
              icon="card-outline"
              title="Métodos de Pagamento"
              subtitle="Gerir formas de recebimento"
              onPress={() => showMessage({ message: "Em Breve", description: "Funcionalidade disponível na próxima atualização.", type: "info", icon: "auto" })}
            />
            <MenuItem
              icon="shield-checkmark-outline"
              title="Privacidade e Segurança"
              onPress={() => showMessage({ message: "Em Breve", description: "Funcionalidade disponível na próxima atualização.", type: "info", icon: "auto" })}
            />
            <MenuItem
              icon="help-circle-outline"
              title="Ajuda e Suporte"
              onPress={() => showMessage({ message: "Em Breve", description: "Funcionalidade disponível na próxima atualização.", type: "info", icon: "auto" })}
            />
          </View>

          <View style={styles.menuGroup}>
            <MenuItem
              icon="save-outline"
              title="Salvar Preferências"
              onPress={savePreferences}
            />
          </View>
        </View>

        {/* Botão de Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
          <Text style={styles.logoutText}>Sair da Conta</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.versionText}>Versão 1.0.0</Text>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray50,
  },
  profileHeader: {
    backgroundColor: "#FFF",
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  avatarContainer: {
    position: "relative",
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  premiumBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 4,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  levelText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  userSince: {
    fontSize: 12,
    color: "#999",
  },
  statsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 16,
    marginHorizontal: 6,
    borderLeftWidth: 4,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 12,
    color: "#666",
    marginLeft: 6,
    fontWeight: "500",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
  },
  vehicleSection: {
    padding: 16,
  },
  vehicleCard: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  vehicleHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  vehicleModel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginLeft: 8,
  },
  vehicleDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  vehicleDetail: {
    flexDirection: "row",
    alignItems: "center",
  },
  vehicleText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 6,
  },
  // ✅ NOVOS ESTILOS PARA STATUS DO REGISTO
  registrationStatus: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  registrationStatusText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
  },
  menuSection: {
    padding: 16,
  },
  menuGroup: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    marginBottom: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(127, 0, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: "#666",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 16,
    elevation: 4,
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF6B6B",
    marginLeft: 8,
  },
  footer: {
    alignItems: "center",
    padding: 20,
  },
  versionText: {
    fontSize: 12,
    color: "#999",
  },
});