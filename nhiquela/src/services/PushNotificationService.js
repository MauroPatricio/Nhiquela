import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configurar o comportamento das notificações quando a app está em foreground (aberta)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync(userId) {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.warn('Falha ao obter permissão para push notifications!');
      return;
    }

    try {
      // Obter o DevicePushToken nativo (FCM no Android / APNs no iOS)
      // O projectId do Expo é opcional se não estiver usando EAS Build, mas para garantir pegamos o token bruto.
      const pushToken = await Notifications.getDevicePushTokenAsync();
      token = pushToken.data;
      console.log('FCM / Device Push Token:', token);
      
      if (token && userId) {
        // Enviar para o nosso backend
        await sendTokenToBackend(userId, token);
      }
    } catch (error) {
      console.error('Erro ao gerar token:', error);
    }
  } else {
    console.warn('Deve usar um dispositivo físico para Push Notifications');
  }

  return token;
}

async function sendTokenToBackend(userId, token) {
  try {
    // IMPORTANTE: Altere o IP para o IP da sua máquina na rede local
    const BACKEND_URL = 'http://192.168.0.x:5000/api/notifications/token'; // Exemplo
    
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, token }),
    });
    
    const data = await response.json();
    console.log('[Push] Token sync com o backend:', data);
  } catch (error) {
    console.error('[Push] Falha ao enviar token para o backend:', error.message);
  }
}
