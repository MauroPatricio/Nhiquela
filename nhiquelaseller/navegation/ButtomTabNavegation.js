// BottomTabNavigation.js
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import React, { memo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import Home from '../screens/Home';
import Search from '../screens/Search';
import Orders from '../screens/Orders';
import Profile from '../screens/Profile';
import NewProduct from '../screens/NewProduct';
import ProductListSeller from '../components/products/ProductListSeller';

const Tab = createBottomTabNavigator();

const CustomTabBarButton = memo(({ children, onPress }) => (
  <TouchableOpacity
    style={styles.centerButtonWrapper}
    onPress={onPress}
    activeOpacity={0.7}
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

        // Stability settings
        lazy: true,
        unmountOnBlur: false,
        freezeOnBlur: true,

        // Color settings to prevent reflow
        tabBarActiveTintColor: '#7F00FF',
        tabBarInactiveTintColor: 'black',

        tabBarStyle: {
          position: 'absolute',
          height: 60,
          paddingBottom: 5,
          borderTopWidth: 0,
          elevation: 10,
          backgroundColor: '#FFFFFF',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={Home}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={24}
              color={focused ? '#7F00FF' : 'black'}
            />
          )
        }}
      />
      <Tab.Screen
        name="ProductListSeller"
        component={ProductListSeller}
        options={{ tabBarIcon: ({ focused }) => (<Ionicons name={focused ? 'list' : 'list-outline'} size={24} color={focused ? '#7F00FF' : 'black'} />) }}
      />
      <Tab.Screen
        name="produtos"
        component={NewProduct}
        options={{
          tabBarIcon: () => <Ionicons name='add' size={20} color="white" />,
          tabBarButton: (props) => <CustomTabBarButton {...props} />,
        }}
      />
      <Tab.Screen
        name="Orders"
        component={Orders}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'file-tray-full' : 'file-tray-full-outline'}
              size={24}
              color={focused ? '#7F00FF' : 'black'}
            />
          )
        }}
      />
      <Tab.Screen
        name="Profile"
        component={Profile}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={24}
              color={focused ? '#7F00FF' : 'black'}
            />
          )
        }}
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigation;

const styles = StyleSheet.create({
  centerButtonWrapper: {
    flex: 1,
    top: -5,
    justifyContent: 'center',
    alignItems: 'center'
  },
  centerButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
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