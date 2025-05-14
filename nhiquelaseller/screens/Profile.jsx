import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert, Switch } from 'react-native';
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AntDesign, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../hooks/createConnectionApi'; // Import your API connection

const Profile = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [userLogin, setUserLogin] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(false); // State for store status

  useEffect(() => {
    checkIfUserExist();
  }, []);

  const checkIfUserExist = async () => {
    const id = await AsyncStorage.getItem('id');
    const userId = `user${JSON.parse(id)}`;
    try {
      const currentUser = await AsyncStorage.getItem(userId);
      setUserLogin(false);
      if (currentUser !== null) {
        const parseData = JSON.parse(currentUser);
        setUserData(parseData);
        setUserLogin(true);
        setIsStoreOpen(parseData.seller?.openstore || false); // Initialize store status
      }
    } catch (error) {
      navigation.navigate('Login');
    }
  };

  const userLogout = async () => {
    const id = await AsyncStorage.getItem('id');
    const userId = `user${JSON.parse(id)}`;
    await AsyncStorage.removeItem(userId);
    await AsyncStorage.removeItem('id');
    navigation.replace('Bottom Navigation');
  };

  const logout = () => {
    Alert.alert(
      "Sair",
      "Tem a certeza que deseja sair?",
      [
        { text: "Cancelar", onPress: () => console.log("cancelado") },
        { text: "Continuar", onPress: () => userLogout() },
      ]
    );
  };

  const deleteAccount = () => {
    Alert.alert(
      "Apagar conta",
      "Tem a certeza que deseja apagar definitivamente a sua conta?",
      [
        { text: "Continuar", onPress: () => console.log("cancelado") },
        { text: "Cancelar", onPress: () => console.log("cancelado") },
      ]
    );
  };

  // const toggleStoreStatus = async () => {
  //   const newStatus = !isStoreOpen;
  //   setIsStoreOpen(newStatus); // Update local state
  
  //   try {
  //     const id = await AsyncStorage.getItem('id');
  //     const userId = `user${JSON.parse(id)}`;
  //     const token = userData.token; // Get token
  
  //     if (!token) {
  //       // If no token, alert the user to log in
  //       Alert.alert('Erro', 'Token inválido. Por favor, faça login novamente.');
  //       navigation.navigate('Login');
  //       return;
  //     }
  
  //     const response = await api.put(
  //       `/users/seller/${JSON.parse(id)}`,
  //       { isopenstore: newStatus },
  //       { headers: { Authorization: `Bearer ${token}` } }
  //     );
  
  //     if (response.data.message === 'Loja Actualizada com Sucesso') {
  //       // Update user data in AsyncStorage
  //       const updatedUser = { ...userData, seller: { ...userData.seller, openstore: newStatus } };
  //       await AsyncStorage.setItem(userId, JSON.stringify(updatedUser));
  //       setUserData(updatedUser);
  //     }
  //   } catch (error) {
  //     console.error('Erro ao atualizar o estado da loja:', error.response ? error.response.data : error.message);
      
  //     // Handle specific error codes
  //     if (error.response && error.response.status === 401) {
  //       Alert.alert('Erro de autenticação', 'Sessão expirada. Faça login novamente.');
  //       navigation.navigate('Login');
  //     } else {
  //       Alert.alert('Erro', 'Não foi possível atualizar o estado da loja. Tente novamente.');
  //     }
  
  //     setIsStoreOpen(!newStatus); // Revert state if API call fails
  //   }
  // };

  const toggleStoreStatus = async () => {
    const newStatus = !isStoreOpen;
    setIsStoreOpen(newStatus); // Update local state

    try {
      const id = await AsyncStorage.getItem('id');
      const response = await api.put(
        `/users/seller/${JSON.parse(id)}`,
        { isopenstore: newStatus },
        { headers: { Authorization: `Bearer ${userData.token}` } }
      );

      if (response.data.message === 'Loja Actualizada com Sucesso') {
        // Update user data in AsyncStorage
        const updatedUser = { ...userData, seller: { ...userData.seller, openstore: newStatus } };
        await AsyncStorage.setItem(`user${JSON.parse(id)}`, JSON.stringify(updatedUser));
        setUserData(updatedUser);
      }
    } catch (error) {
      console.log(error)
      console.error('Erro ao atualizar o estado da loja:', error);
      setIsStoreOpen(!newStatus); // Revert state if API call fails
      Alert.alert('Erro', 'Não foi possível atualizar o estado da loja.');
    }
  };

  return (
    <ScrollView>
      <View style={styles.container}>
        <StatusBar backgroundColor='white' />
        <View style={{ width: '100%' }}>
          <Image source={require('../assets/nhiquela2.png')} style={styles.cover} />
        </View>
        <View style={styles.profileContainer}>
          <Image source={require('../assets/default1.jpg')} style={styles.profile} />
          <Text style={styles.name}>
            {userLogin === true ? userData.name : "Por favor faça o login!"}
          </Text>

          {userLogin === false ? (
            <TouchableOpacity onPress={() => { navigation.navigate('Login') }}>
              <View style={styles.loginBtn}>
                <Text style={styles.menuText}>Entrar</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.loginBtn}>
              <Text style={styles.menuText}>{userData?.phoneNumber}</Text>
            </View>
          )}

          {userLogin === true && (
            <View style={styles.menuWrapper}>
              {/* Switch for store status */}
              <View style={styles.menuItem(0.2)}>
                <MaterialCommunityIcons name="store" size={28} color="#7F00FF" />
                <Text style={styles.menuText2}>Loja Aberta</Text>
                <Switch
                  value={isStoreOpen}
                  onValueChange={toggleStoreStatus}
                  trackColor={{ false: "#767577", true: "#7F00FF" }}
                  thumbColor={isStoreOpen ? "#FFFFFF" : "#f4f3f4"}
                />
              </View>

              <TouchableOpacity onPress={() => { deleteAccount() }}>
                <View style={styles.menuItem(0.2)}>
                  <AntDesign name="user" size={28} />
                  <Text style={styles.menuText2}>Apagar conta</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { logout() }}>
                <View style={styles.menuItem(0.2)}>
                  <AntDesign name="logout" size={28} />
                  <Text style={styles.menuText2}>Sair</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

export default Profile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingBottom: 20,
  },
  cover: {
    height: 300,
    width: "100%",
    resizeMode: "cover",
    overflow: 'hidden',
  },
  profileContainer: {
    flex: 1,
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
    borderWidth: 0.4,
    borderColor: "white",
    borderRadius: 24,
    width: '80%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuText: {
    fontWeight: "600",
    fontSize: 16,
    lineHeight: 22,
    color: "white",
  },
  menuWrapper: {
    marginTop: 20,
    width: '100%',
    paddingHorizontal: 20,
  },
  menuItem: (borderBottomWidth) => ({
    borderBottomWidth: borderBottomWidth,
    flexDirection: "row",
    paddingVertical: 15,
    borderColor: "#E0E0E0",
    alignItems: 'center',
    justifyContent: 'space-between', // Align switch to the right
  }),
  menuText2: {
    marginLeft: 15,
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
});