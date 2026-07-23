// navigation/AppNavigator.tsx
import React, { useState, useEffect, useRef } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ROUTES, RootStackParamList } from "./routes";
import { LinearGradient } from "expo-linear-gradient";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useAuth } from "../context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRef as useImportedRef } from "react";
import api from "../api/apiConfig";
import websocketService from "../services/websocketService";

import HomeScreen from "../screens/HomeScreen";
import TripsScreen from "../screens/TripScreen";
import MapScreen from "../screens/MapScreen";
import ProfileScreen from "../screens/ProfileScreen";
import LoginScreen from "../screens/LoginScreen";
import OnboardingScreen from "../screens/OnboardingScreen";
import WalletScreen from "../screens/WalletScreen";
import EditProfileScreen from "../screens/EditProfileScreen";
import BanAppealScreen from "../screens/BanAppealScreen";
import TripChatScreen from "../screens/TripChatScreen";

import BottomMenu from "../components/BottomMenu";
import RegisterDriverScreen from "../screens/RegisterDriverScreen";
import DriverHeader from "../components/DriverHeader";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();

// Componente de Header Premium
const PremiumHeaderTitle = ({ title }: { title: string }) => (
  <View style={styles.headerTitleContainer}>
    <Text style={styles.headerTitle}>{title}</Text>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// MainTabs: WalletScreen é agora um separador direto do Tab Navigator.
// Isso resolve DEFINITIVAMENTE o problema do goBack() porque o Tab Navigator
// não usa pilha (stack) — trocar de tab é sempre seguro.
// ─────────────────────────────────────────────────────────────────────────────
function MainTabs() {
  const { user, updateDeliveryman } = useAuth();
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    let intervalId: any;
    
    const fetchWalletGlobalData = async () => {
      try {
        const currentUser = userRef.current;
        if (!currentUser?.token) return;
        
        const headers = { authorization: `Bearer ${currentUser.token}` };
        const [balanceRes, earningsRes] = await Promise.allSettled([
          api.get('/wallet/balance', { headers }),
          api.get('/wallet/driver-earnings', { headers })
        ]);
        
        let newBalance = currentUser?.deliveryman?.balance;
        let newTrips = currentUser?.deliveryman?.totalTrips;
        let newTodayEarnings = currentUser?.deliveryman?.todayEarnings;

        if (balanceRes.status === 'fulfilled') {
          newBalance = `MT ${parseFloat(balanceRes.value.data.available_balance || 0).toFixed(2)}`;
        }
        if (earningsRes.status === 'fulfilled') {
          newTodayEarnings = parseFloat(earningsRes.value.data.today || 0).toString();
          newTrips = (earningsRes.value.data.totalTrips ?? (earningsRes.value.data.tripsToday || 0)).toString();
        }

        if (
          currentUser?.deliveryman?.balance !== newBalance ||
          currentUser?.deliveryman?.totalTrips !== newTrips ||
          currentUser?.deliveryman?.todayEarnings !== newTodayEarnings
        ) {
          updateDeliveryman({
            balance: newBalance,
            todayEarnings: newTodayEarnings,
            totalTrips: newTrips
          });
        }
      } catch (error) {
        console.error("Sync error", error);
      }
    };

    fetchWalletGlobalData();
    // Alta Performance: Alterado de 5s para 60s para evitar DDOS no backend
    intervalId = setInterval(fetchWalletGlobalData, 60000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <Tab.Navigator
      id="RootTabNavigator"
      tabBar={(props) => <BottomMenu {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name={ROUTES.HOME}
        component={HomeScreen}
        options={({ navigation }) => ({
          headerShown: true,
          header: () => (
            <DriverHeader
              onMenuPress={() => {}}
              onNotificationPress={() => {}}
              onEarningsPress={() => navigation.navigate(ROUTES.EARNINGS)}
              todayEarnings={!isNaN(Number(user?.deliveryman?.todayEarnings)) ? `MT ${Number(user?.deliveryman?.todayEarnings || 0).toFixed(2)}` : "MT 0.00"}
              totalPassengers={user?.deliveryman?.totalTrips || 0}
              credit={user?.deliveryman?.balance || "MT 0.00"}
              userRating={user?.deliveryman?.rating || 5.0}
            />
          ),
        })}
      />

      <Tab.Screen
        name={ROUTES.TRIPS}
        component={TripsScreen}
        options={{ headerShown: false }}
      />

      <Tab.Screen
        name={ROUTES.MAP}
        component={MapScreen}
        options={{
          headerShown: false,
          tabBarButton: () => null, // Escondido do menu mas acessível via navigate
        }}
      />

      {/* ✅ Wallet como separador direto — goBack() não é necessário, basta mudar de tab */}
      <Tab.Screen
        name="Wallet"
        component={WalletScreen}
        options={{ headerShown: false }}
      />

      <Tab.Screen
        name={ROUTES.PROFILE}
        component={ProfileScreen}
        options={{ headerShown: false }}
      />

      {/* Editar Perfil — oculto do menu mas navegável */}
      <Tab.Screen
        name={ROUTES.UPDATE_PROFILE}
        component={EditProfileScreen}
        options={{
          headerShown: true,
          headerTitle: () => <PremiumHeaderTitle title="Editar Perfil" />,
          tabBarButton: () => null,
        }}
      />
    </Tab.Navigator>
  );
}

// Ecrã de carregamento
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#7F00FF" />
      <Text style={styles.loadingText}>Carregando...</Text>
    </View>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoadingSession, user, logout } = useAuth();
  const [hasAcceptedPolicies, setHasAcceptedPolicies] = useState<boolean | null>(null);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const navigationRef = useRef<any>(null);

  // 🚫 Ouvir evento de ban em tempo real e forçar logout
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleBan = async (data: any) => {
      console.log('🚫 [AppNavigator] Conta banida:', data);
      await logout(); // Apaga sessão local completamente
    };

    websocketService.on('account_banned', handleBan);
    return () => {
      websocketService.off('account_banned', handleBan);
    };
  }, [isAuthenticated, logout]);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const accepted = await AsyncStorage.getItem("hasAcceptedPolicies");
        setHasAcceptedPolicies(accepted === "true");
      } catch {
        setHasAcceptedPolicies(false);
      } finally {
        setIsCheckingOnboarding(false);
      }
    };
    checkOnboardingStatus();
  }, []);

  const handleOnboardingComplete = () => {
    setHasAcceptedPolicies(true);
  };

  if (isCheckingOnboarding || isLoadingSession) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator
      id="RootStackNavigator"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F8F9FF' },
      }}
    >
      {!hasAcceptedPolicies ? (
        <Stack.Screen name={ROUTES.ONBOARDING}>
          {(props) => (
            <OnboardingScreen {...props} onOnboardingComplete={handleOnboardingComplete} />
          )}
        </Stack.Screen>
      ) : !isAuthenticated ? (
        <Stack.Screen
          name={ROUTES.LOGIN}
          component={LoginScreen}
          options={{ animation: 'fade' }}
        />
      ) : (
        <Stack.Screen
          name={ROUTES.MAIN_TABS}
          component={MainTabs}
          options={{ animation: 'slide_from_bottom' }}
        />
      )}

      {/* Registo de conta — acessível antes do login */}
      <Stack.Screen name={ROUTES.REGISTER_USER} component={RegisterDriverScreen} />

      {/* Apelo de bloqueio — acessível pós-login para motoristas banidos */}
      <Stack.Screen
        name={ROUTES.BAN_APPEAL}
        component={BanAppealScreen}
        options={{ headerShown: true, title: 'Justificação de Conta', headerBackVisible: false }}
      />

      {/* Chat de Viagem — acessível durante viagem ativa */}
      <Stack.Screen
        name={ROUTES.TRIP_CHAT}
        component={TripChatScreen}
        options={{ headerShown: true, title: 'Chat da Viagem' }}
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
    fontSize: 16,
    color: '#7F00FF',
    marginTop: 12,
    fontWeight: '600',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  gradientHeader: {
    flex: 1,
    overflow: 'hidden',
  },
});
