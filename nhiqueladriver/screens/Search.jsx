import { View, Text, TextInput, FlatList, Image, ActivityIndicator } from 'react-native';
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import styles from './search.style';
import api from '../hooks/createConnectionApi';
import SearchTile from '../components/SearchTile';

const Search = () => {
  const [searchKey, setSearchKey] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (query) => {
    setIsLoading(true);
    try {
      const response = await api.get(`/products/search?query=${query}`);
      setSearchResults(response.data.products);
    } catch (error) {
      console.log('Failed to get Products', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (searchKey.length > 0) {
      handleSearch(searchKey);
    } else {
      setSearchResults([]);
    }
  }, [searchKey]);

  return (
    <SafeAreaView>
      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <TextInput
            style={[styles.searchInput, {borderWidth: 1, padding: 5, borderRadius: 15, backgroundColor: '#4B0082', color: '#ffffff' }]}
            value={searchKey}
            placeholderTextColor={'#ffffff'}
            onChangeText={setSearchKey}
            placeholder='O que deseja para hoje?'
          />
          {/* <Feather name="search" size={24} style={styles.searchIcon} /> */}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator size={'large'} color={'#4B0082'} />
      ) : searchKey.length === 0 ? (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Image
            source={require('../assets/search1.png')}
            style={styles.searchImage}
          />
          <Text >Inicie sua pesquisa</Text>
        </View>
      ) : searchResults.length === 0 ? (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Text style={styles.noDataText}>Nenhum resultado encontrado</Text>
        </View>
      ) : (
        <FlatList
          style={{ marginHorizontal: 12 }}
          data={searchResults}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <SearchTile item={item} />}
        />
      )}
    </SafeAreaView>
  );
};

export default Search;
