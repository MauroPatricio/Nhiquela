import { View, StyleSheet, TouchableOpacity } from 'react-native';
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import Home from '../screens/Home';
import Orders from '../screens/Orders';
import NewProduct from '../screens/NewProduct';
import ProductListSeller from '../components/products/ProductListSeller';
import Profile from '../screens/Profile';

const Tab = createBottomTabNavigator();

const CustomTabBarButton = ({ children, onPress }) => (
  <TouchableOpacity onPress={onPress} style={styles.centerButtonWrapper}>
    <View style={styles.centerButton}>
      {children}
    </View>
  </TouchableOpacity>
);

const ButtomTabNavegation = () => {
  return (
    <Tab.Navigator
      screenOptions={{ tabBarShowLabel: false, tabBarHideOnKeyboard: true, headerShown: false, tabBarStyle: styles.tabBar}}
    >
      <Tab.Screen
        name="Home"
        component={Home}
        options={{ tabBarIcon: ({ focused }) => (<Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={focused ? '#7F00FF' : 'black'} />) }}
      />

      <Tab.Screen
        name="ProductListSeller"
        component={ProductListSeller}
        options={{ tabBarIcon: ({ focused }) => (<Ionicons name={focused ? 'list' : 'list-outline'} size={24} color={focused ? '#7F00FF' : 'black'} />) }}
      />

      <Tab.Screen
        name="NewProduct"
        component={NewProduct}
        options={{ 
          tabBarIcon: ({ focused }) => (<Ionicons name={focused ? 'add-circle' : 'add-circle-outline'} size={50} color="#7F00FF" />),
          tabBarButton: (props) => <CustomTabBarButton {...props} />,
        }}
      />

      <Tab.Screen
        name="Orders"
        component={Orders}
        options={{ tabBarIcon: ({ focused }) => (<Ionicons name={focused ? 'file-tray' : 'file-tray-outline'} size={24} color={focused ? '#7F00FF' : 'black'} />) }}
      />

      <Tab.Screen
        name="Profile"
        component={Profile}
        options={{ tabBarIcon: ({ focused }) => (<Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={focused ? '#7F00FF' : 'black'} />) }}
      />
    </Tab.Navigator>
  )
};

export default ButtomTabNavegation;

const styles = StyleSheet.create({  
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 5,
    height: 70,
    backgroundColor: 'white',
    borderTopWidth: 0,
  },
  centerButtonWrapper: {
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'white',
    elevation: 5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7F00FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
});
