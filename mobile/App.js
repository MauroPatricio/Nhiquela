import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import ButtomTabNavegation from './navegation/ButtomTabNavegation';
import ProductDetail from './components/products/ProductDetail';


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



        </Stack.Navigator>
  </NavigationContainer>
  );
}

