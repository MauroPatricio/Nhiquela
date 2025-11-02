import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AntDesign, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

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
      "Sair",
      "Tem a certeza que deseja sair?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Continuar", onPress: () => userLogout() }
      ]
    );
  };

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        paddingBottom: 100, // espaço para o tabBar
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        <Image
          source={require('../assets/nhiquela2.png')}
          style={styles.cover}
        />

        <View style={styles.profileContainer}>
          <Image
            source={require('../assets/default1.jpg')}
            style={styles.profile}
          />
          <Text style={styles.name}>
            {userLogin ? userData.name : "Por favor, faça o login!"}
          </Text>

          {userLogin ? (
            <View style={styles.loginBtn}>
              <Text style={styles.menuText}>{userData?.phoneNumber}</Text>
            </View>
          ) : (
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <View style={styles.loginBtn}>
                <Text style={styles.menuText}>Entrar</Text>
              </View>
            </TouchableOpacity>
          )}

          {userLogin && (
            <View style={styles.menuWrapper}>
              <TouchableOpacity onPress={logout}>
                <View style={styles.menuItem}>
                  <AntDesign name="logout" size={28} color="#7F00FF" />
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
    alignItems: 'center',
  },
  cover: {
    height: 300,
    width: "100%",
    resizeMode: "cover",
  },
  profileContainer: {
    alignItems: "center",
    marginTop: -60, // posiciona a imagem de perfil sem afetar o layout do tabBar
    position: "relative",
  },
  profile: {
    height: 160,
    width: 160,
    borderRadius: 80,
    borderWidth: 4,
    borderColor: "#FFFFFF",
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
    padding: 12,
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
    width: '90%',
  },
  menuItem: {
    flexDirection: "row",
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 0.5,
    borderColor: "#E0E0E0",
  },
  menuText2: {
    marginLeft: 15,
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
});
