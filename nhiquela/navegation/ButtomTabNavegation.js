import React, { memo } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import Home from '../screens/Home';
import Search from '../screens/Search';
import Orders from '../screens/Orders';
import RequestDeliv from '../screens/RequestDeliv';
import Profile from '../screens/Profile';

const Tab = createBottomTabNavigator();

const CustomTabBarButton = memo(({ children, onPress }) => (
  <TouchableOpacity
    style={styles.centerButtonWrapper}
    onPress={onPress}
    activeOpacity={0.9}
  >
    <View style={styles.centerButton}>{children}</View>
  </TouchableOpacity>
));

const BottomTabNavigation = () => {
  return (
   <Tab.Navigator
      screenOptions={{
        tabBarShowLabel: false,
        headerShown: false,
        tabBarStyle: styles.tabBar,
        // 🔥 CONFIGURAÇÕES DEFINITIVAS
        tabBarHideOnKeyboard: true,
        freezeOnBlur: true,
        lazy: true,
        // 🔥 REMOVE ANIMAÇÕES PROBLEMÁTICAS
        animation: 'none',
        animationEnabled: false,
      }}
    >
      <Tab.Screen
        name="Início"
        component={Home}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={24}
              color={focused ? '#7F00FF' : 'gray'}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Pesquisa"
        component={Search}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'search' : 'search-outline'}
              size={24}
              color={focused ? '#7F00FF' : 'gray'}
            />
          ),
        }}
      />

      <Tab.Screen
        name="NovoPedido"
        component={RequestDeliv}
        options={{
          tabBarIcon: () => (
            <Ionicons name="add" size={40} color="white" />
          ),
          tabBarButton: (props) => <CustomTabBarButton {...props} />,
        }}
    />

      <Tab.Screen
        name="Pedidos"
        component={Orders}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'file-tray-full' : 'file-tray-full-outline'}
              size={24}
              color={focused ? '#7F00FF' : 'gray'}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Perfil"
        component={Profile}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={24}
              color={focused ? '#7F00FF' : 'gray'}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigation;

const styles = StyleSheet.create({

  centerButtonWrapper: { 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  centerButton: { 
    width: 50, 
    height: 50, 
    borderRadius: 35, 
    backgroundColor: '#7F00FF', 
    justifyContent: 'center', 
    alignItems: 'center', 
    elevation: 10,
    shadowColor: '#7F00FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
});