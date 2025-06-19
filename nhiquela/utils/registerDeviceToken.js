import { Platform } from "react-native";
import { registerForPushNotificationsAsync } from "../NotificationService";
import api from '../hooks/createConnectionApi';


async function registerDeviceToken(userData) {
  const deviceToken = await registerForPushNotificationsAsync();
  if (deviceToken) {
    try {
      await api.post('/notifications/savedevicetoken', {
        deviceToken,
        userId: userData._id,
        platform: Platform.OS,
      });
      console.log('✅ Token de push salvo com sucesso.');
    } catch (err) {
      console.error('❌ Erro ao salvar token de push:', err);
    }
  }
}

export default registerDeviceToken;