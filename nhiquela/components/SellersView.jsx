import { ScrollView, StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import React, { useEffect, useState, useCallback } from 'react';
import { ArrowRightIcon } from 'react-native-heroicons/outline';
import { Ionicons } from '@expo/vector-icons';
import SellerCard from './SellerCard';
import api from '../hooks/createConnectionApi';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import io from 'socket.io-client';

const isDev = process.env.NODE_ENV !== 'production';
const SOCKET_URL = typeof api === 'string' ? api : (api.defaults?.baseURL?.replace('/api', '') || (isDev ? 'http://192.168.0.5:5002' : 'https://api.nhiquelaservicos.com'));
const socket = io(`${SOCKET_URL}`);

const SellersView = ({ title, description }) => {
  const navigation = useNavigation();
  const [isLoading, setLoading] = useState(false);
  const [sellers, setSellers] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const timestamp = new Date().getTime();
      const response = await api.get(`/users/sellers?pageSize=10&t=${timestamp}`);
      console.log('--- SELLERS VIEW API RESPONSE ---');
      console.log('Status:', response.status);
      console.log('Data:', JSON.stringify(response.data).substring(0, 200)); // Log first 200 chars
      if (response.status === 200) {
        // The /users/sellers endpoint returns an object with a 'sellers' property
        const fetchedSellers = response.data.sellers || (Array.isArray(response.data) ? response.data : []);
        console.log('Fetched Sellers length:', fetchedSellers.length);
        setSellers(fetchedSellers);
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

  // Escuta actualizações do estado da loja em tempo real
  useEffect(() => {
    const handleStoreStatus = ({ userId, isOpen }) => {
      if (!userId) return;
      
      setSellers(prev => {
        if (!prev) return prev;
        return prev.map(s => 
          String(s._id) === String(userId) 
            ? { ...s, seller: { ...s.seller, openstore: isOpen } } 
            : s
        );
      });
    };

    socket.on("storeStatusChanged", handleStoreStatus);

    return () => {
      socket.off("storeStatusChanged", handleStoreStatus);
    };
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
        contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 10 }}
        showsHorizontalScrollIndicator={false}
      >
        {sellers && sellers.length > 0 ? (
          sellers.map(item => (
            <SellerCard
              key={item._id}
              id={item._id}
              name={item.seller?.name || item.name}
              description={item.seller?.description}
              logo={item.seller?.logo || 'https://via.placeholder.com/65'}
              rating={item.seller?.rating || item.rating || 0}
              numReviews={item.seller?.numReviews || 0}
              province={item.location?.province}
              tipoEstabelecimento={item.seller?.tipoEstabelecimento}
              address={item.seller?.address || item.location?.address}
              latitude={item.seller?.latitude || item.location?.lat}
              longitude={item.seller?.longitude || item.location?.lng}
              openstore={item.seller?.openstore === true}
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
