import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import ButtomTabNavegation from './navegation/ButtomTabNavegation';
import ProductDetail from './components/products/ProductDetail';
import NewProducts from './screens/NewProducts';
import ProductList from './components/products/ProductList';
import LoginPage from './screens/LoginPage';
import BackBtn from './components/BackBtn'
import SignUp from './screens/SignUp';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
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

        </Stack.Navigator>
  </NavigationContainer>
  );
}

