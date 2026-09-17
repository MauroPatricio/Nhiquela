import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import api from '../api/apiConfig';
import { useAuth } from '../context/AuthContext';

export default function BanAppealScreen({ navigation, route }) {
  const { user } = useAuth();
  const [justification, setJustification] = useState('');
  const [loading, setLoading] = useState(false);
  const banReason = route.params?.banReason || 'Motivo não especificado';

  const handleSubmit = async () => {
    if (!justification.trim()) {
      Alert.alert('Atenção', 'A justificação não pode estar vazia.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/drivers/appeal-ban', { justification });
      Alert.alert('Sucesso', 'A sua justificação foi submetida e será analisada pela nossa equipa.');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Erro', error.response?.data?.message || 'Falha ao submeter justificação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.alertBox}>
        <Text style={styles.alertTitle}>Conta Bloqueada ⚠️</Text>
        <Text style={styles.alertText}>
          A sua conta foi suspensa temporariamente devido a incumprimento ou denúncias.
        </Text>
        <Text style={styles.reasonText}>Motivo: {banReason}</Text>
      </View>

      <Text style={styles.label}>Apresente a sua Justificação para Análise</Text>
      <TextInput
        style={styles.input}
        multiline
        numberOfLines={6}
        placeholder="Escreva detalhadamente o que aconteceu..."
        value={justification}
        onChangeText={setJustification}
      />

      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleSubmit} 
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'A enviar...' : 'Submeter Apelo'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  alertBox: { backgroundColor: '#ffe5e5', padding: 15, borderRadius: 10, borderColor: '#ff4d4d', borderWidth: 1, marginBottom: 20 },
  alertTitle: { fontSize: 18, fontWeight: 'bold', color: '#cc0000', marginBottom: 5 },
  alertText: { fontSize: 14, color: '#cc0000', marginBottom: 10 },
  reasonText: { fontSize: 14, fontWeight: 'bold', color: '#000' },
  label: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 15, borderWidth: 1, borderColor: '#ddd', fontSize: 16, textAlignVertical: 'top', height: 150, marginBottom: 20 },
  button: { backgroundColor: '#8a2be2', padding: 15, borderRadius: 30, alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
