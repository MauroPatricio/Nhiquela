import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert} from 'react-native'
import React, {useState, useEffect} from 'react'
import { StatusBar } from 'expo-status-bar'
import {AntDesign, MaterialCommunityIcons, SimpleLineIcons} from "@expo/vector-icons"
import AsyncStorage from '@react-native-async-storage/async-storage'

const Profile = ({navigation}) => {
  const [userData, setUserData] = useState(null);
  const [userLogin, setUserLogin] = useState(false);

  useEffect(()=>{
    checkIfUserExist();
    }, [])

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
    const id = await AsyncStorage.getItem('id');
    if (!id) return;

    await AsyncStorage.removeItem('userData');
    await AsyncStorage.removeItem('id');

    navigation.replace('BottomNavigation');
  } catch (error) {
    console.error('Erro ao sair:', error);
    navigation.navigate('Login');
  }
};


  const logout = () => {
    Alert.alert(
      "Sair",
      "Tem a certeza que deseja sair?",
      [

        {
          text: "Cancelar", onPress: () => console.log("cancelado")
        },
        {
          text: "Continuar", onPress: () => userLogout()
        },
       
        

      ]
    )
  }

  const clearCache = () => {
    Alert.alert(
      "Limpar registros",
      "Tem a certeza que deseja Limpar todos os registros do seu dispositivo?",
      [
        {
          text: "Continuar", onPress: () => console.log("cancelado")
        },
        {
          text: "Cancelar", onPress: () => console.log("cancelado")
        },
        

      ]
    )
  }

  const deleteAccount = () => {
    Alert.alert(
      "Apagar conta",
      "Tem a certeza que deseja apagar definitivamente a sua conta?",
      [
        {
          text: "Continuar", onPress: () => console.log("cancelado")
        },
        {
          text: "Cancelar", onPress: () => console.log("cancelado")
        },
        

      ]
    )
  }
  return (

  <ScrollView>

    <View style={styles.container}>
          <View style={styles.container}>
            <StatusBar backgroundColor='white'/>
            <View style={{width: '100%'}}>
              <Image source={require('../assets/nhiquela2.png')}
              style={styles.cover}
              />
            </View>
            <View style={styles.profileContainer}>
            <Image source={require('../assets/default1.jpg')}
              style={styles.profile}
              />
              <Text style={styles.name}> 
                  {userLogin === true ? userData.name: "Por favor faça o login!"}
              </Text>

              {userLogin === false?(<TouchableOpacity onPress={()=>{navigation.navigate('Login')}}>
                    <View style={styles.loginBtn}>
                      <Text style={styles.menuText}>Entrar</Text>
                    </View>
                 </TouchableOpacity>):
                 (<View style={styles.loginBtn} onPress={()=>{navigation.navigate('Login')}}>
                    {/* <Text style={styles.menuText}>{userData?.email}</Text> */}
                    <Text style={styles.menuText}>{userData?.phoneNumber}</Text>

                  </View>)}
            {userLogin!==true?(
                    <View></View>):(
                    <View  style={styles.menuWrapper}>
                    {/* <TouchableOpacity onPress={()=>{}}>
                        <View style={styles.menuItem(0.2)}>
                            <MaterialCommunityIcons
                            name="heart-outline"
                            size={28}
                            color={"red"}
                            />
                            <Text style={styles.menuText2}>Favoritos</Text>
                        </View>
                    </TouchableOpacity> */}

                    {/* <TouchableOpacity onPress={()=>{}}>
                        <View style={styles.menuItem(0.2)}>
                            <MaterialCommunityIcons
                            name="truck-delivery-outline"
                            size={28}
                            // color={"red"}
                            />
                            <Text style={styles.menuText2}>Pedidos</Text>
                        </View>
                    </TouchableOpacity> */}

                    {/* <TouchableOpacity onPress={()=>{}}>
                        <View style={styles.menuItem(0.2)}>
                            <MaterialCommunityIcons
                            name="cart"
                            size={28}
                            // color={"red"}
                            />
                            <Text style={styles.menuText2}>Carinha de compras</Text>
                        </View>
                    </TouchableOpacity> */}

                    {/* <TouchableOpacity onPress={()=>{clearCache()}}>
                        <View style={styles.menuItem(0.2)}>
                            <MaterialCommunityIcons
                            name="cached"
                            size={28}
                            />
                            <Text style={styles.menuText2}>Limpar registros</Text>
                        </View>
                    </TouchableOpacity> */}
                    {/* <TouchableOpacity onPress={()=>{deleteAccount()}}>
                        <View style={styles.menuItem(0.2)}>
                            <AntDesign
                            name="user"
                            size={28}
                            />
                            <Text style={styles.menuText2}>Apagar conta</Text>
                        </View>
                    </TouchableOpacity> */}

                    <TouchableOpacity onPress={()=>{logout()}}>
                        <View style={styles.menuItem(0.2)}>
                            <AntDesign
                            name="logout"
                            size={28}
                            
                            />
                            <Text style={styles.menuText2}>Sair</Text>
                        </View>
                    </TouchableOpacity>
                    </View>
                    
                    
                  )}

           

            

</View>
          </View>
    </View>
    </ScrollView>

  )
}

export default Profile

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6', // Light grey background for better contrast
    paddingBottom: 20, // Add some padding at the bottom for the scroll view
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
    marginTop: -50, // Bring the profile image up
  },
  profile: {
    height: 160,
    width: 160,
    borderRadius: 80, // Circular profile picture
    borderWidth: 4,
    borderColor: "#FFFFFF", // White border around profile picture
    shadowColor: '#000', // Adding shadow for depth
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5, // Elevation for Android
  },
  name: {
    fontWeight: "700",
    fontSize: 18,
    marginVertical: 10,
    color: "#333", // Darker text for better readability
  },
  loginBtn: {
    backgroundColor: "#7F00FF", // Gradient background color for buttons
    padding: 10,
    borderWidth: 0.4,
    borderColor: "white",
    borderRadius: 24,
    width: '80%', // Full width for buttons
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10, // Space between buttons
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
    paddingHorizontal: 20, // Padding for menu items
  },
  menuItem: (borderBottomWidth) => ({
    borderBottomWidth: borderBottomWidth,
    flexDirection: "row",
    paddingVertical: 15,
    borderColor: "#E0E0E0", // Subtle border color
    alignItems: 'center', // Center items vertically
  }),
  menuText2: {
    marginLeft: 15,
    fontSize: 16,
    fontWeight: "500",
    color: "#333", // Dark text for contrast
  },
});
