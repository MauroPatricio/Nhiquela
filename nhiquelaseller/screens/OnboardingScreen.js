import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  useWindowDimensions,
  Animated,
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const PURPLE = '#7F00FF';

const slides = [
  {
    id: '1',
    title: 'Venda para milhares de clientes.',
    description: 'Cadastre a sua loja e publique os seus produtos de forma simples e rápida.',
    icon: 'store-outline'
  },
  {
    id: '2',
    title: 'Gerencie tudo num só lugar.',
    description: 'Controle encomendas, stock, preços e vendas diretamente na aplicação.',
    icon: 'view-dashboard-outline'
  },
  {
    id: '3',
    title: 'Receba pagamentos com segurança.',
    description: 'As vendas são processadas pela plataforma e o seu saldo fica disponível na carteira Nhiquela.',
    icon: 'wallet-outline'
  },
  {
    id: '4',
    title: 'Faça o seu negócio crescer.',
    description: 'Alcance novos clientes e aumente as suas vendas com a Nhiquela.',
    icon: 'trending-up'
  }
];

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const navigation = useNavigation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesRef = useRef(null);

  const viewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems[0]) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = async () => {
    if (currentIndex < slides.length - 1) {
      slidesRef.current.scrollToIndex({ index: currentIndex + 1 });
    } else {
      await finishOnboarding();
    }
  };

  const finishOnboarding = async () => {
    try {
      await AsyncStorage.setItem('@hasViewedOnboardingSeller', 'true');
      navigation.replace('Login'); // Ajustar para o route name real
    } catch (err) {
      console.log('Error saving onboarding flag', err);
    }
  };

  const renderItem = ({ item }) => {
    return (
      <View style={[styles.slide, { width }]}>
        <View style={styles.imageContainer}>
          <MaterialCommunityIcons name={item.icon} size={120} color={PURPLE} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={finishOnboarding} style={styles.skipButton}>
          <Text style={styles.skipText}>Ignorar</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 3 }}>
        <FlatList
          data={slides}
          renderItem={renderItem}
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          bounces={false}
          keyExtractor={(item) => item.id}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
            useNativeDriver: false,
          })}
          onViewableItemsChanged={viewableItemsChanged}
          viewabilityConfig={viewConfig}
          ref={slidesRef}
        />
      </View>

      <View style={styles.footer}>
        <View style={styles.paginator}>
          {slides.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [10, 20, 10],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i.toString()}
                style={[styles.dot, { width: dotWidth, opacity }]}
              />
            );
          })}
        </View>

        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>
            {currentIndex === slides.length - 1 ? 'Começar a vender' : 'Seguinte'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  skipButton: {
    padding: 10,
  },
  skipText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '600',
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
  },
  imageContainer: {
    flex: 0.6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 0.4,
    alignItems: 'center',
  },
  title: {
    fontWeight: '800',
    fontSize: 28,
    marginBottom: 10,
    color: '#1A1A1A',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  description: {
    fontWeight: '400',
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: 40,
  },
  paginator: {
    flexDirection: 'row',
    height: 64,
    alignItems: 'center',
  },
  dot: {
    height: 10,
    borderRadius: 5,
    backgroundColor: PURPLE,
    marginHorizontal: 8,
  },
  button: {
    backgroundColor: PURPLE,
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 30,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
