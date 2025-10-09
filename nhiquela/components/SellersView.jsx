import { ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import React, { useEffect, useState, useCallback } from 'react';
import { ArrowRightIcon } from 'react-native-heroicons/outline';
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
      const response = await api.get('/users/sellers');
      if (response.status === 200) {
        setSellers(response.data.sellers);
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

  // Atualiza a cada 30 segundos
  useEffect(() => {
    fetchData(); // Chamada inicial

    const interval = setInterval(() => {
      fetchData();
    }, 30000); // Atualiza a cada 30 segundos

    return () => clearInterval(interval); // Limpa ao desmontar
  }, []);

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
        contentContainerStyle={{ paddingHorizontal: 1 }}
        showsHorizontalScrollIndicator={false}
      >
        {sellers ? (
          sellers.map(seller => (
            <SellerCard
              key={seller._id}
              id={seller._id}
              name={seller.seller.name}
              logo={seller.seller.logo}
              description={seller.seller.description}
              rating={seller.seller.rating}
              numReviews={seller.seller.numReviews}
              province={seller.seller.province}
              address={seller.seller.address}
              latitude={seller.seller.latitude}
              longitude={seller.seller.longitude}
              openstore={seller.seller.openstore}
            />
          ))
        ) : (
          <Text style={styles.loadingText}>{isLoading ? 'Carregando vendedores...' : 'Nenhum vendedor encontrado.'}</Text>
        )}
      </ScrollView>
    </View>
  );
};

export default SellersView;

const styles = StyleSheet.create({
  sellerWrapper: {
    marginTop: 15,
    justifyContent: 'space-between',
    flexDirection: "row",
    marginLeft: 15,
    marginRight: 15,
  },
  title: {
    fontWeight: "500",
    fontSize: 19
  },
  text: {
    fontSize: 13,
    marginLeft: 15,
    letterSpacing: 1.2
  },
  loadingText: {
    fontSize: 14,
    color: 'gray',
    marginLeft: 15,
    marginTop: 10
  }
});
