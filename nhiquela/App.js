import React, { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

import { ToastProvider } from 'react-native-toast-notifications'; // ✔️ CORRETO
// ❌ REMOVIDO: import Toast from 'react-native-toast-message';

import { store } from './store';
import api from './hooks/createConnectionApi';

import { createNativeStackNavigator } from '@react-navigation/native-stack';

// --- SCREENS ---
import ButtomTabNavegation from './navegation/ButtomTabNavegation';
import ProductDetail from './components/products/ProductDetail';
import NewProducts from './screens/NewProducts';
import ProductList from './components/products/ProductList';
import LoginPage from './screens/LoginPage';
import SignUp from './screens/SignUp';
import SellerScreen from './components/SellerScreen';
import SellerProduct from './components/SellerProduct';
import Cart from './screens/Cart';
import PaymentMethod from './screens/PaymentMethod';
import MpesaScreen from './screens/MpesaScreen';
import SuccessPayment from './screens/SuccessPayment';
import FailedPayment from './screens/FailedPayment';
import MapScreen from './screens/MapScreen';
import RideOptionsCard from './components/RideOptionsCard';
import TransportType from './components/TransportType';
import OrderDetailsScreen from './screens/OrderDetailScreen';
import OrderList from './screens/OrderList';
import ProductListByCategory from './components/products/ProductListByCategory';
import SellersList from './components/SellersList';
import ForgotPassword from './screens/ForgotPassword';
import EstablishmentList from './components/EstablishmentList3';
import SellersByEstablishment from './components/SellersByEstablishment';
import RequestDelivScreen from './screens/RequestDeliv';
import DeliveryDetailsScreen from './components/DeliveryDetailsScreen';

// --- NAVIGATION REF ---
export const navigationRef = createNavigationContainerRef();
const Stack = createNativeStackNavigator();

export default function App() {
  const responseListener = useRef();

  // Handler de notificações
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });


  Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.HIGH,
  });


  // Criar canal Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('order-updates', {
        name: 'Atualizações de Pedido',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
  }, []);

  // Listener → abre a página ao clicar na notificação
  useEffect(() => {
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (navigationRef.isReady() && data.orderId) {
        navigationRef.navigate('OrderDetailsScreen', { orderId: data.orderId });
      }
    });

    return () => {
      responseListener.current?.remove();
    };
  }, []);

  // Registar token do dispositivo
  useEffect(() => {
    const registerToken = async () => {
      const deviceToken = await registerForPushNotificationsAsync();
      if (deviceToken) {
        try {
          const userDataString = await AsyncStorage.getItem('userData');
          if (userDataString) {
            const userData = JSON.parse(userDataString);
            const userId = userData?._id || userData?.id;

            if (userId) {
              await api.post('/notifications/savedevicetoken', {
                deviceToken,
                userId,
                platform: Platform.OS,
              });
            }
          }
        } catch (err) {
          console.error('Erro ao salvar token do dispositivo:', err);
        }
      }
    };

    registerToken();
  }, []);

  return (
    <ToastProvider>
      <StatusBar backgroundColor="white" style="dark" />

      <Provider store={store}>
        <SafeAreaProvider>

          <NavigationContainer ref={navigationRef}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="BottomNavigation" component={ButtomTabNavegation} />
              <Stack.Screen name="ProductDetail" component={ProductDetail} />
              <Stack.Screen name="ProductList" component={NewProducts} />
              <Stack.Screen name="ProductList2" component={ProductList} />
              <Stack.Screen name="Login" component={LoginPage} />
              <Stack.Screen name="SignUp" component={SignUp} />
              <Stack.Screen name="SellerScreen" component={SellerScreen} />
              <Stack.Screen name="SellerProduct" component={SellerProduct} />
              <Stack.Screen name="SellersList" component={SellersList} />
              <Stack.Screen name="PaymentMethod" component={PaymentMethod} />
              <Stack.Screen name="Cart" component={Cart} />
              <Stack.Screen name="MpesaScreen" component={MpesaScreen} />
              <Stack.Screen name="ProductListByCategory" component={ProductListByCategory} />
              <Stack.Screen name="SuccessPayment" component={SuccessPayment} />
              <Stack.Screen name="FailedPayment" component={FailedPayment} />
              <Stack.Screen name="MapScreen" component={MapScreen} />
              <Stack.Screen name="EstablishmentList" component={EstablishmentList} />
              <Stack.Screen name="RideOptionsCard" component={RideOptionsCard} />
              <Stack.Screen name="OrderDetailsScreen" component={OrderDetailsScreen} />
              <Stack.Screen name="OrderList" component={OrderList} />
              <Stack.Screen name="SellersByEstablishment" component={SellersByEstablishment} />
              <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
              <Stack.Screen name="DeliveryDetails" component={DeliveryDetailsScreen} />
              <Stack.Screen name="RequestDeliv" component={RequestDelivScreen} />
            </Stack.Navigator>
          </NavigationContainer>

        </SafeAreaProvider>
      </Provider>

    </ToastProvider>
  );
}

// Push Notifications

async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    alert('Push notifications só funcionam em dispositivos físicos!');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    alert('Permissão de notificação negada!');
    return null;
  }

  const tokenData = await Notifications.getDevicePushTokenAsync();

  return tokenData.data;
}
