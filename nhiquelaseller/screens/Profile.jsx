import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import React, { useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AntDesign, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../hooks/createConnectionApi';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

const Profile = () => {
  const navigation = useNavigation();
  
  const [userData, setUserData] = useState(null);
  const [userLogin, setUserLogin] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [pendingCount, setPendingCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);


const fetchPendingWithdrawals = async () => {

  if(userData?.token){
    try {
      const response = await api.get('/wallet/pending', { 
        headers: { Authorization: `Bearer ${userData.token}` } 
      });
      setPendingCount(response.data.length || 0);
    } catch (error) {
      console.error("Erro ao buscar solicitações pendentes:", error);
    }
  }
};

useFocusEffect(
  useCallback(() => {
    const loadUserAndPending = async () => {
      await checkIfUserExist();
      if (userData?.token && isAdmin) {
        fetchPendingWithdrawals();
      }
    };
    loadUserAndPending();
  }, [userData, isAdmin])
);



  const checkIfUserExist = async () => {
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      const storedUserId = await AsyncStorage.getItem('id');

      if (storedUserData && storedUserId) {
        const parsedUserData = JSON.parse(storedUserData);
        if (parsedUserData._id === storedUserId) {
          setUserData(parsedUserData);
          setIsStoreOpen(parsedUserData.seller?.openstore || false);
          setUserLogin(true);
          setIsAdmin(parsedUserData.isAdmin);
        } else {
          navigation.navigate('Login');
        }
      } else {
        navigation.navigate('Login');
      }
    } catch (error) {
      navigation.navigate('Login');
    } finally {
      setIsLoading(false);
    }
  };

  const userLogout = async () => {
    setIsLoading(true);
    await AsyncStorage.removeItem('id');
    await AsyncStorage.removeItem('userData');
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
    setIsLoading(false);
  };

  const logout = () => {
    Alert.alert("Sair", "Tem a certeza que deseja sair?", [
      { text: "Cancelar" },
      { text: "Continuar", onPress: () => userLogout() },
    ]);
  };

  const toggleStoreStatus = async () => {
    setIsLoading(true);
    try {
      const id = await AsyncStorage.getItem('id');
      const newStatus = !isStoreOpen;

      const response = await api.put(
        `/users/seller/${id}`,
        { isopenstore: newStatus },
        { headers: { Authorization: `Bearer ${userData.token}` } }
      );

      if (response?.status === 201) {
        const updatedUser = {
          ...userData,
          seller: { ...userData.seller, openstore: newStatus }
        };
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
        setUserData(updatedUser);
        setIsStoreOpen(newStatus);
      } else {
        Alert.alert('Erro', 'Falha ao atualizar o status da loja.');
      }
    } catch (error) {
      console.error('Erro ao atualizar o estado da loja:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o estado da loja.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <>
      
      <StatusBar backgroundColor='white' />
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7F00FF" />
        <Text style={{ marginTop: 60 }}>Carregando...</Text>
      </View>
      </>
    );
  }

    // return (
    //   <></>
    // );

  return (
    <ScrollView style={{ backgroundColor: '#F3F4F6' }}>
      
      <View style={styles.header}>
        <Image source={require('../assets/nhiquela2.png')} style={styles.cover} />
        <View style={styles.profileWrapper}>
          <Image source={require('../assets/default1.jpg')} style={styles.profile} />
          <Text style={styles.name}>
            {userLogin ? userData.name : "Por favor faça o login!"}
          </Text>
          {!userLogin ? (
            <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginText}>Entrar</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.phoneTag}>
              <Text style={styles.phoneText}>{userData?.phoneNumber}</Text>
            </View>
          )}
        </View>
      </View>

      {userLogin && (
        <View style={styles.card}>
          <View style={styles.menuItem}>
            <MaterialCommunityIcons name="store" size={28} color="#7F00FF" />
            <Text style={styles.menuText}>Loja Aberta</Text>
            <Switch
              value={isStoreOpen}
              onValueChange={toggleStoreStatus}
              trackColor={{ false: "#ccc", true: "#7F00FF" }}
              thumbColor={isStoreOpen ? "#fff" : "#f4f3f4"}
            />
          </View>
        </View>
      )}

      {userLogin && (
        <View style={styles.card}>
          <TouchableOpacity onPress={() => navigation.navigate('Wallet')}>
            <View style={styles.menuItem}>
              <MaterialCommunityIcons name="wallet" size={28} color="#7F00FF" />
              <Text style={styles.menuText}>Minha Carteira</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

{isAdmin && (
  <View style={styles.card}>
    <TouchableOpacity onPress={() => navigation.navigate('WithdrawalRequests')}>
      <View style={styles.menuItem}>
        <MaterialCommunityIcons name="bank-transfer" size={28} color="#7F00FF" />
        <Text style={styles.menuText}>Autorizar Levantamentos</Text>
        {pendingCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pendingCount}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  </View>
)}
      

      <View style={styles.card}>
        <TouchableOpacity onPress={logout}>
          <View style={styles.menuItem}>
            <AntDesign name="logout" size={28} color="#7F00FF" />
            <Text style={styles.menuText}>Sair</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={{ marginBottom: 200 }} />
    </ScrollView>
  );
};

export default React.memo(Profile);

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#fff',
    marginBottom: 20,
    elevation: 4,
  },
  cover: {
    height: 200,
    width: "100%",
    resizeMode: "cover",
  },
  profileWrapper: {
    alignItems: "center",
    marginTop: -60,
    paddingBottom: 20,
  },
  profile: {
    height: 120,
    width: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "#fff",
    elevation: 5,
  },
  name: {
    fontWeight: "700",
    fontSize: 20,
    marginVertical: 10,
    color: "#333",
  },
  loginBtn: {
    backgroundColor: "#7F00FF",
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 25,
    elevation: 3,
  },
  loginText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  phoneTag: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#7F00FF",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 2,
  },
  phoneText: {
    fontWeight: "600",
    color: "#7F00FF",
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 3,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  menuText: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
  backgroundColor: 'red',
  borderRadius: 10,
  paddingHorizontal: 6,
  paddingVertical: 2,
  justifyContent: 'center',
  alignItems: 'center',
},
badgeText: {
  color: '#fff',
  fontSize: 12,
  fontWeight: 'bold',
},
});
