import { View, TouchableOpacity, Text,TextInput, FlatList, Image } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import styles from './search.style'
import {Feather} from '@expo/vector-icons'
import { useState } from 'react'
import api from '../hooks/createConnectionApi';
import SearchTile from '../components/SearchTile'


const Search = () => {

  const [searchKey, setSearchKey] = useState('')
  const [searchResults, setSearchResults] = useState('')

  const handleSearch = async () =>{
    try{
          const response = await api.get(`/products/search?query=${searchKey}`);
          setSearchResults(response.data)
    }catch(error){
        console.log("Failed to get Products", error);
    }
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
    {searchResults.length == 0 ? (
      <View style={{flex:1}}>
        <Image
        source={require('../assets/search1.png')}
        style={styles.searchImage}
        />
        <Text style={styles.Text}>Pesquisa</Text>
      </View>
    ):(
      <FlatList style={{marginHorizontal:12}}
      data={searchResults.products}
      keyExtractor={(item)=> item._id}
      renderItem={({item})=>(<Text>{<SearchTile item={item}/>}</Text>)}
      />
    )}
    </SafeAreaView>
  )
}

export default Search