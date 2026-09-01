// App.tsx
import './appPolyfills';
import React, { useState, useEffect, useRef } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
  Vibration,
  Text,
} from "react-native";
import {
  NavigationContainer,
  createNavigationContainerRef,
} from "@react-navigation/native";
import AppNavigator from "./src/navigation/AppNavigator";
import { LoadingProvider, useLoadingContext } from "./src/context/LoadingContext";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import FlashMessage from "react-native-flash-message";
import api from "./src/api/apiConfig";
import "./src/services/LocationService"; // Define as tarefas de background no escopo global
import websocketService from "./src/services/websocketService";
// 🔗 Referência global de navegação
export const navigationRef = createNavigationContainerRef();

// ⚙️ Configuração de comportamento das notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// 🔔 Função para registrar o token do dispositivo
async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    Alert.alert("As notificações push só funcionam em dispositivos físicos.");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    Alert.alert("Permissão para notificações negada!");
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId || 'nhiquela-4bfb5';
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

  console.log("📩 Expo Push Token:", token);

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("driver_alerts_urgent", {
      name: "Alertas de Pedido Urgente",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500, 250, 500],
      lightColor: "#FF231F7C",
      sound: "calldriver.mp3",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true, // Força a notificação a tocar mesmo se não perturbar ativo (depende de permissões em alguns Androids)
    });
  }

  try {
    await Notifications.registerTaskAsync('BACKGROUND-NOTIFICATION-TASK');
    console.log("✅ Background notification task registered successfully");
  } catch (err) {
    console.log("❌ Failed to register background task", err);
  }

  return token;
}

// 💡 Conteúdo principal da aplicação
function AppContent() {
  const [loading, setLoading] = useState(true);
  const { showLoading, hideLoading } = useLoadingContext();
  const { user, isAuthenticated } = useAuth();
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    const registerToken = async () => {
      // 📌 Definir Categorias de Notificação (Botões Aceitar/Rejeitar)
      await Notifications.setNotificationCategoryAsync('new_order', [
        {
          identifier: 'accept',
          buttonTitle: 'Aceitar Viagem',
          options: { opensAppToForeground: true }
        },
        {
          identifier: 'reject',
          buttonTitle: 'Rejeitar',
          options: { isDestructive: true }
        }
      ]);

      const deviceToken = await registerForPushNotificationsAsync();
      if (!deviceToken) return;

      try {
        // AuthContext saves user to '@app:user', not 'userData'
        const userDataString = await AsyncStorage.getItem("@app:user");
        if (!userDataString) return;

        const userData = JSON.parse(userDataString);
        const userId = userData?._id || userData?.id;
        const userName = userData?.name || userData?.deliveryman?.name || "Driver";
        if (!userId) return;


        await api.post("/notifications/savedevicetoken", {
          deviceToken,
          userId,
          platform: Platform.OS,
        });
      } catch (err) {
        console.log("⚠️ Erro no Zego/Push token:", err.message);
      }
    };

    if (isAuthenticated && user) {
      registerToken();
    }

    // 📨 Listener para notificações em foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("📩 Notificação recebida:", notification);

        const title = notification.request.content.title || "Nova Notificação";
        const body = notification.request.content.body || "";

        // Vibrar e exibir Toast
        Vibration.vibrate(500);
        Toast.show({
          type: "info",
          text1: title,
          text2: body,
          position: "top",
          visibilityTime: 4000,
        });
      }
    );

    // 🎯 Listener para clique/interação na notificação
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log("👉 Usuário interagiu com a notificação:", response);
        const data = response.notification.request.content.data;
        const actionIdentifier = response.actionIdentifier;

        // Se clicou no botão "Aceitar Viagem" da notificação
        if (actionIdentifier === 'accept' && data?.orderId) {
          console.log('✅ Motorista clicou no botão Aceitar Viagem da notificação!');
          // O fluxo de navegação ou chamada da API deve acontecer aqui.
          // Como não conseguimos chamar o hook `useTrip` diretamente do App.js,
          // passamos o parâmetro para a Home para que ela faça o accept automático.
          if (navigationRef.isReady()) {
            navigationRef.navigate("MainTabs", {
              screen: "Home",
              params: { orderId: data.orderId, autoAccept: true }
            });
          }
        } 
        // Se clicou no botão "Rejeitar"
        else if (actionIdentifier === 'reject' && data?.orderId) {
          console.log('❌ Motorista rejeitou a viagem a partir da notificação.');
          if (navigationRef.isReady()) {
             // Opcional: Avisar a Home para limpar a viagem ou disparar a API de ignorar
             navigationRef.navigate("MainTabs", {
              screen: "Home",
              params: { orderId: data.orderId, autoReject: true }
            });
          }
        }
        // Clique normal na notificação (abrir app)
        else {
          if (navigationRef.isReady() && data?.orderId) {
            navigationRef.navigate("MainTabs", {
              screen: "Home",
              params: { orderId: data.orderId }
            });
          }
        }
      }
    );

    // 🔥 OUVINTE GLOBAL DO WEBSOCKET PARA REDIRECIONAR EM NOVOS PEDIDOS
    const handleGlobalNewOrder = (data) => {
      console.log("🌐 App.js - Novo pedido detectado globalmente, forçando redirecionamento para a tela inicial...");
      if (navigationRef.isReady()) {
        navigationRef.navigate("MainTabs", {
          screen: "Home",
          params: { orderId: data._id || data.id }
        });
      }
    };
    
    websocketService.on('new_order', handleGlobalNewOrder);

    // Simular carregamento inicial
    const timer = setTimeout(() => setLoading(false), 1000);

    return () => {
      clearTimeout(timer);
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
      websocketService.off('new_order', handleGlobalNewOrder);
    };
  }, [isAuthenticated, user]);

  const [appConfig, setAppConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await api.get('/system/app-config');
        setAppConfig(response.data);
        await AsyncStorage.setItem('appConfig', JSON.stringify(response.data));
      } catch (err) {
        console.log('Erro ao buscar config global:', err);
      } finally {
        setConfigLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const currentVersion = Constants.expoConfig?.version || '1.0.0';
  const isVersionObsolete = (current, min) => {
    if (!min) return false;
    const currParts = current.split('.').map(Number);
    const minParts = min.split('.').map(Number);
    for (let i = 0; i < Math.max(currParts.length, minParts.length); i++) {
      const c = currParts[i] || 0;
      const m = minParts[i] || 0;
      if (c < m) return true;
      if (c > m) return false;
    }
    return false;
  };

  const forceUpdate = appConfig && isVersionObsolete(currentVersion, appConfig.minAppVersionDriver);
  const inMaintenance = appConfig && appConfig.isMaintenanceModeDriver;

  if (loading || configLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7F00FF" />
      </View>
    );
  }

  if (forceUpdate || inMaintenance) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#fff' }}>
        <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: forceUpdate ? '#E3F2FD' : '#FFF3E0', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
           <Text style={{ fontSize: 40 }}>{forceUpdate ? '🚀' : '🔧'}</Text>
        </View>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', color: '#333' }}>
          {forceUpdate ? 'Atualização Necessária' : 'Em Manutenção'}
        </Text>
        <Text style={{ fontSize: 16, textAlign: 'center', color: '#666', marginBottom: 30, lineHeight: 24 }}>
          {forceUpdate 
            ? 'Uma nova versão da Nhiquela Driver está disponível. Por favor, atualize a sua aplicação.' 
            : (appConfig?.maintenanceMessage || 'Estamos a realizar melhorias na plataforma. Voltaremos muito em breve!')}
        </Text>
        
        {forceUpdate && (
          <View style={{ width: '100%', marginTop: 10 }}>
            <View style={{ backgroundColor: '#7F00FF', padding: 15, borderRadius: 10, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Atualizar Agora</Text>
            </View>
          </View>
        )}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  const isExpoGo = Constants.appOwnership === 'expo';

  return (
    <>

      <AppNavigator />
      <Toast />
      <FlashMessage position="top" />
    </>
  );
}

// 🧭 App Principal
export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer 
        ref={navigationRef}
        linking={{
          prefixes: ['nhiqueladriver://'],
          config: {
            screens: {
              OrderDetailsScreen: 'order/:orderId'
            }
          }
        }}
      >
        <LoadingProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </LoadingProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
  },
});
