// App.tsx
import React, { useState, useEffect, useRef } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
  Vibration,
} from "react-native";
import {
  NavigationContainer,
  createNavigationContainerRef,
} from "@react-navigation/native";
import AppNavigator from "./src/navigation/AppNavigator";
import { LoadingProvider, useLoadingContext } from "./src/context/LoadingContext";
import { AuthProvider } from "./src/context/AuthContext";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import api from "./src/api/apiConfig";

// 🔗 Referência global de navegação
export const navigationRef = createNavigationContainerRef();

// ⚙️ Configuração de comportamento das notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
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

  const token = (await Notifications.getDevicePushTokenAsync()).data;

  console.log("📩 FCM / Device Push Token:", token);

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
      sound: "default",
    });
  }

  return token;
}

// 💡 Conteúdo principal da aplicação
function AppContent() {
  const [loading, setLoading] = useState(true);
  const { showLoading, hideLoading } = useLoadingContext();
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    const registerToken = async () => {
      const deviceToken = await registerForPushNotificationsAsync();
      if (!deviceToken) return;

      try {
        const userDataString = await AsyncStorage.getItem("userData");
        if (!userDataString) return;

        const userData = JSON.parse(userDataString);
        const userId = userData?._id || userData?.id;
        if (!userId) return;

        await api.post("/notifications/savedevicetoken", {
          deviceToken,
          userId,
          platform: Platform.OS,
        });
      } catch (err) {
        console.error("❌ Erro ao salvar token do dispositivo:", err);
      }
    };

    registerToken();

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

        if (navigationRef.isReady() && data?.orderId) {
          navigationRef.navigate("OrderDetailsScreen", { orderId: data.orderId });
        }
      }
    );

    // Simular carregamento inicial
    const timer = setTimeout(() => setLoading(false), 1000);

    return () => {
      clearTimeout(timer);
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <>
      <AppNavigator />
      <Toast />
    </>
  );
}

// 🧭 App Principal
export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
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
});
