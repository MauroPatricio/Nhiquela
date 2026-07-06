import { Image } from 'expo-image';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Dimensions, ActivityIndicator, Modal, TextInput, FlatList } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AntDesign, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useToast } from 'react-native-toast-notifications';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { EXPO_GOOGLE_MAPS_APIKEY } from '@env';
import BottomSheetComponent from '../components/BottomSheetComponent';
import MapView, { Marker } from 'react-native-maps';

const { width } = Dimensions.get('window');

const Profile = () => {
  const navigation = useNavigation();
  const toast = useToast();
  const [userData, setUserData] = useState(null);
  const [userLogin, setUserLogin] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Saved Locations State
  const [modalVisible, setModalVisible] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [locationCoords, setLocationCoords] = useState(null);
  const [isSavingLocation, setIsSavingLocation] = useState(false);

  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const mapRef = useRef(null);
  const defaultCoord = { lat: -25.9692, lng: 32.5732 };

  const updatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.show("A senha deve ter pelo menos 6 caracteres", { type: 'warning' });
      return;
    }
    try {
      setIsSavingPassword(true);
      const { default: api } = await import('../hooks/createConnectionApi');
      const storedUserData = await AsyncStorage.getItem('userData');
      const parsed = JSON.parse(storedUserData);
      await api.put('/users/profile', { password: newPassword }, {
        headers: { authorization: `Bearer ${parsed.token}` }
      });
      toast.show("Senha atualizada com sucesso!", { type: 'success' });
      setPasswordModalVisible(false);
      setNewPassword('');
    } catch (e) {
      console.error(e);
      toast.show("Erro ao atualizar a senha", { type: 'danger' });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const saveLocation = async () => {
    if(!locationName || !locationCoords) {
        toast.show("Preencha o nome e selecione a posição no mapa", {type: 'warning'});
        return;
    }
    const finalAddress = locationAddress || `Localização (${locationCoords.lat.toFixed(4)}, ${locationCoords.lng.toFixed(4)})`;
    try {
        setIsSavingLocation(true);
        const { default: api } = await import('../hooks/createConnectionApi');
        const storedUserData = await AsyncStorage.getItem('userData');
        const parsed = JSON.parse(storedUserData);
        const res = await api.post('/users/profile/locations', {
            name: locationName,
            address: finalAddress,
            latitude: locationCoords.lat,
            longitude: locationCoords.lng
        }, {
            headers: { authorization: `Bearer ${parsed.token}` }
        });
        
        const updatedUser = { ...parsed, savedLocations: res.data.locations };
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
        setUserData(updatedUser);
        
        toast.show("Localização guardada com sucesso!", {type: 'success'});
        setModalVisible(false);
        setLocationName('');
        setLocationAddress('');
        setLocationCoords(null);
    } catch(e) {
        toast.show("Erro ao guardar", {type: 'danger'});
    } finally {
        setIsSavingLocation(false);
    }
  };

  const removeLocation = async (id) => {
    try {
        const { default: api } = await import('../hooks/createConnectionApi');
        const storedUserData = await AsyncStorage.getItem('userData');
        const parsed = JSON.parse(storedUserData);
        const res = await api.delete(`/users/profile/locations/${id}`, {
            headers: { authorization: `Bearer ${parsed.token}` }
        });
        
        const updatedUser = { ...parsed, savedLocations: res.data.locations };
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
        setUserData(updatedUser);
        
        toast.show("Removido com sucesso!", {type: 'success'});
    } catch(e) {
        toast.show("Erro ao remover", {type: 'danger'});
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      toast.show("É necessário permissão para aceder à galeria.", { type: 'warning', placement: 'top' });
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 2 * 1024 * 1024) {
          toast.show("A imagem deve ter no máximo 2MB.", { type: 'warning', placement: 'top' });
          return;
      }
      uploadProfileImage(asset.uri);
    }
  };
  
  const uploadProfileImage = async (imageUri) => {
    try {
      setIsUploading(true);
      const formData = new FormData();
      const filename = imageUri.split('/').pop() || 'profile.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;
      
      formData.append('type', 'client');
      formData.append('file', { uri: imageUri, name: filename, type });
      
      const { default: api } = await import('../hooks/createConnectionApi');
      
      const response = await fetch(`${api.defaults.baseURL}/upload/local`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }
      
      const responseData = await response.json();
      
      const serverBaseUrl = api.defaults.baseURL.replace('/api', '');
      const relativeUrl = responseData.url || responseData.secure_url;
      const imageUrl = relativeUrl ? `${serverBaseUrl}${relativeUrl}` : null;
      
      if(relativeUrl) {
        const storedUserData = await AsyncStorage.getItem('userData');
        if(storedUserData) {
          const parsed = JSON.parse(storedUserData);
          // 🚀 GUARDA NA BASE DE DADOS APENAS A REFERÊNCIA RELATIVA (/uploads/images/...)
          const res = await api.put('/users/profile', {
              profileImage: relativeUrl
          }, {
              headers: { authorization: `Bearer ${parsed.token}` }
          });
          
          // Mas na app atualiza com o URL relativo também. O `getImageUrl` que criamos sabe como lidar com ele.
          const updatedUser = { ...parsed, profileImage: relativeUrl };
          await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
          setUserData(updatedUser);
          
          toast.show("Foto de perfil atualizada com sucesso!", { type: 'success', placement: 'top' });
        }
      }
    } catch (e) {
      console.error(e);
      toast.show("Erro ao fazer upload da imagem", { type: 'danger', placement: 'top' });
    } finally {
      setIsUploading(false);
    }
  };

  const fetchWalletBalance = async (token, intervalId) => {
    try {
      const { default: api } = await import('../hooks/createConnectionApi');
      const res = await api.get('/wallet/balance', {
        headers: { authorization: `Bearer ${token}` }
      });
      setWalletBalance(res.data.available_balance || 0);
    } catch (err) {
      if (err.response?.status === 401) {
        if (intervalId) clearInterval(intervalId);
      } else {
        console.log('⚠️ Erro ao buscar saldo no perfil', err.message);
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      let intervalId;
      const loadBalance = async () => {
        const storedUserData = await AsyncStorage.getItem('userData');
        if (storedUserData) {
          const parsedUser = JSON.parse(storedUserData);
          if (parsedUser && parsedUser.token) {
            fetchWalletBalance(parsedUser.token);
            intervalId = setInterval(() => {
              fetchWalletBalance(parsedUser.token, intervalId);
            }, 60000);
          }
        }
      };
      
      loadBalance();
      
      return () => {
        if (intervalId) clearInterval(intervalId);
      };
    }, [])
  );

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
    setShowLogoutModal(true);
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
        colors={['#7F00FF', '#A855F7']} // Cor do aplicativo
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerBackdrop}
      >
        <Text style={styles.headerTitle}>Meu Perfil</Text>
      </LinearGradient>

      {/* 2. MAIN USER CARD AND DATA WRAPPER */}
      <View style={styles.profileContainer}>
        {/* User Avatar */}
        <TouchableOpacity 
          activeOpacity={0.8} 
          onPress={userLogin ? pickImage : () => {
            toast.show("Tem de fazer login para alterar a foto", { type: "danger" });
          }}
          style={styles.avatarContainer}
        >
          <Image
            source={
              userLogin && userData?.profileImage 
                ? { uri: userData.profileImage.startsWith('/') ? `${require('../hooks/createConnectionApi').default.defaults.baseURL.replace('/api', '')}${userData.profileImage}` : userData.profileImage } 
                : require('../assets/default1.jpg')
            }
            style={styles.avatar}
          />
          {isUploading && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator size="small" color="#FFF" />
            </View>
          )}
          {userLogin && (
            <View style={styles.editBadge}>
              <Ionicons name="camera" size={16} color="#FFF" />
            </View>
          )}
        </TouchableOpacity>

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
            
            {/* Wallet Balance Card */}
            <View style={{ backgroundColor: '#F3E8FF', padding: 15, borderRadius: 16, width: '100%', marginBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E9D5FF' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#7F00FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                  <Ionicons name="wallet" size={20} color="#FFF" />
                </View>
                <View>
                  <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '700', textTransform: 'uppercase' }}>Saldo da Carteira</Text>
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#7F00FF' }}>{parseFloat(walletBalance).toFixed(2)} MT</Text>
                </View>
              </View>
            </View>

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

              {/* Membro desde */}
              <View style={styles.infoItem}>
                <View style={styles.infoIconWrap}>
                  <Ionicons name="calendar" size={18} color="#9333EA" />
                </View>
                <View style={styles.infoTextWrap}>
                  <Text style={styles.infoLabel}>MEMBRO DESDE</Text>
                  <Text style={styles.infoValue}>
                    {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString('pt-BR') : 'Data não disponível'}
                  </Text>
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

            {/* Premium Saved Locations Card */}
            <View style={[styles.infoCard, { paddingHorizontal: 0, paddingBottom: 10 }]}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: 20}}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#F3E8FF', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                    <Ionicons name="map-outline" size={20} color="#7F00FF" />
                  </View>
                  <Text style={[styles.cardSectionTitle, { marginBottom: 0 }]}>Meus Endereços</Text>
                </View>
                <TouchableOpacity onPress={() => setModalVisible(true)} style={{backgroundColor: '#7F00FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center'}}>
                  <Ionicons name="add" size={16} color="#FFF" style={{ marginRight: 4 }} />
                  <Text style={{ color: '#FFF', fontSize: 13, fontWeight: 'bold' }}>Novo</Text>
                </TouchableOpacity>
              </View>

              {userData?.savedLocations && userData.savedLocations.length > 0 ? (
                userData.savedLocations.map((loc, index) => (
                  <View key={loc._id || index} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                      <Ionicons name="location" size={22} color="#9333EA" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 2 }}>{loc.name.toUpperCase()}</Text>
                      <Text style={{ fontSize: 13, color: '#64748B' }} numberOfLines={1}>{loc.address}</Text>
                    </View>
                    <TouchableOpacity onPress={() => removeLocation(loc._id)} style={{ padding: 8, backgroundColor: '#FEE2E2', borderRadius: 12, marginLeft: 10 }}>
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{color: '#6B7280', fontSize: 14}}>Nenhum endereço guardado.</Text>
                </View>
              )}
            </View>

            {/* Premium Alterar Senha Card */}
            <TouchableOpacity onPress={() => setPasswordModalVisible(true)} activeOpacity={0.8}>
              <LinearGradient
                colors={['#1E293B', '#0F172A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 16, padding: 20, width: '100%', marginBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                    <Ionicons name="lock-closed-outline" size={22} color="#FFF" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#FFF', marginBottom: 2 }}>Alterar Senha</Text>
                    <Text style={{ fontSize: 12, color: '#94A3B8' }}>Mantenha a sua conta segura</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#64748B" />
              </LinearGradient>
            </TouchableOpacity>

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

      {/* ADD LOCATION BOTTOM SHEET */}
      <BottomSheetComponent
        isOpen={modalVisible}
        toggleSheet={() => setModalVisible(false)}
        height={700}
      >
        <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' }}>
          {/* Header */}
          <View style={{ padding: 20, paddingBottom: 15, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B' }}>Novo Endereço</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={{ backgroundColor: '#F1F5F9', padding: 8, borderRadius: 20 }}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={{ padding: 20, flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Nome do Local (Ex: Casa, Trabalho)</Text>
            <TextInput
              style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 15, fontSize: 16, color: '#1E293B', marginBottom: 20 }}
              value={locationName}
              onChangeText={setLocationName}
              placeholder="Digite o nome..."
              placeholderTextColor="#9CA3AF"
            />

            <View style={{ flex: 1, position: 'relative', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' }}>
              <MapView
                ref={mapRef}
                style={{ flex: 1 }}
                initialRegion={{
                  latitude: locationCoords?.lat || defaultCoord.lat,
                  longitude: locationCoords?.lng || defaultCoord.lng,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01
                }}
              >
                <Marker
                  coordinate={{
                    latitude: locationCoords?.lat || defaultCoord.lat,
                    longitude: locationCoords?.lng || defaultCoord.lng,
                  }}
                  draggable
                  onDragEnd={(e) => {
                    setLocationCoords({
                      lat: e.nativeEvent.coordinate.latitude,
                      lng: e.nativeEvent.coordinate.longitude
                    });
                  }}
                  pinColor="#7F00FF"
                  title="Sua Posição"
                  description="Arraste para ajustar"
                />
              </MapView>

              {/* Autocomplete Overlay */}
              <View style={{ position: 'absolute', top: 10, left: 10, right: 10, zIndex: 10 }}>
                <GooglePlacesAutocomplete
                    placeholder="Pesquisar local no mapa..."
                    onPress={(data, details = null) => {
                        if (details) {
                            setLocationAddress(data.description);
                            const lat = details.geometry.location.lat;
                            const lng = details.geometry.location.lng;
                            setLocationCoords({ lat, lng });
                            mapRef.current?.animateToRegion({
                                latitude: lat,
                                longitude: lng,
                                latitudeDelta: 0.01,
                                longitudeDelta: 0.01
                            }, 1000);
                        }
                    }}
                    query={{
                        key: EXPO_GOOGLE_MAPS_APIKEY,
                        language: 'pt',
                        components: 'country:mz'
                    }}
                    fetchDetails={true}
                    styles={{
                        textInput: { height: 45, borderRadius: 8, paddingHorizontal: 15, fontSize: 15, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 3 },
                        listView: { backgroundColor: 'white', borderRadius: 8, marginTop: 5, elevation: 4 },
                    }}
                    enablePoweredByContainer={false}
                />
              </View>

              <View style={{ position: 'absolute', bottom: 15, left: 0, right: 0, alignItems: 'center' }}>
                 <View style={{ backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                    <Text style={{ color: '#FFF', fontSize: 12 }}>Pressione e segure o pin para arrastar</Text>
                 </View>
              </View>
            </View>

            <TouchableOpacity 
              style={[{ backgroundColor: '#7F00FF', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 }, isSavingLocation && {opacity: 0.7}]} 
              onPress={saveLocation}
              disabled={isSavingLocation}
            >
              {isSavingLocation ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>Guardar Localização</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheetComponent>

      {/* UPDATE PASSWORD BOTTOM SHEET */}
      <BottomSheetComponent
        isOpen={passwordModalVisible}
        toggleSheet={() => setPasswordModalVisible(false)}
        height={400}
      >
        <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' }}>
          {/* Header */}
          <View style={{ padding: 20, paddingBottom: 15, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                <Ionicons name="shield-checkmark" size={20} color="#D97706" />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B' }}>Alterar Senha</Text>
            </View>
            <TouchableOpacity onPress={() => setPasswordModalVisible(false)} style={{ backgroundColor: '#F1F5F9', padding: 8, borderRadius: 20 }}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={{ padding: 20, flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Nova Senha</Text>
            <View style={{ position: 'relative' }}>
              <View style={{ position: 'absolute', left: 15, top: 15, zIndex: 1 }}>
                <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" />
              </View>
              <TextInput
                style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 15, paddingLeft: 45, fontSize: 16, color: '#1E293B', marginBottom: 20 }}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Introduza a nova senha"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
              />
            </View>
            <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 25, marginTop: -10 }}>
              A sua nova senha deve ter pelo menos 6 caracteres.
            </Text>

            <TouchableOpacity 
              style={[{ backgroundColor: '#1E293B', paddingVertical: 16, borderRadius: 12, alignItems: 'center' }, isSavingPassword && {opacity: 0.7}]} 
              onPress={updatePassword}
              disabled={isSavingPassword}
            >
              {isSavingPassword ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>Atualizar Senha</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheetComponent>

      {/* PREMIUM LOGOUT MODAL */}
      <Modal visible={showLogoutModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(17, 24, 39, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ 
            backgroundColor: '#FFFFFF', 
            borderRadius: 24, 
            width: '100%', 
            maxWidth: 340, 
            padding: 24, 
            alignItems: 'center',
            shadowColor: '#A855F7',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.15,
            shadowRadius: 20,
            elevation: 10
          }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <Ionicons name="log-out-outline" size={32} color="#EF4444" />
            </View>
            
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8, textAlign: 'center' }}>
              Terminar Sessão
            </Text>
            
            <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>
              Tem a certeza que deseja sair da sua conta? Terá de fazer login novamente para usar a aplicação.
            </Text>

            <View style={{ flexDirection: 'row', width: '100%', gap: 12 }}>
              <TouchableOpacity 
                style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center' }}
                onPress={() => setShowLogoutModal(false)}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#4B5563' }}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#EF4444', alignItems: 'center' }}
                onPress={() => {
                  setShowLogoutModal(false);
                  userLogout();
                }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>Sair da Conta</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
};

export default Profile;

const styles = StyleSheet.create({
  headerBackdrop: {
    height: 240,
    width: '100%',
    alignItems: 'center',
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
    position: 'relative',
    paddingTop: 50, // Dá espaço para a status bar e encosta a logo em cima
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 10,
    marginBottom: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  logoBadgeContainer: {
    width: '70%',
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  logoBadge: {
    width: '100%',
    height: '100%',
  },
  profileContainer: {
    alignItems: "center",
    marginTop: -60, // Sobe mais a fotografia para sobrepor a curva de 50px do header
    width: "100%",
    paddingHorizontal: 20,
  },
  avatarContainer: {
    marginTop: -55,
    marginBottom: 10,
    position: 'relative',
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
    elevation: 4,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 5,
    right: 0,
    backgroundColor: '#7F00FF',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    elevation: 5,
    shadowColor: '#7F00FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    height: 56,
    width: '100%',
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: '#FFE4E6',
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#E11D48',
    letterSpacing: 0.4,
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
