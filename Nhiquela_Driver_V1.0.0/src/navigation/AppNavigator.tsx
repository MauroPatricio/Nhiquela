// navigation/AppNavigator.tsx
import React, { useState, useEffect } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ROUTES, RootStackParamList } from "./routes";
import { LinearGradient } from "expo-linear-gradient";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useAuth } from "../context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

import HomeScreen from "../screens/HomeScreen";
import TripsScreen from "../screens/TripScreen";
import MapScreen from "../screens/MapScreen";
import ProfileScreen from "../screens/ProfileScreen";
import LoginScreen from "../screens/LoginScreen";
import OnboardingScreen from "../screens/OnboardingScreen";

import BottomMenu from "../components/BottomMenu";
import RegisterDriverScreen from "../screens/RegisterDriverScreen";
import DriverHeader from "../components/DriverHeader";
import EditProfileScreen from "../screens/EditProfileScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();

// Componente de Header Premium Personalizado
const PremiumHeaderTitle = ({ title, icon = "✨" }: { title: string; icon?: string }) => (
  <View style={styles.headerTitleContainer}>
    <Text style={styles.headerIcon}>{icon}</Text>
    <Text style={styles.headerTitle}>{title}</Text>
    <View style={styles.headerGlow} />
  </View>
);

// Componente de Header com Gradiente Azul
const GradientHeader = ({ children }: { children: React.ReactNode }) => (
  <LinearGradient
    colors={['#7F00FF', '#7F00FF']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 0 }}
    style={styles.gradientHeader}
  >
    {children}
  </LinearGradient>
);

function MainTabs() {
  const { user } = useAuth();
  
  const handleMenuPress = () => {
    console.log("Menu pressionado");
  };
  
  const handleNotificationPress = () => {
    console.log("Notificação pressionada");
  };

  return (
    <Tab.Navigator
      tabBar={(props) => <BottomMenu {...props} />}
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: 'transparent',
        },
        headerTitleStyle: {
          color: '#FFFFFF',
          fontWeight: 'bold',
        },
        headerBackground: () => (
          <GradientHeader>
            <View style={styles.headerBackgroundGlow} />
          </GradientHeader>
        ),
        headerTitleAlign: 'center',
        headerTintColor: '#FFFFFF',
      }}
    >
      <Tab.Screen
        name={ROUTES.HOME}
        component={HomeScreen}
        options={{
          header: () => (
            <DriverHeader
              onMenuPress={handleMenuPress}
              onNotificationPress={handleNotificationPress}
              todayEarnings={user?.deliveryman?.todayEarnings || "MZN 0,00"}
              totalPassengers={user?.deliveryman?.totalTrips || 0}
              credit={user?.deliveryman?.balance || "MZN 0,00"}
              userRating={user?.deliveryman?.rating || 5.0}
            />
          ),
        }}
      />
      <Tab.Screen
        name={ROUTES.TRIPS}
        component={TripsScreen}
        options={{
          headerTitle: () => <PremiumHeaderTitle title="Minhas Viagens" icon="🚀" />,
          headerRight: () => (
            <TouchableOpacity style={styles.headerButton}>
              <Text style={styles.headerButtonText}>📊 Estatísticas</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <Tab.Screen
        name={ROUTES.MAP}
        component={MapScreen}
        options={{
          headerTitle: () => <PremiumHeaderTitle title="Mapa em Tempo Real" icon="📍" />,
          headerRight: () => (
            <TouchableOpacity style={styles.headerButton}>
              <Text style={styles.headerButtonText}>🎯 Navegar</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <Tab.Screen
        name={ROUTES.PROFILE}
        component={ProfileScreen}
        options={{
          headerTitle: () => <PremiumHeaderTitle title="Meu Perfil" icon="" />,
          headerRight: () => (
            <TouchableOpacity style={styles.headerButton}>
              <Text style={styles.headerButtonText}>⚙️ Config</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <Tab.Screen
        name={ROUTES.UPDATE_PROFILE}
        component={EditProfileScreen}
        options={{
          headerTitle: () => <PremiumHeaderTitle title="Editar Perfil" icon="✏️" />,
        }}
      />
    </Tab.Navigator>
  );
}

// Componente de Loading
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#1E3A8A" />
      <Text style={styles.loadingText}>Carregando...</Text>
    </View>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, user } = useAuth();
  const [hasAcceptedPolicies, setHasAcceptedPolicies] = useState<boolean | null>(null);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);

  // Verificar se o usuário já aceitou as políticas
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const accepted = await AsyncStorage.getItem("hasAcceptedPolicies");
        setHasAcceptedPolicies(accepted === "true");
      } catch (error) {
        console.error("Erro ao verificar status do onboarding:", error);
        setHasAcceptedPolicies(false);
      } finally {
        setIsCheckingOnboarding(false);
      }
    };

    checkOnboardingStatus();
  }, []);

  // ✅ CORREÇÃO: Função para lidar com o término do onboarding
  const handleOnboardingComplete = () => {
    console.log("🔄 Onboarding completo, atualizando estado...");
    setHasAcceptedPolicies(true);
  };

  // Se ainda está carregando o contexto de auth ou verificando onboarding
  if (isCheckingOnboarding) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: '#F8F9FF',
        },
      }}
    >
      {/* Fluxo de Navegação Principal */}
      {!hasAcceptedPolicies ? (
        // Primeiro acesso - Mostrar Onboarding
        <Stack.Screen name={ROUTES.ONBOARDING}>
          {(props) => (
            <OnboardingScreen 
              {...props} 
              onOnboardingComplete={handleOnboardingComplete}
            />
          )}
        </Stack.Screen>
      ) : !isAuthenticated ? (
        // Usuário não autenticado - Mostrar Login
        <Stack.Screen
          name={ROUTES.LOGIN}
          component={LoginScreen}
          options={{
            animation: 'fade',
          }}
        />
      ) : (
        // Usuário autenticado - Mostrar App Principal
        <Stack.Screen
          name={ROUTES.MAIN_TABS}
          component={MainTabs}
          options={{
            animation: 'slide_from_bottom',
          }}
        />
      )}

      {/* Rotas Adicionais - Acessíveis de qualquer lugar */}
      <Stack.Screen
        name={ROUTES.REGISTER_USER}
        component={RegisterDriverScreen}
        options={{
          headerShown: true,
          headerTitle: () => <PremiumHeaderTitle title="Cadastro" icon="" />,
          headerStyle: {
            backgroundColor: 'transparent',
          },
          headerBackground: () => (
            <GradientHeader>
              <View style={styles.headerBackgroundGlow} />
            </GradientHeader>
          ),
          headerTintColor: '#FFFFFF',
        }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FF',
  },
  loadingText: {
    fontSize: 18,
    color: '#1E3A8A',
    marginTop: 10,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerIcon: {
    fontSize: 20,
    marginRight: 8,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 0.5,
  },
  headerGlow: {
    position: 'absolute',
    top: -10,
    width: '120%',
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    zIndex: -1,
  },
  gradientHeader: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerBackgroundGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#E0AAFF',
    shadowColor: '#E0AAFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  headerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});