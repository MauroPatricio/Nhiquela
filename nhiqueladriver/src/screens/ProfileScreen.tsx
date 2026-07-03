import { showMessage } from 'react-native-flash-message';
// @ts-nocheck
import React, { useState, useEffect } from 'react';
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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
// @ts-ignore
import { PieChart } from 'react-native-svg-charts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../styles/colors';
import { useAuth } from '../context/AuthContext';
import api, { API_BASE_URL } from '../api/apiConfig';

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
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // âœ… HELPER PARA IMAGENS
  const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('data:image')) return path;
    const baseUrl = API_BASE_URL.replace('/api', '');
    return path.startsWith('/') ? `${baseUrl}${path}` : `${baseUrl}/${path}`;
  };

  const getMemberSince = () => {
    // Tenta usar a data de aprovação, se não houver usa a criação
    const dateSource = user?.deliveryman?.approvedAt || user?.deliveryman?.updatedAt || user?.createdAt || user?.created_at || (user as any)?.date;
    if (dateSource) {
      const date = new Date(dateSource);
      if (!isNaN(date.getTime())) {
        return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(
          2,
          '0',
        )}/${date.getFullYear()}`;
      }
    }
    return '2024';
  };

  const userData = {
    name: user?.name || 'Motorista',
    email: user?.email || 'email@exemplo.com',
    phone: user?.phoneNumber ? `+258 ${user.phoneNumber}` : '+258 84 000 0000',
    level: user?.isDeliveryMan ? 'Motorista' : 'Passageiro',
    memberSince: getMemberSince(),
    totalTrips: 0,
    rating: '0.0',
    acceptanceRate: '0%',
    totalEarnings: '0 MT',
    vehicle: user?.deliveryman?.transport_type || 'Veículo não registado',
    licensePlate: user?.deliveryman?.transport_registration || 'Não definida',
    vehicleColor: user?.deliveryman?.transport_color || 'Não definida',
  };

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200, // Acelerado para remover sensação de carregamento lento
      useNativeDriver: true,
    }).start();

    loadUserPreferences();
  }, []);

  const loadUserPreferences = async () => {
    try {
      const preferences = await AsyncStorage.getItem('userPreferences');
      if (preferences) {
        const { notifications: notif, darkMode: dark, autoAccept: auto } = JSON.parse(preferences);
        setNotifications(notif);
        setDarkMode(dark);
        setAutoAccept(auto);
      }
    } catch (error) {
      console.error('Erro ao carregar preferências:', error);
    }
  };

  const savePreferences = async () => {
    try {
      const preferences = { notifications, darkMode, autoAccept };
      await AsyncStorage.setItem('userPreferences', JSON.stringify(preferences));
      showMessage({
        message: '✅ Sucesso',
        description: 'Preferências salvas com sucesso!',
        type: 'success',
        icon: 'auto',
        duration: 3000,
      });
    } catch (error) {
      showMessage({
        message: '❌ Erro',
        description: 'Não foi possível salvar as preferências.',
        type: 'danger',
        icon: 'auto',
        duration: 3000,
      });
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  // âœ… FUNÃ‡ÃƒO PARA OBTER FOTO DO PERFIL
  const getProfileImageSource = (): { uri: string } => {
    const deliverymanPhoto = user?.deliveryman?.photo;
    const userPhoto = user?.photo;

    let imageUri = deliverymanPhoto || userPhoto;

    if (!imageUri) {
      return { uri: 'https://via.placeholder.com/150/007bff/ffffff?text=DR' };
    }

    // âœ… LIDAR COM BASE64 OU URL
    if (typeof imageUri === 'string' || imageUri instanceof String) {
      const uriStr = String(imageUri);
      if (uriStr.startsWith('data:image') || uriStr.startsWith('http')) {
        return { uri: uriStr };
      }
      if (uriStr.startsWith('/')) {
        return { uri: getImageUrl(uriStr) };
      }
      if (uriStr.length > 100 && !uriStr.startsWith('data:') && !uriStr.startsWith('http')) {
        return { uri: `data:image/jpeg;base64,${uriStr}` };
      }
      // Se nÃ£o for nada do acima, assume-se que Ã© um caminho relativo
      return { uri: getImageUrl(uriStr) };
    }

    return { uri: 'https://via.placeholder.com/150/007bff/ffffff?text=DR' };
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
          trackColor={{ false: '#767577', true: COLORS.primary + '80' }}
          thumbColor={value ? COLORS.primary : '#f4f3f4'}
        />
      ) : (
        <Ionicons name="chevron-forward" size={20} color="#666" />
      )}
    </TouchableOpacity>
  );

  const imageSource = getProfileImageSource();

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <LinearGradient colors={COLORS.gradientDark} style={styles.headerGradient}>
        <View style={styles.topHeader}>
          <Text style={styles.screenTitle}>Meu Perfil</Text>
        </View>

        {/* Header do Perfil */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image
              source={imageSource}
              style={styles.avatar}
              onError={(error) => console.log('âŒ Erro ao carregar imagem:', error)}
            />
            <View style={styles.premiumBadge}>
              <Ionicons
                name={user?.isDeliveryMan ? 'car-sport' : 'diamond'}
                size={16}
                color={user?.isDeliveryMan ? COLORS.success : '#FFD700'}
              />
            </View>
          </View>

          <View style={styles.profileInfo}>
            <Text style={[styles.userName, { color: '#FFF' }]}>{userData.name}</Text>
            <View
              style={[
                styles.levelBadge,
                {
                  backgroundColor: user?.isDeliveryMan
                    ? 'rgba(76, 217, 100, 0.2)'
                    : 'rgba(255, 215, 0, 0.2)',
                },
              ]}
            >
              <Ionicons
                name={user?.isDeliveryMan ? 'car-sport' : 'star'}
                size={14}
                color={user?.isDeliveryMan ? COLORS.success : '#FFD700'}
              />
              <Text
                style={[
                  styles.levelText,
                  { color: user?.isDeliveryMan ? COLORS.success : '#FFD700' },
                ]}
              >
                {userData.level}
              </Text>
            </View>

            {/* ðŸ”¥ MOSTRAR SALDO (CARTEIRA) NO TOPO COM DADOS GLOBAIS */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 4, backgroundColor: 'rgba(39, 174, 96, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' }}>
              <Ionicons name="wallet" size={16} color={COLORS.success} style={{ marginRight: 6 }} />
              <Text style={{ color: COLORS.success, fontSize: 16, fontWeight: 'bold' }}>
                Saldo: {user?.deliveryman?.balance || 'MT 0.00'}
              </Text>
            </View>

            <Text style={[styles.userEmail, { color: 'rgba(255,255,255,0.8)' }]}>{userData.email}</Text>
            <Text style={[styles.userPhone, { color: 'rgba(255,255,255,0.8)' }]}>{userData.phone}</Text>
            <Text style={[styles.userSince, { color: 'rgba(255,255,255,0.6)' }]}>Membro desde: {userData.memberSince}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >



        {/* EstatÃ­sticas */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>EstatÃ­sticas</Text>
          <View style={styles.statsGrid}>
            {user?.isDeliveryMan && (
              <View style={[styles.statCard, { backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', padding: 10 }]}>
                <View style={{ width: 100, height: 100, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
                  <PieChart
                    style={{ height: 100, width: 100 }}
                    valueAccessor={({ item }: { item: any }) => item.value}
                    data={[
                      { key: 1, value: 20, svg: { fill: '#7F00FF' } }, // Roxo
                      { key: 2, value: 20, svg: { fill: '#007AFF' } }, // Azul
                      { key: 3, value: 20, svg: { fill: '#FF3B30' } }, // Vermelho
                      { key: 4, value: 20, svg: { fill: '#FFCC00' } }, // Amarelo
                      { key: 5, value: 20, svg: { fill: '#34C759' } }, // Verde
                    ]}
                    spacing={0}
                    innerRadius={'75%'}
                    outerRadius={'100%'}
                    padAngle={0.05}
                  />
                  <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1E1E24' }}>
                      {userData.acceptanceRate || '0%'}
                    </Text>
                    <Text style={{ fontSize: 10, color: '#666' }}>AceitaÃ§Ã£o</Text>
                  </View>
                </View>
              </View>
            )}
            <StatCard
              title="Viagens"
              value={userData.totalTrips}
              icon="car-outline"
              color={COLORS.primary}
            />
            <StatCard
              title="AvaliaÃ§Ã£o"
              value={userData.rating}
              icon="star-outline"
              color="#FFB800"
            />
            {user?.isDeliveryMan && (
              <StatCard
                title="Ganhos Totais"
                value={userData.totalEarnings}
                icon="wallet-outline"
                color="#27AE60"
              />
            )}
            {!user?.isDeliveryMan && (
              <StatCard
                title="NÃ­vel"
                value={userData.level}
                icon="trophy-outline"
                color="#27AE60"
              />
            )}
            <StatCard
              title="Membro Desde"
              value={userData.memberSince}
              icon="calendar-outline"
              color="#34C759"
            />
          </View>
        </View>

        {/* âœ… INFORMACOES DO VEÃCULO - APENAS PARA MOTORISTAS */}
        {user?.isDeliveryMan && (
          <View style={styles.vehicleSection}>
            <Text style={styles.sectionTitle}>O Seu VeÃ­culo</Text>
            
            <View style={styles.modernVehicleCard}>
              <View style={styles.vehicleImagePlaceholder}>
                <Ionicons name="car-sport" size={60} color={COLORS.primary} />
              </View>
              
              <View style={styles.modernVehicleInfo}>
                <Text style={styles.modernVehicleModel}>{userData.vehicle}</Text>
                
                <View style={styles.licensePlateBox}>
                  <View style={styles.licensePlateHeader}>
                    <Text style={styles.licensePlateCountry}>MZ</Text>
                  </View>
                  <Text style={styles.licensePlateText}>{userData.licensePlate}</Text>
                </View>

                {userData.vehicleColor !== 'NÃ£o definida' && (
                  <View style={styles.colorBadge}>
                    <Ionicons name="color-palette" size={14} color="#666" style={{ marginRight: 4 }} />
                    <Text style={styles.colorText}>{userData.vehicleColor}</Text>
                  </View>
                )}

                <View style={[styles.colorBadge, { backgroundColor: '#E0F2FE', marginTop: 6 }]}>
                  <Ionicons name="cash-outline" size={14} color="#0284C7" style={{ marginRight: 4 }} />
                  <Text style={[styles.colorText, { color: '#0284C7', fontWeight: 'bold' }]}>
                    PreÃ§o cobrado: {user?.deliveryman?.allowCustomPrice && user?.deliveryman?.customPrice 
                      ? `${user.deliveryman.customPrice} MT / km` 
                      : 'PreÃ§o PadrÃ£o do Sistema'}
                  </Text>
                </View>
              </View>

              {/* âœ… BOTÃƒO VER DOCUMENTOS */}
              <TouchableOpacity
                style={[styles.modernDocsButton, { width: '100%', marginBottom: 16 }]}
                onPress={() => setShowDocsModal(true)}
              >
                <Ionicons name="document-text-outline" size={20} color="#FFF" />
                <Text style={styles.modernDocsText}>Ver Documentos do VeÃ­culo</Text>
              </TouchableOpacity>

              {/* âœ… STATUS DO REGISTO DO MOTORISTA */}
              {user?.deliveryman?.register_conformance && (
                <View style={styles.modernRegistrationStatus}>
                  <Ionicons
                    name={
                      user.deliveryman.register_conformance === 'CONFORMANCE'
                        ? 'shield-checkmark'
                        : user.deliveryman.register_conformance === 'INCONFORMANCE'
                        ? 'shield-half'
                        : 'time'
                    }
                    size={16}
                    color={
                      user.deliveryman.register_conformance === 'CONFORMANCE'
                        ? COLORS.success
                        : user.deliveryman.register_conformance === 'INCONFORMANCE'
                        ? COLORS.error
                        : COLORS.warning
                    }
                  />
                  <Text
                    style={[
                      styles.modernRegistrationText,
                      {
                        color:
                          user.deliveryman.register_conformance === 'CONFORMANCE'
                            ? COLORS.success
                            : user.deliveryman.register_conformance === 'INCONFORMANCE'
                            ? COLORS.error
                            : COLORS.warning,
                      },
                    ]}
                  >
                    {user.deliveryman.register_conformance === 'CONFORMANCE'
                      ? 'Disponível'
                      : user.deliveryman.register_conformance === 'INCONFORMANCE'
                      ? 'Rejeitado'
                      : 'Em AnÃ¡lise'}
                  </Text>
                </View>
              )}
            </View>
            </View>
        )}

        <View style={styles.menuSection}>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="person-outline"
              title="Editar Perfil"
              subtitle="Alterar informaÃ§Ãµes pessoais"
              onPress={() => navigation.navigate('EditProfile', { user })}
            />
            <MenuItem
              icon="wallet-outline"
              title="Carteira & Ganhos"
              subtitle="Ver histÃ³rico e saldo"
              onPress={() => navigation.navigate('Wallet')}
            />
            <MenuItem
              icon="shield-checkmark-outline"
              title="Privacidade e SeguranÃ§a"
              onPress={() =>
                showMessage({
                  message: 'Em Breve',
                  description: 'Funcionalidade disponÃ­vel na prÃ³xima atualizaÃ§Ã£o.',
                  type: 'info',
                  icon: 'auto',
                })
              }
            />
            <MenuItem
              icon="help-circle-outline"
              title="Ajuda e Suporte"
              onPress={() =>
                showMessage({
                  message: 'Em Breve',
                  description: 'Funcionalidade disponÃ­vel na prÃ³xima atualizaÃ§Ã£o.',
                  type: 'info',
                  icon: 'auto',
                })
              }
            />
          </View>

          <View style={styles.menuGroup}>
            <MenuItem icon="save-outline" title="Salvar PreferÃªncias" onPress={savePreferences} />
          </View>
        </View>

        {/* BotÃ£o de Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
          <Text style={styles.logoutText}>Sair da Conta</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.versionText}>VersÃ£o 1.0.0</Text>
        </View>
      </ScrollView>

      {/* âœ… MODAL DE DOCUMENTOS */}
      <Modal
        visible={showDocsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDocsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Meus Documentos</Text>
            <TouchableOpacity onPress={() => setShowDocsModal(false)} style={styles.closeModalBtn}>
              <Ionicons name="close" size={28} color="#1A1A1A" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {user?.deliveryman?.license_front && (
              <View style={styles.docItem}>
                <Text style={styles.docTitle}>Carta de ConduÃ§Ã£o (Frente)</Text>
                <Image
                  source={{ uri: getImageUrl(user.deliveryman.license_front) }}
                  style={styles.docImage}
                  resizeMode="contain"
                />
              </View>
            )}
            {user?.deliveryman?.license_back && (
              <View style={styles.docItem}>
                <Text style={styles.docTitle}>Carta de ConduÃ§Ã£o (Verso)</Text>
                <Image
                  source={{ uri: getImageUrl(user.deliveryman.license_back) }}
                  style={styles.docImage}
                  resizeMode="contain"
                />
              </View>
            )}
            {user?.deliveryman?.vihicle_logbook && (
              <View style={styles.docItem}>
                <Text style={styles.docTitle}>Livrete do VeÃ­culo</Text>
                <Image
                  source={{ uri: getImageUrl(user.deliveryman.vihicle_logbook) }}
                  style={styles.docImage}
                  resizeMode="contain"
                />
              </View>
            )}
            {user?.deliveryman?.vihicle_inspection && (
              <View style={styles.docItem}>
                <Text style={styles.docTitle}>InspeÃ§Ã£o</Text>
                <Image
                  source={{ uri: getImageUrl(user.deliveryman.vihicle_inspection) }}
                  style={styles.docImage}
                  resizeMode="contain"
                />
              </View>
            )}
            {user?.deliveryman?.vihicle_Insurance && (
              <View style={styles.docItem}>
                <Text style={styles.docTitle}>Seguro</Text>
                <Image
                  source={{ uri: getImageUrl(user.deliveryman.vihicle_Insurance) }}
                  style={styles.docImage}
                  resizeMode="contain"
                />
              </View>
            )}
            {user?.deliveryman?.vihicle_picture && (
              <View style={styles.docItem}>
                <Text style={styles.docTitle}>Foto da Viatura</Text>
                <Image
                  source={{ uri: getImageUrl(user.deliveryman.vihicle_picture) }}
                  style={styles.docImage}
                  resizeMode="contain"
                />
              </View>
            )}

            {!user?.deliveryman?.license_front && !user?.deliveryman?.vihicle_picture && (
              <View style={{ alignItems: 'center', marginTop: 50 }}>
                <Ionicons name="document-text-outline" size={60} color="#ccc" />
                <Text style={{ color: '#999', marginTop: 10 }}>Nenhum documento encontrado.</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* ðŸ”¥ MODAL DE LOGOUT PREMIUM */}
      <Modal visible={showLogoutModal} transparent animationType="fade">
        <View style={styles.logoutModalOverlay}>
          <View style={styles.logoutModalContainer}>
            <View style={styles.logoutModalIconContainer}>
              <Ionicons name="log-out-outline" size={40} color="#E74C3C" />
            </View>
            <Text style={styles.logoutModalTitle}>Sair da Conta</Text>
            <Text style={styles.logoutModalText}>
              Tem certeza que deseja terminar a sessÃ£o atual? DeixarÃ¡ de receber pedidos de viagem atÃ© voltar a entrar.
            </Text>
            
            <View style={styles.logoutModalButtons}>
              <TouchableOpacity 
                style={[styles.logoutModalBtn, styles.logoutModalBtnCancel]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.logoutModalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.logoutModalBtn, styles.logoutModalBtnConfirm]}
                onPress={confirmLogout}
              >
                <Text style={styles.logoutModalBtnConfirmText}>Sim, Sair</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray50, // Mesma cor do Home
  },
  headerGradient: {
    paddingTop: 40,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 10,
    elevation: 5,
    shadowColor: '#9D4EDD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  topHeader: {
    paddingHorizontal: 24,
    paddingBottom: 10,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFF',
  },
  profileHeader: {
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
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
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  scoreChartContainer: {
    backgroundColor: '#1E1E24',
    padding: 20,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 10,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  chartWrapper: {
    position: 'relative',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartPercentageText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFF',
  },
  chartSubtitleText: {
    fontSize: 14,
    color: '#AAA',
    marginTop: 4,
  },
  userPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  userSince: {
    fontSize: 12,
    color: '#999',
  },
  statsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '47%',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  // ðŸ”¥ ESTILOS PARA O MODAL DE LOGOUT PREMIUM
  logoutModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutModalContainer: {
    backgroundColor: '#FFF',
    width: '85%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  logoutModalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoutModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  logoutModalText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  logoutModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  logoutModalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutModalBtnCancel: {
    backgroundColor: '#F2F3F4',
    marginRight: 8,
  },
  logoutModalBtnCancelText: {
    color: '#555',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutModalBtnConfirm: {
    backgroundColor: '#E74C3C',
    marginLeft: 8,
    shadowColor: '#E74C3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  logoutModalBtnConfirmText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  vehicleSection: {
    padding: 16,
  },
  modernVehicleCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  vehicleImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(30, 60, 114, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modernVehicleInfo: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  modernVehicleModel: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  licensePlateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  licensePlateHeader: {
    backgroundColor: '#0033A0',
    paddingHorizontal: 8,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  licensePlateCountry: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  licensePlateText: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2,
    paddingHorizontal: 16,
    color: '#000',
  },
  colorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  colorText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  modernRegistrationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#F9FAFC',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    width: '100%',
  },
  modernRegistrationText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modernDocsButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modernDocsText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  menuSection: {
    padding: 16,
  },
  menuGroup: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(127, 0, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    padding: 20,
  },
  versionText: {
    fontSize: 12,
    color: '#999',
  },
  viewDocsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(127, 0, 255, 0.08)',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    justifyContent: 'center',
  },
  viewDocsText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  closeModalBtn: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
    paddingBottom: 40,
  },
  docItem: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  docTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  docImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  odometerContainer: {
    backgroundColor: '#1E1E2C',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    marginTop: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  odometerTitle: {
    color: '#A0A0B0',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  odometerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F0F1A',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333344',
  },
  odometerDigitBox: {
    backgroundColor: '#2A2A3C',
    width: 36,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    borderRadius: 6,
    borderTopWidth: 1,
    borderTopColor: '#44445A',
    borderBottomWidth: 2,
    borderBottomColor: '#11111A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
  },
  odometerDigit: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  odometerUnit: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  odometerSubtitle: {
    color: '#888899',
    fontSize: 12,
    marginTop: 16,
    textAlign: 'center',
  },
});


