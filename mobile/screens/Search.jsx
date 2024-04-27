import { View, TouchableOpacity, TextInput } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import styles from './search.style'
import {Feather, Ionicons} from '@expo/vector-icons'
import { useState } from 'react'


const Search = () => {

  const [searchKey, setSearchKey] = useState('')
  const [searchResults, setSearchResults] = useState('')

  const handleSearch = () =>{
    console.log('teste')
  }
  return (
    <SafeAreaView>
       <View style={styles.searchContainer}>

        <View style={styles.searchWrapper}>
            <TextInput
            style={styles.searchInput}
            value={searchKey}
            onChangeText={setSearchKey}
            placeholder='O que deseja para hoje?'
            />
        </View>
        <View>
            <TouchableOpacity style={styles.searchBtn} onPress={()=>{handleSearch()}}>
                <Feather name = "search" size={24}/>
            </TouchableOpacity>
        </View>
    </View>
    </SafeAreaView>
  )
}

export default Search