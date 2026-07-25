import { ScrollView, StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import React, { useEffect, useState, useCallback } from 'react';
import { ArrowRightIcon } from 'react-native-heroicons/outline';
import { Ionicons } from '@expo/vector-icons';
import SellerCard from './SellerCard';
import api from '../hooks/createConnectionApi';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

const SellersView = ({ title, description }) => {
  const navigation = useNavigation();
  const [isLoading, setLoading] = useState(false);
  const [sellers, setSellers] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/providers?type=Business');
      if (response.status === 200) {
        setSellers(response.data.providers.slice(0, 10)); // Limit to 10
      }
    } catch (error) {
      console.error('Erro ao buscar vendedores:', error);
      setError('Erro ao carregar vendedores.');
    } finally {
      setLoading(false);
    }
  };

  // Atualiza os sellers ao entrar na tela
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );


  return (
    <View>
      <View style={styles.sellerWrapper}>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('SellersList', { sellers })}>
          <ArrowRightIcon color={"#7F00FF"} size={30} />
        </TouchableOpacity>
      </View>

      <Text style={styles.text}>{description}</Text>

      <ScrollView 
        horizontal
        contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 10 }}
        showsHorizontalScrollIndicator={false}
      >
        {sellers && sellers.length > 0 ? (
          sellers.map(seller => (
            <SellerCard
              key={seller._id}
              id={seller._id}
              name={seller.name}
              logo={seller.businessData?.logo || 'https://via.placeholder.com/65'}
              description={seller.businessData?.description}
              rating={seller.rating}
              numReviews={seller.numReviews}
              province={seller.location?.province}
              tipoEstabelecimento={seller.categoryId}
              address={seller.location?.address}
              latitude={seller.location?.lat}
              longitude={seller.location?.lng}
              openstore={seller.businessData?.isOpen}
            />
          ))
        ) : (
          <View style={styles.emptyCard}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#7F00FF" />
            ) : (
              <>
                <Ionicons name="storefront-outline" size={20} color="#9CA3AF" style={{ marginRight: 8 }} />
                <Text style={styles.emptyCardText}>Sem fornecedores registados de momento</Text>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default SellersView;

const styles = StyleSheet.create({
  sellerWrapper: {
    marginTop: 20,
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: "row",
    paddingHorizontal: 18,
  },
  title: {
    fontWeight: "800",
    fontSize: 22,
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  text: {
    fontSize: 14,
    color: '#64748B',
    paddingHorizontal: 18,
    marginTop: 4,
    marginBottom: 8,
    lineHeight: 20,
  },
  emptyCard: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    paddingVertical: 30,
    paddingHorizontal: 20,
    marginHorizontal: 18,
    marginVertical: 10,
    width: 320,
  },
  emptyCardText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 10,
  }
});
