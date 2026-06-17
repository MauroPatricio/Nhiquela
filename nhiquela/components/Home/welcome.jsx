import { View, Text, TouchableOpacity, TextInput } from 'react-native'
import React from 'react'
import styles from './welcome.style'
import { Feather, Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'

const welcome = () => {
  const navigation = useNavigation();
  
  return (
    <View style={styles.outerContainer}>
      <View style={styles.titleContainer}>
        
      <Text style={styles.brandText2}>
  nhiquela
  <Text style={{ color: '#A855F7' }}>.</Text>
</Text>
        <Text style={styles.subtitleText}>TUDO EM SUAS MÃOS</Text>
      </View>
      
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Feather name="search" size={20} style={styles.searchIcon} />
          <View style={styles.searchWrapper}>
            <TextInput
              style={styles.searchInput}
              value=""
              onPressIn={() => { navigation.navigate('Pesquisa') }}
              placeholder='O que deseja para hoje?'
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>
        
        <TouchableOpacity style={styles.filterBtn} onPress={() => navigation.navigate('Pesquisa')}>
          <Ionicons name="options-outline" size={22} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default welcome