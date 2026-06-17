import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AntDesign, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const Profile = () => {
  const navigation = useNavigation();
  const [userData, setUserData] = useState(null);
  const [userLogin, setUserLogin] = useState(false);

  useEffect(() => {
    checkIfUserExist();
  }, []);

  const checkIfUserExist = async () => {
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      const storedUserId = await AsyncStorage.getItem('id');

      if (storedUserData && storedUserId) {
        const parsedUserData = JSON.parse(storedUserData);

        if (parsedUserData._id === storedUserId) {
          setUserData(parsedUserData);
          setUserLogin(true);
        } else {
          console.warn('⚠️ ID inconsistente entre userData e id');
        }
      } else {
        console.log('⚠️ Usuário não está logado');
      }
    } catch (error) {
      console.error('❌ Erro ao verificar se o usuário existe:', error);
    }
  };

  const userLogout = async () => {
    try {
      await AsyncStorage.removeItem('userData');
      await AsyncStorage.removeItem('id');

      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Erro ao sair:', error);
      navigation.replace('Login');
    }
  };

  const logout = () => {
    Alert.alert(
      "Sair da Conta 🚪",
      "Tem a certeza que deseja terminar a sua sessão?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Sair", style: "destructive", onPress: () => userLogout() }
      ]
    );
  };

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        paddingBottom: 120, // espaço confortável para a tab flutuante
        backgroundColor: '#F9FAFB',
      }}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar style="light" />

      {/* 1. TOP PREMIUM HEADER BACKDROP */}
      <LinearGradient
        colors={['#1E293B', '#0F172A']} // Tom escuro neutro que harmoniza com qualquer foto
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerBackdrop}
      >
        {/* Floating rounded Brand Logo Container */}
        <View style={styles.logoBadgeContainer}>
          <Image
            source={require('../assets/nhiquela2.png')}
            style={styles.logoBadge}
            resizeMode="contain"
          />
        </View>
      </LinearGradient>

      {/* 2. MAIN USER CARD AND DATA WRAPPER */}
      <View style={styles.profileContainer}>
        {/* User Avatar */}
        <Image
          source={require('../assets/default1.jpg')}
          style={styles.avatar}
        />

        {/* User Name */}
        <Text style={styles.name}>
          {userLogin ? userData?.name : "Olá, Visitante!"}
        </Text>

        <Text style={styles.subtitle}>
          {userLogin ? "Cliente Registado" : "Faça login para realizar pedidos e gerir as suas entregas"}
        </Text>

        {/* 3. CONDITIONAL BODY SECTIONS */}
        {userLogin ? (
          <View style={{ width: '100%' }}>
            {/* Personal Details Information Card */}
            <View style={styles.infoCard}>
              <Text style={styles.cardSectionTitle}>Informações de Perfil</Text>

              {/* Telefone */}
              <View style={styles.infoItem}>
                <View style={styles.infoIconWrap}>
                  <Ionicons name="phone-portrait" size={18} color="#9333EA" />
                </View>
                <View style={styles.infoTextWrap}>
                  <Text style={styles.infoLabel}>TELEFONE</Text>
                  <Text style={styles.infoValue}>{userData?.phoneNumber}</Text>
                </View>
              </View>

              <View style={styles.lineDivider} />

              {/* Email */}
              <View style={styles.infoItem}>
                <View style={styles.infoIconWrap}>
                  <Ionicons name="mail" size={18} color="#9333EA" />
                </View>
                <View style={styles.infoTextWrap}>
                  <Text style={styles.infoLabel}>E-MAIL</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>{userData?.email || 'Adicione um email'}</Text>
                </View>
              </View>

              <View style={styles.lineDivider} />

              {/* Endereço */}
              <View style={styles.infoItem}>
                <View style={styles.infoIconWrap}>
                  <Ionicons name="location" size={18} color="#9333EA" />
                </View>
                <View style={styles.infoTextWrap}>
                  <Text style={styles.infoLabel}>ENDEREÇO DE ENTREGA</Text>
                  <Text style={styles.infoValue} numberOfLines={2}>
                    {userData?.address ? `${userData.address}${userData.city ? ', ' + userData.city : ''}` : 'Nenhum endereço guardado'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Actions Card */}
            <View style={styles.infoCard}>
              <Text style={styles.cardSectionTitle}>Ações Rápidas</Text>

              <TouchableOpacity
                onPress={() => navigation.navigate('Pedidos')}
                style={styles.actionItem}
              >
                <Ionicons name="receipt" size={20} color="#9333EA" />
                <Text style={styles.actionText}>Meus Pedidos</Text>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </TouchableOpacity>

              <View style={styles.lineDivider} />

              <TouchableOpacity
                onPress={() => navigation.navigate('Favorite', { tab: 'products' })}
                style={styles.actionItem}
              >
                <Ionicons name="heart" size={20} color="#9333EA" />
                <Text style={styles.actionText}>Produtos Favoritos</Text>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </TouchableOpacity>

              <View style={styles.lineDivider} />

              <TouchableOpacity
                onPress={() => navigation.navigate('Favorite', { tab: 'sellers' })}
                style={styles.actionItem}
              >
                <Ionicons name="storefront" size={20} color="#9333EA" />
                <Text style={styles.actionText}>Lojas Favoritas</Text>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Logout Button Wrap */}
            <TouchableOpacity onPress={logout} activeOpacity={0.8} style={styles.logoutButton}>
              <AntDesign name="logout" size={20} color="#EF4444" style={{ marginRight: 8 }} />
              <Text style={styles.logoutButtonText}>Sair da Conta</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Logged Out Welcome & Login Redirect Card */
          <View style={{ width: '100%', alignItems: 'center' }}>
            <View style={styles.infoCard}>
              <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                <MaterialCommunityIcons name="shield-lock-outline" size={50} color="#94A3B8" />
                <Text style={styles.loginPromptTitle}>Acesso Restrito</Text>
                <Text style={styles.loginPromptSubtitle}>
                  Inicie sessão para poder realizar novos pedidos, acompanhar as suas entregas em tempo real e gerir o seu perfil de cliente.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.8}
              style={{ width: '100%', alignItems: 'center', marginTop: 10 }}
            >
              <LinearGradient
                colors={['#7F00FF', '#5900B3']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginBtn}
              >
                <Text style={styles.loginBtnText}>Iniciar Sessão</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default Profile;

const styles = StyleSheet.create({
  headerBackdrop: {
    height: 220,
    width: '100%',
    alignItems: 'center',
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
    position: 'relative',
    paddingTop: 50, // Dá espaço para a status bar e encosta a logo em cima
  },
  logoBadgeContainer: {
    width: 200,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  logoBadge: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 2.2 }], // Escala adequada para não cortar os bordos
  },
  profileContainer: {
    alignItems: "center",
    marginTop: -60, // Sobe mais a fotografia para sobrepor a curva de 50px do header
    width: "100%",
    paddingHorizontal: 20,
  },
  avatar: {
    height: 110,
    width: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    backgroundColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  name: {
    fontWeight: "800",
    fontSize: 22,
    marginTop: 14,
    color: '#1F2937',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 24,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1F2937',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(127, 0, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoTextWrap: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '700',
  },
  infoValue: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '600',
    marginTop: 2,
  },
  lineDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  actionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 14,
  },
  loginBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#7F00FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  loginBtnText: {
    fontWeight: "800",
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    height: 54,
    width: '100%',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  logoutButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
  },
  loginPromptTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 12,
  },
  loginPromptSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 10,
  },
});
