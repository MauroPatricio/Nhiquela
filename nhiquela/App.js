import React, { useEffect, useRef } from 'react';
import { Platform, View, Text } from 'react-native';
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
import Favorite from './screens/Favorite';
import DocumentUploadScreen from './screens/DocumentUploadScreen';
import OnboardingScreen from './screens/OnboardingScreen';

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

  const [appConfig, setAppConfig] = React.useState(null);
  const [configLoading, setConfigLoading] = React.useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = React.useState(null);

  // Buscar configuracoes globais (Forced Update & Maintenance)
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await api.get('/system/app-config');
        setAppConfig(response.data);
        // Guardar as configuracoes globalmente para acesso nos ecrãs (ex: WhatsApp)
        await AsyncStorage.setItem('appConfig', JSON.stringify(response.data));
      } catch (err) {
        console.error('Erro ao buscar app config:', err);
      } finally {
        const hasViewed = await AsyncStorage.getItem('@hasViewedOnboarding');
        setIsFirstLaunch(hasViewed === null);
        setConfigLoading(false);
      }
    };
    fetchConfig();
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
            const userName = userData?.name || "Client";

            if (userId) {
              // Init ZegoCloud Prebuilt Call Service
              ZegoUIKitPrebuiltCallService.init(
                zegoConfig.appID,
                zegoConfig.appSign,
                userId,
                userName,
                (ZIM && ZPNs) ? [ZIM, ZPNs] : [],
                {
                  ringtoneConfig: {
                    incomingCallFileName: 'zego_incoming.mp3',
                    outgoingCallFileName: 'zego_outgoing.mp3',
                  },
                  androidNotificationConfig: {
                    channelID: "ZegoUIKit",
                    channelName: "ZegoUIKit",
                  },
                }
              );

              await api.post('/notifications/savedevicetoken', {
                deviceToken,
                userId,
                platform: Platform.OS,
              });
            }
          }
        } catch (err) {
          console.log('⚠️ Erro no Zego/Push token:', err.message);
        }
      }
    };

    registerToken();
  }, []);

  // Logica de bloqueio
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

  const forceUpdate = appConfig && isVersionObsolete(currentVersion, appConfig.minAppVersionClient);
  const inMaintenance = appConfig && appConfig.isMaintenanceModeClient;

  // Wait for first launch check
  if (isFirstLaunch === null) return null;

  // Ecrã de bloqueio
  if (!configLoading && (forceUpdate || inMaintenance)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#fff' }}>
        <StatusBar style="dark" />
        <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: forceUpdate ? '#E3F2FD' : '#FFF3E0', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
           <Text style={{ fontSize: 40 }}>{forceUpdate ? '🚀' : '🔧'}</Text>
        </View>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', color: '#333' }}>
          {forceUpdate ? 'Atualização Necessária' : 'Em Manutenção'}
        </Text>
        <Text style={{ fontSize: 16, textAlign: 'center', color: '#666', marginBottom: 30, lineHeight: 24 }}>
          {forceUpdate 
            ? 'Uma nova versão da Nhiquela está disponível. Por favor, atualize a sua aplicação para continuar a usar os nossos serviços com as últimas novidades e melhorias de segurança.' 
            : (appConfig?.maintenanceMessage || 'Estamos a realizar melhorias na plataforma. Voltaremos muito em breve!')}
        </Text>
        
        {forceUpdate && (
          <View style={{ width: '100%', marginTop: 10 }}>
            {/* Botao de Update (aqui usaria Linking para a App Store/Play Store real) */}
            <View style={{ backgroundColor: '#7F00FF', padding: 15, borderRadius: 10, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Atualizar Agora</Text>
            </View>
          </View>
        )}
      </View>
    );
  }

  return (
    <ToastProvider>
      <StatusBar backgroundColor="white" style="dark" />

      <Provider store={store}>
        <SafeAreaProvider>

          <NavigationContainer 
              ref={navigationRef}
              linking={{
                prefixes: ['nhiquela://'],
                config: {
                  screens: {
                    OrderDetailsScreen: 'order/:orderId',
                    OrderList: 'orders'
                  }
                }
              }}
          >
            <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={isFirstLaunch ? 'Onboarding' : 'BottomNavigation'}>
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
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
              <Stack.Screen name="Favorite" component={Favorite} />
              <Stack.Screen name="DocumentUploadScreen" component={DocumentUploadScreen} />
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
