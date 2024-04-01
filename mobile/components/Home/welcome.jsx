import { View, Text, TouchableOpacity, TextInput } from 'react-native'
import React from 'react'
import styles from './welcome.style'
import {Feather, Ionicons} from '@expo/vector-icons'
import {useNavigation} from '@react-navigation/native'
const welcome = () => {
const navigation = useNavigation();
  return (

   <View>
     <View style={styles.container}>
      <Text style={styles.welcomeText('black', 30, 5)}>Nhiquela Shop</Text>
      <Text style={styles.welcomeText('grey', 16,0)}>Tudo em suas mãos</Text>
    </View>
    <View style={styles.searchContainer}>
        <TouchableOpacity>
            <Feather name = "search" size={24}
            style={styles.searchIcon}/>
        </TouchableOpacity>
        <View style={styles.searchWrapper}>
            <TextInput
            style={styles.searchInput}
            value=""
            onPressIn={() =>{navigation.navigate("Search")}}
            placeholder='O que deseja para hoje?'
            />
        </View>
        <View>
            <TouchableOpacity style={styles.searchBtn}>
                <Ionicons name="camera-outline" size={24}/>
            </TouchableOpacity>
        </View>
    </View>
   </View>
  )
}

export default welcome