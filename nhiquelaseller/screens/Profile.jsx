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
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AntDesign, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../hooks/createConnectionApi';
import { useNavigation } from '@react-navigation/native';

const Profile = () => {
  const navigation = useNavigation();
  
  const [userData, setUserData] = useState(null);
  const [userLogin, setUserLogin] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
          setIsStoreOpen(parsedUserData.seller?.openstore || false);
          setUserLogin(true);
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

  const deleteAccount = () => {
    Alert.alert("Apagar conta", "Tem a certeza que deseja apagar definitivamente a sua conta?", [
      { text: "Continuar", onPress: () => console.log("Conta apagada") },
      { text: "Cancelar" },
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7F00FF" />
        <Text style={{ marginTop: 10 }}>Carregando...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{  backgroundColor: '#F3F4F6' }}>
      <View style={styles.container}>
        <StatusBar backgroundColor='white' />
        <Image source={require('../assets/nhiquela2.png')} style={styles.cover} />

        <View style={styles.profileContainer}>
          <Image source={require('../assets/default1.jpg')} style={styles.profile} />
          <Text style={styles.name}>
            {userLogin ? userData.name : "Por favor faça o login!"}
          </Text>

          {!userLogin ? (
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <View style={styles.loginBtn}>
                <Text style={styles.menuText}>Entrar</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.loginBtn}>
              <Text style={styles.menuText}>{userData?.phoneNumber}</Text>
            </View>
          )}

          {userLogin && (
            <View style={styles.menuWrapper}>
              {/* Loja Aberta Switch */}
              <View style={[styles.menuItem, { borderBottomWidth: 0.5 }]}>
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons name="store" size={28} color="#7F00FF" />
                </View>
                <Text style={styles.menuText2}>Loja Aberta</Text>
                <Switch
                  value={isStoreOpen}
                  onValueChange={toggleStoreStatus}
                  trackColor={{ false: "#767577", true: "#7F00FF" }}
                  thumbColor={isStoreOpen ? "#FFFFFF" : "#f4f3f4"}
                />
              </View>

              {/* Apagar conta */}
              <TouchableOpacity onPress={deleteAccount}>
                <View style={[styles.menuItem, { borderBottomWidth: 0.5 }]}>
                  <View style={styles.iconContainer}>
                    <AntDesign name="user" size={28} />
                  </View>
                  <Text style={styles.menuText2}>Apagar conta</Text>
                </View>
              </TouchableOpacity>

              {/* Sair */}
              <TouchableOpacity onPress={logout}>
                <View style={[styles.menuItem, { borderBottomWidth: 0.5 }]}>
                  <View style={styles.iconContainer}>
                    <AntDesign name="logout" size={28} />
                  </View>
                  <Text style={styles.menuText2}>Sair</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
      <View style={{ marginBottom: 200 }} />
    </ScrollView>
  );
};

export default Profile;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F3F4F6',
    paddingBottom: 20,
  },
  cover: {
    height: 250,
    width: "100%",
    resizeMode: "cover",
  },
  profileContainer: {
    alignItems: "center",
    marginTop: -50,
  },
  profile: {
    height: 160,
    width: 160,
    borderRadius: 80,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  name: {
    fontWeight: "700",
    fontSize: 18,
    marginVertical: 10,
    color: "#333",
  },
  loginBtn: {
    backgroundColor: "#7F00FF",
    padding: 10,
    borderRadius: 24,
    width: '80%',
    alignItems: 'center',
    marginVertical: 10,
    elevation: 3,
  },
  menuText: {
    fontWeight: "600",
    fontSize: 16,
    color: "white",
  },
  menuWrapper: {
    marginTop: 20,
    width: '100%',
    paddingHorizontal: 20,
  },
  menuItem: {
    flexDirection: "row",
    paddingVertical: 15,
    borderColor: "#E0E0E0",
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 35,
    alignItems: 'center',
  },
  menuText2: {
    marginLeft: 15,
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
