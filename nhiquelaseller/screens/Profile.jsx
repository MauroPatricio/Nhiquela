import { showMessage } from "react-native-flash-message";
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  ScrollView, Alert, Switch, ActivityIndicator, Modal, StatusBar, FlatList, DeviceEventEmitter
} from 'react-native';
import React, { useState, useCallback } from 'react';
import { Ionicons, MaterialCommunityIcons, AntDesign } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../hooks/createConnectionApi';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SIZES, RADIUS, SHADOWS } from '../constants/theme';

const Profile = () => {
  const navigation = useNavigation();
  const [userData, setUserData] = useState(null);
  const [userLogin, setUserLogin] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(false);

  React.useEffect(() => {
    const listener = DeviceEventEmitter.addListener('userDataUpdated', (newUserData) => {
      setUserData(prev => ({
        ...prev,
        isApproved: newUserData?.isApproved,
        isBanned: newUserData?.isBanned,
        banReason: newUserData?.banReason
      }));
    });
    return () => listener.remove();
  }, []);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingStore, setUpdatingStore] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [subcategories, setSubcategories] = useState([]);
  const [subCategoryModalVisible, setSubCategoryModalVisible] = useState(false);
  const [isUpdatingSubCategory, setIsUpdatingSubCategory] = useState(false);

  const handleUpdatePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showMessage({ message: 'Erro', description: 'Permissão para acessar a galeria é necessária!', type: 'danger', icon: 'auto' });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setIsUploadingPhoto(true);
        const uri = result.assets[0].uri;
        const bodyFormData = new FormData();
        bodyFormData.append('file', { uri, name: 'image.jpg', type: 'image/jpeg' });

        // 1. Upload to storage
        const { data } = await api.post('upload', bodyFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const newLogoUrl = data.secure_url;

        // 2. Update user profile
        const id = await AsyncStorage.getItem('id');
        const updateRes = await api.put(
          `/users/profile`,
          { isSeller: true, sellerLogo: newLogoUrl },
          { headers: { Authorization: `Bearer ${userData.token}` } }
        );

        if (updateRes?.status === 200) {
          // 3. Update local state
          const updatedUser = { ...userData, seller: { ...userData.seller, logo: newLogoUrl } };
          await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
          setUserData(updatedUser);
          showMessage({ message: 'Sucesso', description: 'Foto de perfil atualizada!', type: 'success', icon: 'auto' });
        }
      }
    } catch (error) {
      console.error(error);
      showMessage({ message: 'Erro', description: 'Não foi possível atualizar a foto.', type: 'danger', icon: 'auto' });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const fetchPendingWithdrawals = async (user) => {
    if (!user?.token) return;
    try {
      const response = await api.get('/wallet/pending', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setPendingCount(response.data.length || 0);
    } catch (error) {
      console.error("Erro ao buscar solicitações pendentes:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const loadUserAndPending = async () => {
        const user = await checkIfUserExist();
        if (user?.isAdmin) fetchPendingWithdrawals(user);
        
        try {
          const { data } = await api.get('/provider-subcategories');
          const businessSubcats = (data || []).filter(
            (sub) => sub.providerTypeId?.classificationId?.name === 'BUSINESS'
          );
          setSubcategories(businessSubcats);
        } catch (error) {
          console.error('Erro ao buscar subcategorias:', error.message);
        }
      };
      loadUserAndPending();
    }, [])
  );

  const handleUpdateSubCategory = async (subcategoryId) => {
    setSubCategoryModalVisible(false);
    setIsUpdatingSubCategory(true);
    try {
      const response = await api.put(
        `/users/profile`,
        { isSeller: true, tipoEstabelecimento: subcategoryId },
        { headers: { Authorization: `Bearer ${userData?.token}` } }
      );

      if (response?.status === 200) {
        const selectedSub = subcategories.find(s => s._id === subcategoryId);
        const updatedUser = { ...userData, seller: { ...userData.seller, tipoEstabelecimento: selectedSub || subcategoryId } };
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
        setUserData(updatedUser);
        showMessage({ message: 'Sucesso', description: 'Subcategoria atualizada com sucesso!', type: 'success', icon: 'auto' });
      }
    } catch (error) {
      console.error('Erro ao atualizar subcategoria:', error);
      showMessage({ message: 'Erro', description: 'Não foi possível atualizar a subcategoria.', type: 'danger', icon: 'auto' });
    } finally {
      setIsUpdatingSubCategory(false);
    }
  };

  const checkIfUserExist = async () => {
    try {
      const storedUserId = await AsyncStorage.getItem('id');
      if (storedUserId) {
        try {
          const { data } = await api.get(`/users/${storedUserId}`);
          
          // Preserve token
          const storedUserDataStr = await AsyncStorage.getItem('userData');
          const token = storedUserDataStr ? JSON.parse(storedUserDataStr).token : null;
          const updatedData = { ...data, token };

          setUserData(updatedData);
          setIsStoreOpen(updatedData.seller?.openstore || false);
          setUserLogin(true);
          setIsAdmin(updatedData.isAdmin);
          await AsyncStorage.setItem('userData', JSON.stringify(updatedData));
          return updatedData;
        } catch (apiError) {
          const is404 = (apiError.response && apiError.response.status === 404) || (apiError.message && apiError.message.includes('404'));
          if (is404) {
            console.log(`⚠️ Usuário não encontrado no backend (404) no perfil. Fazendo logout... ID: ${storedUserId}`);
            await AsyncStorage.multiRemove(['id', 'userData']);
            navigation.navigate('Login');
            return null;
          }
          const storedUserData = await AsyncStorage.getItem('userData');
          if (storedUserData) {
            const parsedUserData = JSON.parse(storedUserData);
            if (parsedUserData._id === storedUserId) {
              setUserData(parsedUserData);
              setIsStoreOpen(parsedUserData.seller?.openstore || false);
              setUserLogin(true);
              setIsAdmin(parsedUserData.isAdmin);
              return parsedUserData;
            } else {
              navigation.navigate('Login');
            }
          } else {
            navigation.navigate('Login');
          }
        }
      } else {
        navigation.navigate('Login');
      }
    } catch (error) {
      console.log('Error verifying user:', error);
    } finally {
      setIsLoading(false);
    }
    return null;
  };

  const userLogout = async () => {
    setIsLoading(true);
    await AsyncStorage.removeItem('id');
    await AsyncStorage.removeItem('userData');
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    setIsLoading(false);
  };

  const logout = () => {
    Alert.alert("Sair", "Tem a certeza que deseja sair?", [
      { text: "Cancelar" },
      { text: "Sair", style: 'destructive', onPress: () => userLogout() },
    ]);
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const confirmDeleteAccount = async () => {
    setShowDeleteModal(false);
    setIsLoading(true);
    try {
      const id = await AsyncStorage.getItem('id');
      await api.delete(`/users/${id}`, {
        headers: { Authorization: `Bearer ${userData?.token}` }
      });
      await userLogout();
    } catch (error) {
      Alert.alert("Erro", "Não foi possível apagar a conta. Tente novamente.");
      setIsLoading(false);
    }
  };

  const deleteAccount = () => {
    setShowDeleteModal(true);
  };

  const toggleStoreStatus = async () => {
    setUpdatingStore(true);
    try {
      const id = await AsyncStorage.getItem('id');
      const newStatus = !isStoreOpen;
      const response = await api.patch(
        `/users/seller-status/${id}`,
        { isOpenStore: newStatus },
        { headers: { Authorization: `Bearer ${userData.token}` } }
      );
      if (response?.status === 200) {
        setIsStoreOpen(newStatus);
        const updatedUser = { ...userData, seller: { ...userData.seller, openstore: newStatus } };
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
        setUserData(updatedUser);
        showMessage({
          message: newStatus ? '✅ Loja aberta!' : '🔴 Loja fechada',
          type: newStatus ? 'success' : 'info',
          icon: 'auto',
          duration: 2500,
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar estado da loja:', error);
      const errMsg = error.response?.data?.message || 'Não foi possível atualizar o estado da loja.';
      showMessage({ 
        message: 'Aviso Financeiro', 
        description: errMsg, 
        type: "danger", 
        icon: "auto",
        duration: 5000 
      });
    } finally {
      setUpdatingStore(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>A carregar...</Text>
      </View>
    );
  }

  const MenuItem = ({ icon, iconType = 'material', label, onPress, right, danger }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIconBox, danger && styles.menuIconBoxDanger]}>
        {iconType === 'ionicons'
          ? <Ionicons name={icon} size={20} color={danger ? COLORS.error : COLORS.primary} />
          : iconType === 'antdesign'
            ? <AntDesign name={icon} size={20} color={danger ? COLORS.error : COLORS.primary} />
            : <MaterialCommunityIcons name={icon} size={20} color={danger ? COLORS.error : COLORS.primary} />
        }
      </View>
      <Text style={[styles.menuLabel, danger && { color: COLORS.error }]}>{label}</Text>
      <View style={styles.menuRight}>
        {right}
        <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerGlow} />
          <View style={styles.avatarSection}>
            <TouchableOpacity 
              style={styles.avatarWrapper} 
              onPress={handleUpdatePhoto} 
              activeOpacity={0.8}
              disabled={isUploadingPhoto || !userLogin}
            >
              {isUploadingPhoto ? (
                <View style={[styles.avatar, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#e0e0e0' }]}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                </View>
              ) : (
                <>
                  <Image 
                    source={userData?.seller?.logo ? { uri: userData.seller.logo } : require('../assets/default1.jpg')} 
                    style={styles.avatar} 
                  />
                  {userLogin && (
                    <View style={styles.cameraIconBadge}>
                      <Ionicons name="camera" size={12} color="#fff" />
                    </View>
                  )}
                </>
              )}
              <View style={[styles.storeBadge, { backgroundColor: isStoreOpen ? COLORS.success : COLORS.error }]}>
                <View style={styles.storeDot} />
              </View>
            </TouchableOpacity>
            <Text style={styles.name}>{userLogin ? userData.name : "Por favor faça login"}</Text>
            {userLogin && (
              <View style={styles.phonePill}>
                <Ionicons name="call-outline" size={14} color={COLORS.primaryLight} />
                <Text style={styles.phoneText}>{userData?.phoneNumber}</Text>
              </View>
            )}
            {userData?.seller?.name && (
              <View style={styles.storePill}>
                <MaterialCommunityIcons name="storefront-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.storeText}>{userData.seller.name}</Text>
              </View>
            )}
            {userData?.seller && (
              <View style={{ marginTop: 6, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: COLORS.textMuted, fontWeight: '500' }}>
                  {(userData.seller.tipoEstabelecimento?.name) || (typeof userData.seller.tipoEstabelecimento === 'string' ? userData.seller.tipoEstabelecimento : 'Comércio')} • {userData.seller.province?.name || userData.seller.province || 'Sem localização'}
                </Text>
                {userData.seller.address && (
                  <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 2 }}>
                    <Ionicons name="location-outline" size={11} /> {userData.seller.address}
                  </Text>
                )}
              </View>
            )}
            {userData?.createdAt && (
              <View style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 11, color: COLORS.textMuted }}>
                  Membro desde {new Date(userData.createdAt).toLocaleDateString('pt-PT')}
                </Text>
              </View>
            )}
            
            {userLogin && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: userData?.isBanned ? '#FEE2E2' : (userData?.isApproved ? '#DCFCE7' : '#FEF9C3'),
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                marginTop: 10,
                alignSelf: 'center',
              }}>
                <Ionicons 
                  name={userData?.isBanned ? "close-circle" : (userData?.isApproved ? "checkmark-circle" : "time")} 
                  size={14} 
                  color={userData?.isBanned ? '#DC2626' : (userData?.isApproved ? '#16A34A' : '#CA8A04')} 
                />
                <Text style={{
                  color: userData?.isBanned ? '#DC2626' : (userData?.isApproved ? '#16A34A' : '#CA8A04'),
                  fontSize: 12,
                  fontWeight: 'bold',
                  marginLeft: 6
                }}>
                  {userData?.isBanned ? "Bloqueado" : (userData?.isApproved ? "Ativo / Verificado" : "Pendente / Em Análise")}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Store Toggle */}
        {userLogin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Loja</Text>
            <View style={styles.card}>
              <View style={styles.storeRow}>
                <View style={[styles.menuIconBox, { backgroundColor: isStoreOpen ? COLORS.successBg : COLORS.errorBg }]}>
                  <MaterialCommunityIcons name="store" size={20} color={isStoreOpen ? COLORS.success : COLORS.error} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.menuLabel}>Estado da Loja</Text>
                  <Text style={[styles.storeStatus, { color: isStoreOpen ? COLORS.success : COLORS.error }]}>
                    {isStoreOpen ? '🟢 Aberta — A receber pedidos' : '🔴 Fechada — Não recebe pedidos'}
                  </Text>
                </View>
                <Switch
                  value={isStoreOpen}
                  onValueChange={toggleStoreStatus}
                  trackColor={{ false: COLORS.surface2, true: COLORS.primary }}
                  thumbColor={isStoreOpen ? '#fff' : COLORS.textMuted}
                  disabled={updatingStore}
                />
              </View>
              
              <View style={{ height: 1, backgroundColor: COLORS.surface2, marginVertical: 10 }} />
              
              <MenuItem
                  icon="store-cog"
                  iconType="material-community"
                  label="Tipo de estabelecimento"
                  onPress={() => setSubCategoryModalVisible(true)}
                  right={
                    <Text style={{ color: COLORS.textMuted, fontSize: 12, marginRight: 8 }}>
                      {subcategories.find(s => 
                        s._id === userData?.seller?.tipoEstabelecimento?._id || 
                        s._id === userData?.seller?.tipoEstabelecimento ||
                        s.name === userData?.seller?.tipoEstabelecimento
                      )?.name || ""}
                    </Text>
                  }
                />
            </View>
          </View>
        )}

        {/* Menu */}
        {userLogin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Conta</Text>
            <View style={styles.card}>
              <MenuItem icon="wallet" label="Minha Carteira" onPress={() => navigation.navigate('Wallet')} />
              {isAdmin && (
                <MenuItem
                  icon="bank-transfer"
                  label="Autorizar Levantamentos"
                  onPress={() => navigation.navigate('WithdrawalRequests')}
                  right={pendingCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{pendingCount}</Text>
                    </View>
                  )}
                />
              )}
            </View>
          </View>
        )}

        {userLogin && (
          <View style={styles.section}>
            <View style={styles.card}>
              <MenuItem icon="logout" iconType="antdesign" label="Terminar Sessão" onPress={logout} />
            </View>
          </View>
        )}

        {userLogin && (
          <View style={styles.section}>
            <TouchableOpacity onPress={deleteAccount} activeOpacity={0.85}>
              <LinearGradient
                colors={['#fff0f0', '#ffe4e4']}
                style={styles.premiumDeleteBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.premiumDeleteIconBox}>
                  <AntDesign name="delete" size={20} color="#d32f2f" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.premiumDeleteTitle}>Apagar Conta</Text>
                  <Text style={styles.premiumDeleteSub}>Ação permanente e irreversível</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#d32f2f" style={{ opacity: 0.6 }} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {!userLogin && (
          <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.navigate('Login')}>
              <Ionicons name="log-in-outline" size={20} color="#fff" />
              <Text style={styles.loginBtnText}>Entrar</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ marginBottom: 100 }} />
      </ScrollView>

      {/* Overlay de actualização */}
      <Modal transparent visible={updatingStore || isUpdatingSubCategory}>
        <View style={styles.overlay}>
          <View style={styles.overlayBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.overlayText}>
              {updatingStore ? 'A actualizar estado da loja...' : 'A actualizar subcategoria...'}
            </Text>
          </View>
        </View>
      </Modal>

      {/* Modal Subcategoria (Premium CSS) */}
      <Modal visible={subCategoryModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={[styles.modalIconContainer, { backgroundColor: COLORS.primaryLight + '20', borderColor: COLORS.primaryLight + '10' }]}>
              <MaterialCommunityIcons name="storefront" size={32} color={COLORS.primary} />
            </View>
            <Text style={styles.modalTitle}>Subcategoria de Loja</Text>
            <Text style={[styles.modalDescription, { marginBottom: 15 }]}>
              Selecione o tipo de negócio que melhor descreve a sua loja. Isto ajuda os clientes a encontrá-lo.
            </Text>
            
            <View style={{ width: '100%', maxHeight: 300, marginBottom: 20 }}>
              <FlatList
                data={subcategories}
                keyExtractor={(item) => item._id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const isSelected = 
                    (userData?.seller?.tipoEstabelecimento?._id || userData?.seller?.tipoEstabelecimento) === item._id ||
                    userData?.seller?.tipoEstabelecimento === item.name;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.modalListItem,
                        { borderRadius: RADIUS.sm, marginBottom: 8, borderWidth: 1, borderColor: isSelected ? COLORS.primary : COLORS.surface2 },
                        isSelected && { backgroundColor: COLORS.primaryLight + '15' }
                      ]}
                      onPress={() => handleUpdateSubCategory(item._id)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isSelected ? COLORS.primary : COLORS.surface, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                          <MaterialCommunityIcons name={item.iconUrl || "store"} size={20} color={isSelected ? '#fff' : COLORS.textSecondary} />
                        </View>
                        <Text style={[
                          styles.modalListItemText,
                          { fontWeight: isSelected ? '700' : '500' },
                          isSelected && styles.modalListItemTextSelected
                        ]}>
                          {item.name}
                        </Text>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalCancelBtn} 
                onPress={() => setSubCategoryModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Apagar Conta (Premium CSS) */}
      <Modal transparent visible={showDeleteModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalIconContainer}>
              <AntDesign name="warning" size={32} color="#fff" />
            </View>
            <Text style={styles.modalTitle}>Apagar Conta?</Text>
            <Text style={styles.modalDescription}>
              Tem a certeza absoluta que deseja apagar a sua conta? Esta ação é permanente e não poderá ser desfeita. Todos os seus produtos ficarão ocultos.
            </Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalCancelBtn} 
                onPress={() => setShowDeleteModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={confirmDeleteAccount}
                style={{ flex: 1 }}
              >
                <LinearGradient
                  colors={['#f44336', '#d32f2f']}
                  style={styles.modalConfirmBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.modalConfirmText}>Sim, Apagar</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default React.memo(Profile);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    marginTop: 12,
    fontSize: SIZES.sm,
  },
  header: {
    backgroundColor: COLORS.surface,
    paddingBottom: 30,
    marginBottom: 20,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerGlow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: COLORS.primaryGlow,
    top: -150,
    alignSelf: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    paddingTop: 40,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 14,
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 0,
    left: 10,
    backgroundColor: COLORS.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  storeBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  name: {
    fontSize: SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  phonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryGlow,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    gap: 6,
    marginBottom: 8,
  },
  phoneText: {
    color: COLORS.primaryLight,
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  storePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  storeText: {
    color: COLORS.text,
    fontSize: SIZES.sm,
    fontWeight: 'bold',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  storeStatus: {
    fontSize: SIZES.sm,
    marginTop: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconBoxDanger: {
    backgroundColor: COLORS.errorBg,
  },
  menuLabel: {
    flex: 1,
    marginLeft: 14,
    fontSize: SIZES.base,
    fontWeight: '500',
    color: COLORS.text,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    backgroundColor: COLORS.error,
    borderRadius: RADIUS.full,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 50,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: SIZES.md,
    fontWeight: '600',
    marginLeft: 8,
  },
  premiumDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#ffcdd2',
    ...SHADOWS.sm,
  },
  premiumDeleteIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffebee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumDeleteTitle: {
    color: '#d32f2f',
    fontSize: SIZES.base,
    fontWeight: '700',
    marginBottom: 2,
  },
  premiumDeleteSub: {
    color: '#c62828',
    fontSize: SIZES.xs,
    opacity: 0.8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#d32f2f',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 4,
    borderColor: '#ffebee',
    ...SHADOWS.sm,
  },
  modalTitle: {
    fontSize: SIZES.xl,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    width: '100%',
    paddingHorizontal: 10,
  },
  modalCloseBtn: {
    padding: 5,
  },
  modalListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface2,
    width: '100%',
  },
  modalListItemSelected: {
    backgroundColor: COLORS.primaryLight + '15',
  },
  modalListItemText: {
    fontSize: SIZES.md,
    color: COLORS.text,
  },
  modalListItemTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  modalDescription: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    height: 54,
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelText: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    height: 54,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  modalConfirmText: {
    color: '#fff',
    fontSize: SIZES.md,
    fontWeight: '700',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayBox: {
    backgroundColor: COLORS.surfaceCard,
    padding: 30,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.lg,
  },
  overlayText: {
    color: COLORS.textSecondary,
    marginTop: 14,
    fontSize: SIZES.sm,
    fontWeight: '500',
  },
});
