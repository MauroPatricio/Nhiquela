import { StyleSheet, Text, View, TouchableOpacity, Animated } from 'react-native';
import React, { useEffect, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

const SuccessPayment = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { orderCode } = route.params || {}; // Recebe o código do pedido

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // Animação de fade + scale
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Função para ir para a página principal (BottomNavigation)
  const goToHome = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'BottomNavigation' }],
      })
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Botão de Voltar */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() =>
          navigation.canGoBack() ? navigation.goBack() : goToHome()
        }
      >
        <Ionicons name="arrow-back" size={28} color="#333" />
      </TouchableOpacity>

      {/* Ícone de Sucesso */}
      <Animated.View
        style={[
          styles.iconContainer,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        <MaterialCommunityIcons
          name="check-circle"
          size={180}
          color="#4CAF50"
        />
      </Animated.View>

      {/* Mensagem */}
      <Animated.View style={[styles.messageContainer, { opacity: fadeAnim }]}>
        <Text style={styles.title}>Pagamento realizado com sucesso!</Text>
        <Text style={styles.subtitle}>
          O seu pedido foi criado com sucesso. Agora é só aguardar a confirmação do fornecedor.
        </Text>
        <Text style={styles.subtitle}>
          Você receberá uma notificação assim que o pedido for aceite.
        </Text>

        {orderCode && (
          <Text style={styles.orderCode}>
            Código do Pedido: <Text style={{ fontWeight: 'bold' }}>{orderCode}</Text>
          </Text>
        )}
      </Animated.View>

      {/* Botão Página Principal */}
      <TouchableOpacity
        style={styles.button}
        onPress={goToHome}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>Ir para a Página Principal</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default SuccessPayment;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
    paddingHorizontal: 24,
    paddingTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 8,
    zIndex: 1,
  },
  iconContainer: {
    marginTop: 80,
    marginBottom: 20,
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2e2e2e',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 6,
  },
  orderCode: {
    fontSize: 16,
    marginTop: 15,
    color: '#333',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    elevation: 4,
    width: '100%',
    alignItems: 'center',
    marginBottom: 30, // Evita colisão com a TabBar
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
