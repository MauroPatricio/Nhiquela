import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../hooks/createConnectionApi';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WithdrawalRequestsScreen = () => {
  const navigation = useNavigation();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');

  useEffect(() => {
    const loadData = async () => {
      const userData = JSON.parse(await AsyncStorage.getItem('userData'));
      setToken(userData?.token);
      fetchRequests(userData?.token);
    };
    loadData();
  }, []);

  const fetchRequests = async (token) => {
    if (!token) return;
    try {
      const res = await api.get('/wallet/pending', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(res.data || []);
    } catch (err) {
      console.error("Erro ao buscar solicitações:", err);
    } finally {
      setLoading(false);
    }
  };

  const authorizeRequest = async (id) => {
    try {
      await api.put(`/wallet/${id}/authorize`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Alert.alert("Sucesso", "Solicitação autorizada!");
      fetchRequests(token);
    } catch (err) {
      Alert.alert("Erro", "Não foi possível autorizar.");
    }
  };

  const cancelRequest = async (id) => {
    try {
      await api.put(`/wallet/${id}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Alert.alert("Cancelado", "Solicitação cancelada e valor devolvido!");
      fetchRequests(token);
    } catch (err) {
      Alert.alert("Erro", "Não foi possível cancelar.");
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <Text style={styles.text}>Método: {item.method}</Text>
      <Text style={styles.text}>Wallet: {item.walletId}</Text>
      <Text style={styles.text}>Valor: {item.amount} MT</Text>
      <Text style={styles.text}>Descrição: {item.description}</Text>
      <Text style={styles.text}>Status: {item.status}</Text>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.approve} onPress={() => authorizeRequest(item._id)}>
          <Text style={styles.actionText}>Autorizar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.reject} onPress={() => cancelRequest(item._id)}>
          <Text style={styles.actionText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#7F00FF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Autorizar Levantamento</Text>
        <View style={{ width: 24 }} /> 
      </View>

      {/* Lista */}
      <FlatList
        data={requests}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>Nenhuma solicitação pendente</Text>}
      />
    </SafeAreaView>
  );
};

export default WithdrawalRequestsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
        marginTop: 15

  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
    textAlign: 'center',
    marginTop: 15
  },
  item: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  text: {
    fontSize: 15,
    marginBottom: 4,
    color: '#333',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  approve: {
    backgroundColor: 'green',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  reject: {
    backgroundColor: 'red',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  actionText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  empty: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#555',
  },
});
