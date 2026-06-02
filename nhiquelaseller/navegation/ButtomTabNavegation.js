// BottomTabNavigation.js
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import React, { memo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import Home from '../screens/Home';
import Orders from '../screens/Orders';
import Profile from '../screens/Profile';
import NewProduct from '../screens/NewProduct';
import ProductListSeller from '../components/products/ProductListSeller';

const Tab = createBottomTabNavigator();

const CustomTabBarButton = memo(({ children, onPress }) => (
  <TouchableOpacity
    style={styles.centerButtonWrapper}
    onPress={onPress}
    activeOpacity={0.8}
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
        tabBarHideOnKeyboard: true,

        // Configurações de estabilidade e render
        lazy: true,
        unmountOnBlur: false,
        freezeOnBlur: true,

        tabBarActiveTintColor: '#A78BFA',
        tabBarInactiveTintColor: '#9CA3AF',

        // Estilo moderno flutuante no estilo do app logisticdriver
        tabBarStyle: {
          position: 'absolute',
          bottom: 16,
          left: 16,
          right: 16,
          height: 70,
          borderRadius: 24,
          borderTopWidth: 0,
          backgroundColor: '#1E1E2C', // Slate Dark Premium
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.2,
          shadowRadius: 10,
          paddingBottom: 0,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={Home}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={styles.iconWrapper}>
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={22}
                color={focused ? '#A78BFA' : '#9CA3AF'}
              />
              {focused && <View style={styles.activeDot} />}
            </View>
          )
        }}
      />
      <Tab.Screen
        name="ProductListSeller"
        component={ProductListSeller}
        options={{ 
          tabBarIcon: ({ focused }) => (
            <View style={styles.iconWrapper}>
              <Ionicons 
                name={focused ? 'list' : 'list-outline'} 
                size={22} 
                color={focused ? '#A78BFA' : '#9CA3AF'} 
              />
              {focused && <View style={styles.activeDot} />}
            </View>
          ) 
        }}
      />
      <Tab.Screen
        name="produtos"
        component={NewProduct}
        options={{
          tabBarIcon: () => <Ionicons name='add' size={26} color="white" />,
          tabBarButton: (props) => <CustomTabBarButton {...props} />,
        }}
      />
      <Tab.Screen
        name="Orders"
        component={Orders}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={styles.iconWrapper}>
              <Ionicons
                name={focused ? 'file-tray-full' : 'file-tray-full-outline'}
                size={22}
                color={focused ? '#A78BFA' : '#9CA3AF'}
              />
              {focused && <View style={styles.activeDot} />}
            </View>
          )
        }}
      />
      <Tab.Screen
        name="Profile"
        component={Profile}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={styles.iconWrapper}>
              <Ionicons
                name={focused ? 'person' : 'person-outline'}
                size={22}
                color={focused ? '#A78BFA' : '#9CA3AF'}
              />
              {focused && <View style={styles.activeDot} />}
            </View>
          )
        }}
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigation;

const styles = StyleSheet.create({
  centerButtonWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
    height: 60,
  },
  centerButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#7F00FF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#7F00FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    top: -18,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingTop: 8,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#A78BFA',
    marginTop: 4,
  }
});