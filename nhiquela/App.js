import React, { useEffect, useRef } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

import { store } from './store';
import api from './hooks/createConnectionApi'; // certifique-se disso

// COMPONENTES/TELAS
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
    import AsyncStorage from '@react-native-async-storage/async-storage';
    import { createNavigationContainerRef } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import RequestDelivScreen from './screens/RequestDeliv';

export const navigationRef = createNavigationContainerRef();

const Stack = createNativeStackNavigator();

export default function App() {
   const responseListener = useRef();

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  useEffect(() => {
    // Canal de notificacao Android
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

  useEffect(() => {
    // Listener para quando o app estiver em segundo plano ou fechado
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


//   Notifications.addNotificationResponseReceivedListener(response => {
//   const data = response.notification?.request?.content?.data;

//   if (data?.action === 'navigate' && data?.screen && data?.orderId) {
//     navigationRef.current?.navigate(data.screen, { orderId: data.orderId });
//   }
// });


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
    <>
                <StatusBar backgroundColor="white" style="dark" />
                <NavigationContainer>
                  <Provider store={store}>
                    <SafeAreaProvider>
                      <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? -64 : 0}
                        style={{ flex: 1 }}
                      >
                        <Stack.Navigator>
                          <Stack.Screen name='BottomNavigation' component={ButtomTabNavegation} options={{ headerShown: false }} />
                          <Stack.Screen name='ProductDetail' component={ProductDetail} options={{ headerShown: false }} />
                          <Stack.Screen name='ProductList' component={NewProducts} options={{ headerShown: false }} />
                          <Stack.Screen name='ProductList2' component={ProductList} options={{ headerShown: false }} />
                          <Stack.Screen name='Login' component={LoginPage} options={{ headerShown: false }} />
                          <Stack.Screen name='SignUp' component={SignUp} options={{ headerShown: false }} />
                          <Stack.Screen name='SellerScreen' component={SellerScreen} options={{ headerShown: false }} />
                          <Stack.Screen name='SellerProduct' component={SellerProduct} options={{ headerShown: false }} />
                          <Stack.Screen name='SellersList' component={SellersList} options={{ headerShown: false }} />
                          <Stack.Screen name='PaymentMethod' component={PaymentMethod} options={{ presentation: 'modal', headerShown: false }} />
                          <Stack.Screen name='Cart' component={Cart} options={{ headerShown: false }} />
                          <Stack.Screen name='MpesaScreen' component={MpesaScreen} options={{ headerShown: false }} />
                          <Stack.Screen name='ProductListByCategory' component={ProductListByCategory} options={{ headerShown: false }} />
                          <Stack.Screen name='SuccessPayment' component={SuccessPayment} options={{ headerShown: false }} />
                          <Stack.Screen name='FailedPayment' component={FailedPayment} options={{ headerShown: false }} />
                          <Stack.Screen name='MapScreen' component={MapScreen} options={{ headerShown: false }} />
                          <Stack.Screen name='EstablishmentList' component={EstablishmentList} options={{ headerShown: false }} />
                          <Stack.Screen name='RideOptionsCard' component={RideOptionsCard} options={{ headerShown: false }} />
                          <Stack.Screen name='TransportType' component={TransportType} options={{ headerShown: false }} />
                          <Stack.Screen name='OrderDetailsScreen' component={OrderDetailsScreen} options={{ headerShown: false }} />
                          <Stack.Screen name='OrderList' component={OrderList} options={{ headerShown: false }} />
                          <Stack.Screen name='SellersByEstablishment' component={SellersByEstablishment} options={{ headerShown: false }} />
                          <Stack.Screen name='ForgotPassword' component={ForgotPassword} options={{ headerShown: false }} />
                       
                                                <Stack.Screen name='RequestDeliv' component={RequestDelivScreen} options={{ headerShown: false }} />
  </Stack.Navigator>

                        <Toast />
                      </KeyboardAvoidingView>
                    </SafeAreaProvider>
                  </Provider>
                </NavigationContainer>

    </>
  );
}

// Função para solicitar permissão e obter token
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

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  });

  return tokenData.data;
}
