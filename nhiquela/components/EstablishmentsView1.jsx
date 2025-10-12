import { ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import React, { useEffect, useState, useCallback } from 'react';
import { ArrowRightIcon } from 'react-native-heroicons/outline';
import api from '../hooks/createConnectionApi';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import EstablishmentCard from './EstablishmentCard2';

const EstablishmentsView = ({ title }) => {
  const navigation = useNavigation();
  const [isLoading, setLoading] = useState(false);
  const [tipoestabelecimentos, setTipoestabelecimentos] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/tipoestabelecimentos');

      if (response.status === 200) {
        setTipoestabelecimentos(response.data.tipoestabelecimentos);
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
        contentContainerStyle={{ paddingHorizontal: 1 }}
        showsHorizontalScrollIndicator={false}
      >
        {tipoestabelecimentos ? (
          tipoestabelecimentos.map(tipoestabelecimento => (
            <EstablishmentCard
              key={tipoestabelecimento._id}
              id={tipoestabelecimento._id}
              nome={tipoestabelecimento.nome}
              img={tipoestabelecimento.img}
            />
          ))
        ) : (
          <Text style={styles.loadingText}>{isLoading ? 'Carregando Estabelecimentos...' : 'Nenhum Estabelecimento encontrado.'}</Text>
        )}
      </ScrollView>
    </View>
  );
};

export default EstablishmentsView;

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
