import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, ActivityIndicator, Platform, KeyboardAvoidingView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../hooks/createConnectionApi';
import SearchTile from '../components/SearchTile';
import { COLORS, SIZES, RADIUS, SHADOWS } from '../constants/theme';
import { useNavigation } from '@react-navigation/native';

const Search = () => {
  const [searchKey, setSearchKey] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();

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
    const delayDebounceFn = setTimeout(() => {
      if (searchKey.trim().length > 0) {
        handleSearch(searchKey);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchKey]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        
        {/* Header de Pesquisa */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.searchWrapper}>
            <Ionicons name="search" size={20} color={COLORS.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              value={searchKey}
              placeholder="Pesquisar produtos..."
              placeholderTextColor={COLORS.textMuted}
              onChangeText={setSearchKey}
              autoFocus
            />
            {searchKey.length > 0 && (
              <TouchableOpacity onPress={() => setSearchKey('')}>
                <Ionicons name="close-circle" size={20} color={COLORS.textMuted} style={styles.clearIcon} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Resultados */}
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>A procurar...</Text>
          </View>
        ) : searchKey.trim().length === 0 ? (
          <View style={styles.centerContainer}>
            <Ionicons name="search-circle-outline" size={80} color={COLORS.surface2} />
            <Text style={styles.emptyTitle}>Inicie a sua pesquisa</Text>
            <Text style={styles.emptySub}>Procure por nome de produtos</Text>
          </View>
        ) : searchResults.length === 0 ? (
          <View style={styles.centerContainer}>
            <Ionicons name="document-text-outline" size={80} color={COLORS.surface2} />
            <Text style={styles.emptyTitle}>Nenhum resultado</Text>
            <Text style={styles.emptySub}>Não encontrámos produtos para "{searchKey}"</Text>
          </View>
        ) : (
          <FlatList
            style={styles.list}
            contentContainerStyle={styles.listContent}
            data={searchResults}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => <SearchTile item={item} />}
            showsVerticalScrollIndicator={false}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.full,
    paddingHorizontal: 16,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  clearIcon: {
    marginLeft: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: SIZES.base,
    color: COLORS.text,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
  },
  emptyTitle: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySub: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
});

export default Search;
