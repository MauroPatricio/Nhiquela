import { View, Text, TouchableOpacity, TextInput } from 'react-native'
import React from 'react'
import styles from './welcome.style'
import { Feather, Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
const welcome = () => {
  const navigation = useNavigation();
  return (

    <View>
      <View style={{paddingBottom:30}}>
        <Text style={styles.welcomeText('black', 30, 0)}><Text style={{ color: '#7F00FF' }}>NHIQUELA</Text></Text>

        <Text style={styles.welcomeText2('black', 11, 0)}>TUDO EM SUAS MÃOS</Text>
      </View>
      {/* <View style={styles.searchContainer}>
        <TouchableOpacity>
          <Feather name="search" size={24}
            style={styles.searchIcon} />
        </TouchableOpacity>
        <View style={styles.searchWrapper}>
          <TextInput
            style={styles.searchInput}
            value=""
            onPressIn={() => { navigation.navigate("Search") }}
            placeholder='O que deseja para hoje?'
          />
        </View>
        <View>
          <TouchableOpacity style={styles.searchBtn}>
          </TouchableOpacity>
        </View>
      </View> */}
    </View>
  )
}

export default welcome