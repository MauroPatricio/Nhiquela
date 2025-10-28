import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Define aqui a cor principal da Nhiquela
const PRIMARY_COLOR = '#7F00FF'; // amarelo vibrante
const TEXT_COLOR = '#1A1A1A'; // preto suave

export default function UnderDevelopmentScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/nhiquela2.png')} 
        style={styles.logo}
        resizeMode="contain"
      />

      {/* Ícone informativo */}
      <Ionicons name="construct-outline" size={80} color={PRIMARY_COLOR} style={{ marginBottom: 20 }} />

      {/* Texto principal */}
      <Text style={styles.title}>Em desenvolvimento...</Text>

      {/* Texto secundário */}
      <Text style={styles.subtitle}>
        Estamos a preparar algo incrível para si! 🚀
      </Text>

      {/* Indicador animado */}
      <ActivityIndicator size="large" color={PRIMARY_COLOR} style={{ marginTop: 30 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  logo: {
    width: 180,
    height: 100,
    marginBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: TEXT_COLOR,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    maxWidth: 300,
  },
});
