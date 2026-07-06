import React, { useEffect, useRef } from 'react';
import { StatusBar, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider, useToast } from 'react-native-toast-notifications';
import api from './hooks/createConnectionApi';
import { store } from './store';
import { navigationRef, navigate } from './navegation/RootNavigation';

// Importação de telas
import ButtomTabNavegation from './navegation/ButtomTabNavegation';
import ProductDetail from './components/products/ProductDetail';
import NewProduct from './screens/NewProduct';
import ProductListSeller from './components/products/ProductListSeller';
import ProductSellerDetail from './components/products/ProductSellerDetail';
import PaymentsHistory from './screens/PaymentsHistory';
import LoginPage from './screens/LoginPage';
import SignUp from './screens/SignUp';
import SellerScreen from './components/SellerScreen';
import SellerProduct from './components/SellerProduct';
import PaymentMethod from './screens/PaymentMethod';
import OrderDetail from './screens/OrderDetail';
import MpesaScreen from './screens/MpesaScreen';
import SuccessPayment from './screens/SuccessPayment';
import FailedPayment from './screens/FailedPayment';
import MapScreen from './screens/MapScreen';
import RideOptionsCard from './components/RideOptionsCard';
import TransportType from './components/TransportType';
import EditProductView from './components/products/EditProductView';
import Cart from './screens/Cart';
import PayWithWallet from './screens/PayWithWallet';
import TopUpScreen from './screens/TopUpScreen';
import WalletScreen from './screens/WalletScreen';
import WalletWithdrawScreen from './screens/WalletWithdrawScreen';
import WithdrawalRequestsScreen from './components/WithdrawalRequests';
import OnboardingScreen from './screens/OnboardingScreen';
import { enableScreens } from 'react-native-screens';

const Stack = createNativeStackNavigator();

// 🔔 Configuração para notificações em foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function AppContent() {
  const notificationReceivedListener = useRef();
  const notificationResponseListener = useRef();
  const toast = useToast(); // ✔️ Hook para usar o toast
  const [isFirstLaunch, setIsFirstLaunch] = React.useState(null);

  useEffect(() => {
    const checkOnboarding = async () => {
      const hasViewed = await AsyncStorage.getItem('@hasViewedOnboardingSeller');
      setIsFirstLaunch(hasViewed === null);
    };
    checkOnboarding();

    const setupNotifications = async () => {
      const userId = await AsyncStorage.getItem('id');
      if (!userId) return;

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('order-updates', {
          name: 'Atualizações de Pedido',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      const deviceToken = await registerForPushNotificationsAsync();
      if (deviceToken) {
        try {
          await api.post('/notifications/savedevicetoken', {
            deviceToken,
            userId,
            platform: Platform.OS,
          });
        } catch (err) {
          console.error('Erro ao salvar deviceToken:', err);
        }
      }

      notificationReceivedListener.current =
        Notifications.addNotificationReceivedListener(notification => {
          toast.show(notification.request.content.body || 'Nova notificação', {
            type: 'info',
            duration: 4000,
            placement: 'top',
          });
        });

      notificationResponseListener.current =
        Notifications.addNotificationResponseReceivedListener(response => {
          const data = response.notification?.request?.content?.data;
          if (data?.orderId && navigationRef.isReady()) {
            navigate('OrderDetail', { orderId: data.orderId });
          }
        });
    };

    setupNotifications();

    if (isFirstLaunch === null) return null;

  return () => {
      notificationReceivedListener.current?.remove?.();
      notificationResponseListener.current?.remove?.();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer ref={navigationRef}>
        <Provider store={store}>
          <SafeAreaProvider>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? -64 : 0}
              style={{ flex: 1 }}
            >
              <Stack.Navigator initialRouteName={isFirstLaunch ? 'Onboarding' : 'BottomNavigation'}>
                <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
                <Stack.Screen name="BottomNavigation" component={ButtomTabNavegation} options={{ headerShown: false }} />
                <Stack.Screen name="ProductDetail" component={ProductDetail} options={{ headerShown: false }} />
                <Stack.Screen name="NewProduct" component={NewProduct} options={{ headerShown: false }} />
                <Stack.Screen name="ProductListSeller" component={ProductListSeller} options={{ headerShown: false }} />
                <Stack.Screen name="ProductSellerDetail" component={ProductSellerDetail} options={{ headerShown: false }} />
                <Stack.Screen name="PaymentsHistory" component={PaymentsHistory} options={{ headerShown: false }} />
                <Stack.Screen name="Login" component={LoginPage} options={{ headerShown: false }} />
                <Stack.Screen name="SignUp" component={SignUp} options={{ headerShown: false }} />
                <Stack.Screen name="SellerScreen" component={SellerScreen} options={{ headerShown: false }} />
                <Stack.Screen name="SellerProduct" component={SellerProduct} options={{ headerShown: false }} />
                <Stack.Screen name="PaymentMethod" component={PaymentMethod} options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="OrderDetail" component={OrderDetail} options={{ headerShown: false }} />
                <Stack.Screen name="MpesaScreen" component={MpesaScreen} options={{ headerShown: false }} />
                <Stack.Screen name="SuccessPayment" component={SuccessPayment} options={{ headerShown: false }} />
                <Stack.Screen name="FailedPayment" component={FailedPayment} options={{ headerShown: false }} />
                <Stack.Screen name="MapScreen" component={MapScreen} options={{ headerShown: false }} />
                <Stack.Screen name="RideOptionsCard" component={RideOptionsCard} options={{ headerShown: false }} />
                <Stack.Screen name="TransportType" component={TransportType} options={{ headerShown: false }} />
                <Stack.Screen name="EditProduct" component={EditProductView} options={{ headerShown: false }} />
                <Stack.Screen name="Cart" component={Cart} options={{ headerShown: false }} />
                <Stack.Screen name="WithdrawalRequests" component={WithdrawalRequestsScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Wallet" component={WalletScreen} />
                <Stack.Screen name="TopUp" component={TopUpScreen} />
                <Stack.Screen name="Pay" component={PayWithWallet} />
                <Stack.Screen name="withdraw" component={WalletWithdrawScreen} />
              </Stack.Navigator>
            </KeyboardAvoidingView>
          </SafeAreaProvider>
        </Provider>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

// Função auxiliar para registrar notificações push
async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    alert('Use um dispositivo físico para notificações.');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    alert('Permissão para notificações foi negada.');
    return null;
  }

  const tokenData = await Notifications.getDevicePushTokenAsync();

  return tokenData.data;
}
