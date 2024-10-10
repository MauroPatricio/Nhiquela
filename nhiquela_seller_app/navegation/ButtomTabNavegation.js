import { View, Text } from 'react-native'
import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import {Ionicons} from "@expo/vector-icons"
import Home from '../screens/Home';
import Search from '../screens/Search';
import Orders from '../screens/Orders';
import RequestDeliv from '../screens/RequestDeliv';
import Cart from '../screens/Cart';
import Profile from '../screens/Profile';
import NewProduct from '../screens/NewProduct';
import ProductList from '../components/products/ProductList';
import ProductListSeller from '../components/products/ProductListSeller';

const Tab = createBottomTabNavigator();

const screenOptions = {
    tabBarShowLabel: false,
    tabBarHideOnKeyboard: true,
    headerShown: false,
    tabBarStyle:{
        position: "absolute",
        bottom: 0,
        right: 0,
        left: 0,
        elevation: 0,
        height: 70
    }
}

const ButtomTabNavegation = () => {
  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen name="Home" component={Home}
      options={{tabBarIcon: ({focused})=>{
        return <Ionicons name={focused? "home": "home-outline"}
        size={24}
        color={focused?'#7F00FF':"black"}
        />
      }}} />

      <Tab.Screen name="ProductListSeller" component={ProductListSeller}
      options={{tabBarIcon: ({focused})=>{
        return <Ionicons name={focused? "list-circle-outline": "list"}
        size={24}
        color={focused?'#7F00FF':"black"}
        />
      }}} />


<Tab.Screen name="NewProduct" component={NewProduct}
      options={{tabBarIcon: ({focused})=>{
        return <Ionicons name={focused? "add-circle": "add-circle-outline"}
        size={50}
        color={focused?'#7F00FF':"#7F00FF"}
        />
      }}} />


<Tab.Screen name="Orders" component={Orders}
      options={{tabBarIcon: ({focused})=>{
        return <Ionicons name={focused? "file-tray-full": "file-tray-full-outline"}
        size={24}
        color={focused?'#7F00FF':"black"}
        />
      }}} />



{/* <Tab.Screen name="Cart" component={Cart}
      options={{tabBarIcon: ({focused})=>{
        return <Ionicons name={focused? "cart": "cart-outline"}
        size={24}
        color={focused?'#7F00FF':"#f0edf6"}
        />
      }}} /> */}


<Tab.Screen name="Profile" component={Profile}
      options={{tabBarIcon: ({focused})=>{
        return <Ionicons name={focused? "person": "person-outline"}
        size={24}
        color={focused?'#7F00FF':"black"}
        />
      }}} />

    </Tab.Navigator>
  )
}

export default ButtomTabNavegation