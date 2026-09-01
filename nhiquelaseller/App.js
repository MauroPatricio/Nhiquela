import React, { useEffect, useRef } from 'react';
import { StatusBar, KeyboardAvoidingView, Platform, Alert, Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
import OrderChat from './screens/OrderChat';
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

import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync().catch(() => {});

function AppContent() {
  const notificationReceivedListener = useRef();
  const notificationResponseListener = useRef();
  const toast = useToast(); // ✔️ Hook para usar o toast
  const [isFirstLaunch, setIsFirstLaunch] = React.useState(null);
  const [showNotificationPrompt, setShowNotificationPrompt] = React.useState(false);
  
  // Importação local para o hook do socket evitar circular dependencies se houver
  const useSocket = require('./hooks/useSocket').default;
  useSocket();

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const hasViewed = await AsyncStorage.getItem('@hasViewedOnboardingSeller');
        setIsFirstLaunch(hasViewed === null);
      } catch (e) {
        setIsFirstLaunch(false);
      }
    };
    checkOnboarding();

    const setupNotifications = async () => {
      const userId = await AsyncStorage.getItem('id');
      if (!userId) return;

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      
      if (existingStatus === 'undetermined') {
        setShowNotificationPrompt(true);
        return;
      }

      if (existingStatus === 'granted') {
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
      }

      notificationReceivedListener.current =
        Notifications.addNotificationReceivedListener(notification => {
          if (toast && typeof toast.show === 'function') {
            toast.show(notification.request.content.body || 'Nova notificação', {
              type: 'info',
              duration: 4000,
              placement: 'top',
            });
          }
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

    return () => {
      notificationReceivedListener.current?.remove?.();
      notificationResponseListener.current?.remove?.();
    };
  }, []);

  useEffect(() => {
    if (isFirstLaunch !== null) {
      setTimeout(() => {
        SplashScreen.hideAsync().catch(() => {});
      }, 500); // Dar um pequeno tempo extra para a navegação montar
    }
  }, [isFirstLaunch]);

  if (isFirstLaunch === null) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer ref={navigationRef}>
        <Provider store={store}>
          <SafeAreaProvider>
            
            {/* Modal Premium para Pedido de Notificações */}
            <Modal visible={showNotificationPrompt} transparent={true} animationType="fade">
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="notifications" size={40} color="#FF6347" />
                  </View>
                  <Text style={styles.modalTitle}>Ativar Notificações</Text>
                  <Text style={styles.modalDesc}>
                    Para não perder nenhum pedido e estar sempre atualizado com as vendas da sua loja, ative as notificações.
                  </Text>
                  
                  <TouchableOpacity 
                    style={styles.modalBtnPrimary}
                    onPress={async () => {
                      setShowNotificationPrompt(false);
                      const { status } = await Notifications.requestPermissionsAsync();
                      if (status === 'granted') {
                        const deviceToken = await registerForPushNotificationsAsync();
                        const userId = await AsyncStorage.getItem('id');
                        if (deviceToken && userId) {
                          try {
                            await api.post('/notifications/savedevicetoken', { deviceToken, userId, platform: Platform.OS });
                          } catch (e) {}
                        }
                      }
                    }}
                  >
                    <Text style={styles.modalBtnTextPrimary}>Ativar Agora</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.modalBtnSecondary}
                    onPress={() => setShowNotificationPrompt(false)}
                  >
                    <Text style={styles.modalBtnTextSecondary}>Mais Tarde</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>


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
                <Stack.Screen name="Wallet" component={WalletScreen} options={{ headerShown: false }} />
                <Stack.Screen name="TopUp" component={TopUpScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Pay" component={PayWithWallet} />
                <Stack.Screen name="withdraw" component={WalletWithdrawScreen} />
                <Stack.Screen name="OrderChat" component={OrderChat} options={{ headerShown: false }} />
              </Stack.Navigator>

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
    console.log('Use um dispositivo físico para notificações.');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Permissão para notificações foi negada.');
    return null;
  }

  const tokenData = await Notifications.getDevicePushTokenAsync();
  return tokenData.data;
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    width: '85%',
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#FFF0ED',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  modalDesc: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalBtnPrimary: {
    backgroundColor: '#FF6347',
    paddingVertical: 14,
    width: '100%',
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  modalBtnTextPrimary: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalBtnSecondary: {
    paddingVertical: 14,
    width: '100%',
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnTextSecondary: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
  },
});
