import { View, Text, TextInput, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import styles from './search.style';
import api from '../hooks/createConnectionApi';
import SearchTile from '../components/SearchTile';
import { Feather, Ionicons } from '@expo/vector-icons';

const Search = () => {
  const [searchKey, setSearchKey] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (query) => {
    setIsLoading(true);
    try {
      const response = await api.get(`/products/search?query=${query}`);
      setSearchResults(response.data.products || []);
    } catch (error) {
      console.log('Failed to get Products', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (searchKey.trim().length > 0) {
      handleSearch(searchKey);
    } else {
      setSearchResults([]);
    }
  }, [searchKey]);

  return (
    <SafeAreaView style={{ backgroundColor: 'white', flex: 1 }}>
      {/* Search Input Bar */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <View style={styles.searchWrapper}>
          <TextInput
            style={styles.searchInput}
            value={searchKey}
            placeholderTextColor="#9CA3AF"
            onChangeText={setSearchKey}
            placeholder="O que procura hoje?"
          />
          {searchKey.length > 0 && (
            <TouchableOpacity 
              style={styles.clearButton} 
              onPress={() => setSearchKey('')}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Content Areas */}
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#7F00FF" />
        </View>
      ) : searchKey.trim().length === 0 ? (
        <View style={styles.centerContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="search-outline" size={44} color="#7F00FF" />
          </View>
          <Text style={styles.emptyTitle}>O que procuras hoje?</Text>
          <Text style={styles.emptySubtitle}>
            Pesquise por marcas, produtos ou categorias de forma rápida e simples.
          </Text>
        </View>
      ) : searchResults.length === 0 ? (
        <View style={styles.centerContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="alert-circle-outline" size={44} color="#6B7280" />
          </View>
          <Text style={styles.emptyTitle}>Nenhum resultado</Text>
          <Text style={styles.emptySubtitle}>
            Não encontramos nenhum produto correspondente. Tente usar outros termos de pesquisa.
          </Text>
        </View>
      ) : (
        <FlatList
          style={{ marginTop: 8 }}
          data={searchResults}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <SearchTile item={item} />}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

export default Search;
