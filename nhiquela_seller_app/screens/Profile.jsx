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

    const checkIfUserExist = async() =>{
      const id = await AsyncStorage.getItem('id');
      const userId = `user${JSON.parse(id)}`;
      try{
        const currentUser = await AsyncStorage.getItem(userId);
        setUserLogin(false);
        if(currentUser !== null){
          const parseData = JSON.parse(currentUser);
          setUserData(parseData);
          setUserLogin(true);
        }
      }catch(error){
        navigation.navigate('Login')
      }
    }

    const userLogout = async ()=> {
      const id = await AsyncStorage.getItem('id');
      const userId = `user${JSON.parse(id)}`;
      // try{
        // setUserLogin(false);
        await AsyncStorage.removeItem(userId);
        await AsyncStorage.removeItem('id');

        navigation.replace('Bottom Navigation')

      // }catch(error){
      //   navigation.navigate('Login')
      // }
    }


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
              <Image source={require('../assets/nhiquela.png')}
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
                    <Text style={styles.menuText}>{userData?.email}</Text>

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

                    <TouchableOpacity onPress={()=>{}}>
                        <View style={styles.menuItem(0.2)}>
                            <MaterialCommunityIcons
                            name="cash"
                            size={28}
                            // color={"red"}
                            />
                            <Text style={styles.menuText2}>Pagamentos da Nhiquela</Text>
                        </View>
                    </TouchableOpacity>

                    {/* <TouchableOpacity onPress={()=>{}}>
                        <View style={styles.menuItem(0.2)}>
                            <MaterialCommunityIcons
                            name="cart"
                            size={28}
                            // color={"red"}
                            />
                            <Text style={styles.menuText2}>Carinha de compras</Text>
                        </View>
                    </TouchableOpacity>

                  */}
                    <TouchableOpacity onPress={()=>{deleteAccount()}}>
                        <View style={styles.menuItem(0.2)}>
                            <AntDesign
                            name="user"
                            size={28}
                            />
                            <Text style={styles.menuText2}>Apagar conta</Text>
                        </View>
                    </TouchableOpacity>

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

  container:{
      flex: 1,
      backgroundColor: '#F8F8F8'
  },
  cover: {
    height: 290,
    width: "100%",
    resizeMode: "cover"
  },
  profileContainer:{
    flex: 1,
    alignItems: "center"
  },
  profile: {
    height: 155,
    width: 155,
    borderRadius: 999,
    borderColor: "#F5F5F5",
    marginTop: -80
  },
  name: {
    fontWeight: "600",
    marginVertical: 5
  },
  loginBtn:{
    backgroundColor: "#7F00FF",
    padding: 5,
    borderWidth: 0.4,
    borderColor: "white",
    borderRadius: 24,
  },
  menuText:{
    // marginTop: 23,
    marginLeft: 50,
    marginRight: 50,
    fontWeight: "600",
    fontSize: 14,
    lineHeight: 19,
    padding:10,
    color: "white"
  },
  menuWrapper:{
    marginTop: 20,
    width: '100%',
    // backgroundColor: "#e6e6e6",
    // borderRadius: 1
  },
  menuItem: (borderBottomWidth) => ({
    borderBottomWidth: borderBottomWidth,
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 35,
    borderColor: "blue",
    borderBottomWidth: 0.3

  }),
  menuText2:{
    marginLeft: 30,
    marginTop:4,
    fontSize: 15,
    fontWeight: "500"
  }
      
  })