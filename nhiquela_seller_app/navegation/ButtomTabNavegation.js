import { View, Text } from 'react-native';
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from "@expo/vector-icons";
import Home from '../screens/Home';
import Orders from '../screens/Orders';
import NewProduct from '../screens/NewProduct';
import ProductListSeller from '../components/products/ProductListSeller';
import Profile from '../screens/Profile';

const Tab = createBottomTabNavigator();

const screenOptions = {
  tabBarShowLabel: false,
  tabBarHideOnKeyboard: true,
  headerShown: false,
  tabBarStyle: {
    position: "absolute",
    bottom: 0,
    right: 0,
    left: 0,
    elevation: 0,
    height: 70,
  },
};

const ButtomTabNavegation = () => {
  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen
        name="Home"
        component={Home}
        options={{
          tabBarIcon: ({ focused }) => {
            return (
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={24}
                color={focused ? '#7F00FF' : "black"}
              />
            );
          },
        }}
      />

      <Tab.Screen
        name="ProductListSeller"
        component={ProductListSeller}
        options={{
          tabBarIcon: ({ focused }) => {
            return (
              <Ionicons
                name={focused ? "list" : "list-outline"} // Changed icon name
                size={24}
                color={focused ? '#7F00FF' : "black"}
              />
            );
          },
        }}
      />

      <Tab.Screen
        name="NewProduct"
        component={NewProduct}
        options={{
          tabBarIcon: ({ focused }) => {
            return (
              <Ionicons
                name={focused ? "add-circle" : "add-circle-outline"}
                size={50}
                color={focused ? '#7F00FF' : "#7F00FF"}
              />
            );
          },
        }}
      />

      <Tab.Screen
        name="Orders"
        component={Orders}
        options={{
          tabBarIcon: ({ focused }) => {
            return (
              <Ionicons
                name={focused ? "file-tray" : "file-tray-outline"} // Changed icon name
                size={24}
                color={focused ? '#7F00FF' : "black"}
              />
            );
          },
        }}
      />

      <Tab.Screen
        name="Profile"
        component={Profile}
        options={{
          tabBarIcon: ({ focused }) => {
            return (
              <Ionicons
                name={focused ? "person" : "person-outline"}
                size={24}
                color={focused ? '#7F00FF' : "black"}
              />
            );
          },
        }}
      />
    </Tab.Navigator>
  );
};

export default ButtomTabNavegation;
