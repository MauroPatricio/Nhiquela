import { View, TouchableOpacity, TextInput } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import styles from './search.style'
import {Feather, Ionicons} from '@expo/vector-icons'

const Search = () => {
  return (
    <SafeAreaView>
       <View style={styles.searchContainer}>

        <View style={styles.searchWrapper}>
            <TextInput
            style={styles.searchInput}
            value=""
            onPressIn={() =>{}}
            placeholder='O que deseja para hoje?'
            />
        </View>
        <View>
            <TouchableOpacity style={styles.searchBtn}>
                <Feather name = "search" size={24}/>
            </TouchableOpacity>
        </View>
    </View>
    </SafeAreaView>
  )
}

export default Search