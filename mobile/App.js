import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import ButtomTabNavegation from './navegation/ButtomTabNavegation';
import ProductDetail from './components/products/ProductDetail';
import NewProducts from './screens/NewProducts';
import ProductList from './components/products/ProductList';
import LoginPage from './screens/LoginPage';
import BackBtn from './components/BackBtn'
import SignUp from './screens/SignUp';
import SellerScreen from './components/SellerScreen';
import SellerProduct from './components/SellerProduct';
import { store } from './store';
import { Provider } from 'react-redux';
import Cart from './screens/Cart';
// import PaymentMethods from './screens/PaymentMethod';
import PaymentMethod from './screens/PaymentMethod';
import MpesaScreen from './screens/MpesaScreen';
import SuccessPayment from './screens/SuccessPayment';
// import FailedPayment from './screens/FailedPayment';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MapScreen from './screens/MapScreen';
import {KeyboardAvoidingView, Platform, StyleSheet} from 'react-native'
import RideOptionsCard from './components/RideOptionsCard';
// import GeoLocation from 'react-native-get-location'
// import { GestureHandlerRootView } from 'react-native-gesture-handler'; // Importe GestureHandlerRootView
import TransportType from './components/TransportType';
import OrderDetailsScreen from './screens/OrderDetailScreen';
import OrderList from './screens/OrderList';
import FailedPayment from './screens/FailedPayment';
import Toast from 'react-native-toast-message';
import { useEffect } from 'react';
// import registerNNPushToken from 'native-notify';
import messaging from '@react-native-firebase/messaging';
import ProductListByCategory from './components/products/ProductListByCategory';
import SellersList from './components/SellersList';



const Stack = createNativeStackNavigator();




// const registerDeviceForMessaging = async () => {
//   await messaging().registerDeviceForRemoteMessages();
//   const token = await messaging().getToken();

//   await deviceStorage.saveItem('FCMToken', token);

//   console.log('FCM Token: ', token);
//   // Register the token
//   // await register(token);
// };


export default function App() {
  // useEffect(() => {
  //  registerNNPushToken(23641, 'P1NYLd6lOOHkdLzDZK0kV3');
  // }, []);
  
  //  registerNNPushToken(23641, 'P1NYLd6lOOHkdLzDZK0kV3');

      
  return (
   
    <NavigationContainer>

      <Provider store={store}>
        <SafeAreaProvider>
<KeyboardAvoidingView  
behavior={Platform.OS === 'ios'? 'padding': 'height'}
keyboardVerticalOffset={Platform.OS === 'ios'? -64: 0}
style={{flex: 1}}>

        <Stack.Navigator>
            <Stack.Screen name='Bottom Navigation'
            component={ButtomTabNavegation}
            options={{headerShown: false}}
            />

  <Stack.Screen name='ProductDetail'
            component={ProductDetail}
            options={{headerShown: false}}
            />

  <Stack.Screen name='ProductList'
            component={NewProducts}
            options={{headerShown: false}}
            />

  <Stack.Screen name='ProductList2'
            component={ProductList}
            options={{headerShown: false}}
            />


  <Stack.Screen name='Login'
            component={LoginPage}
            options={{headerShown: false}}
            />

  <Stack.Screen name='SignUp'
            component={SignUp}
            options={{headerShown: false}}
            />


  <Stack.Screen name='SellerScreen'
            component={SellerScreen}
            options={{headerShown: false}}
            />

  <Stack.Screen name='SellerProduct'
            component={SellerProduct}
            options={{headerShown: false}}
            />


<Stack.Screen name='SellersList'
            component={SellersList}
            options={{headerShown: false}}
            />
 
  <Stack.Screen name='PaymentMethod'
            component={PaymentMethod}
            options={{presentation:'modal',headerShown: false}}
            />
           
  <Stack.Screen name='Cart'
            component={Cart}
            options={{headerShown: false}}
            />

 
  <Stack.Screen name='MpesaScreen'
            component={MpesaScreen}
            options={{headerShown: false}}
            />

<Stack.Screen name='ProductListByCategory'
            component={ProductListByCategory}
            options={{headerShown: false}}
            />

            
  <Stack.Screen name='SuccessPayment'
            component={SuccessPayment}
            options={{headerShown: false}}
            />
            
  <Stack.Screen name='FailedPayment'
            component={FailedPayment}
            options={{headerShown: false}}
            />

  <Stack.Screen name='MapScreen'
            component={MapScreen}
            options={{headerShown: false}}
            />
          

<Stack.Screen name='RideOptionsCard'
            component={RideOptionsCard}
            options={{headerShown: false}}
            />


<Stack.Screen name='TransportType'
            component={TransportType}
            options={{headerShown: false}}
            />


<Stack.Screen name='OrderDetailsScreen'
            component={OrderDetailsScreen}
            options={{headerShown: false}}
            />
 

<Stack.Screen name='OrderList'
            component={OrderList}
            options={{headerShown: false}}
            />
        </Stack.Navigator>


</KeyboardAvoidingView>





<Toast ref={(ref) => Toast.setRef(ref)} />
        </SafeAreaProvider>

        </Provider>
  </NavigationContainer>
  );

}