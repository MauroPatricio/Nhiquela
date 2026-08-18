import { View, Text, TextInput, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import styles from './search.style';
import api from '../hooks/createConnectionApi';
import SearchTile from '../components/SearchTile';
import { Feather, Ionicons } from '@expo/vector-icons';

const DEBOUNCE_MS = 400;  // aguardar 400ms após o utilizador parar de escrever
const MIN_CHARS   = 2;    // mínimo de caracteres para iniciar a pesquisa

const Search = () => {
  const [searchKey, setSearchKey]       = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading]       = useState(false);
  const debounceTimer = useRef(null);
  const abortController = useRef(null);

  const handleSearch = useCallback(async (query) => {
    // Cancelar pedido anterior se ainda estiver em curso
    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();

    setIsLoading(true);
    try {
      const response = await api.get(
        `/products/search?query=${encodeURIComponent(query)}&pageSize=20`,
        { signal: abortController.current.signal }
      );
      setSearchResults(response.data.products || []);
    } catch (error) {
      if (error?.code !== 'ERR_CANCELED' && error?.name !== 'AbortError') {
        console.log('Erro na pesquisa:', error);
        setSearchResults([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Limpar timer anterior
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    const trimmed = searchKey.trim();

    if (trimmed.length < MIN_CHARS) {
      setSearchResults([]);
      setIsLoading(false);
      return;
    }

    // Debounce: esperar 400ms antes de enviar o pedido
    debounceTimer.current = setTimeout(() => {
      handleSearch(trimmed);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchKey, handleSearch]);

  // Limpar ao desmontar
  useEffect(() => {
    return () => {
      if (abortController.current) abortController.current.abort();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

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
      ) : searchKey.trim().length < MIN_CHARS ? (
        <View style={styles.centerContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="create-outline" size={44} color="#7F00FF" />
          </View>
          <Text style={styles.emptyTitle}>Continue a escrever...</Text>
          <Text style={styles.emptySubtitle}>
            Escreva pelo menos {MIN_CHARS} caracteres para iniciar a pesquisa.
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
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
        />
      )}
    </SafeAreaView>
  );
};

export default Search;
