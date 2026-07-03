import { ScrollView, StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import React, { useEffect, useState, useCallback } from 'react';
import { ArrowRightIcon } from 'react-native-heroicons/outline';
import { Ionicons } from '@expo/vector-icons';
import api from '../hooks/createConnectionApi';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import EstablishmentCard from './EstablishmentCard2';
import { io } from 'socket.io-client';

export default function EstablishmentsView1({ categoryId, title }) {
  const navigation = useNavigation();
  const [isLoading, setLoading] = useState(true);
  const [tipoestabelecimentos, setTipoestabelecimentos] = useState([]);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/provider-types');

      if (response.status === 200) {
        // Filtrar apenas os que são do tipo 'Business' (Estabelecimentos) e que estão ativos
        const businessTypes = response.data.filter(
          (tipo) => tipo.isActive !== false && (tipo.classificationId?.name === 'Business' || tipo.classificationId?.name?.toLowerCase() === 'business')
        );
        setTipoestabelecimentos(businessTypes);
      }
    } catch (error) {
      console.error('Erro ao buscar Tipos de estabelecimentos:', error);
      setError('Erro ao carregar tipos de estabelecimentos.');
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

  useEffect(() => {
    let socketUrl = process.env.EXPO_PUBLIC_SOCKET_URL || process.env.REACT_APP_SOCKET_URL;
    if (!socketUrl) {
      socketUrl = typeof api === 'string' ? api : api.defaults?.baseURL?.replace('/api', '') || 'https://api.nhiquelaservicos.com';
    }
    
    const socket = io(socketUrl, { transports: ['websocket'] });
    
    socket.on('catalogUpdated', () => {
      fetchData();
    });

    return () => {
      socket.off('catalogUpdated');
      socket.disconnect();
    };
  }, []);

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
        <TouchableOpacity onPress={() => navigation.navigate('EstablishmentList', { tipoestabelecimentos })}>
          <ArrowRightIcon color={"#7F00FF"} size={30} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        horizontal
        contentContainerStyle={{ paddingHorizontal: 15, paddingVertical: 5 }}
        showsHorizontalScrollIndicator={false}
      >
        {tipoestabelecimentos && tipoestabelecimentos.length > 0 ? (
          tipoestabelecimentos.map(tipoestabelecimento => (
            <EstablishmentCard
              key={tipoestabelecimento._id}
              id={tipoestabelecimento._id}
              nome={tipoestabelecimento.name || tipoestabelecimento.nome}
              img={tipoestabelecimento.iconUrl || tipoestabelecimento.img}
            />
          ))
        ) : (
          <View style={styles.emptyCard}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#7F00FF" />
            ) : (
              <>
                <Ionicons name="business-outline" size={20} color="#9CA3AF" style={{ marginRight: 8 }} />
                <Text style={styles.emptyCardText}>Sem estabelecimentos registados de momento</Text>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

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
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginHorizontal: 15,
    marginVertical: 10,
    width: 320,
  },
  emptyCardText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  }
});
