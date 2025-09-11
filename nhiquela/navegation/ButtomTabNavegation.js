import { View, StyleSheet, TouchableOpacity } from 'react-native';
import React, { memo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import Home from '../screens/Home';
import Search from '../screens/Search';
import Orders from '../screens/Orders';
import RequestDeliv from '../screens/RequestDeliv';
import Profile from '../screens/Profile';

const Tab = createBottomTabNavigator();

const CustomTabBarButton = memo(({ children, onPress }) => (
  <View
    style={styles.centerButtonWrapper}
    onPress={onPress}
    activeOpacity={0.9}
  >
    <View style={styles.centerButton}>
      {children}
    </View>
  </View>
));




const ButtomTabNavegation = () => {
  return (
    <Tab.Navigator
      screenOptions={{ 
        tabBarShowLabel: false, 
        tabBarHideOnKeyboard: true, 
        headerShown: false,
        tabBarStyle: styles.tabBar 
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
              color={focused ? '#7F00FF' : 'gray'}
            />
          )
        }}
      />

      <Tab.Screen
        name="Search"
        component={Search}
        options={{ 
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'search' : 'search-outline'}
              size={24}
              color={focused ? '#7F00FF' : 'gray'}
            />
          )
        }}
      />

      <Tab.Screen
        name="RequestDeliv"
        component={RequestDeliv}
        options={{ 
          tabBarIcon: () => (
            <Ionicons
              name='add'
              size={36}
              color="white"
            />
          ),
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
              color={focused ? '#7F00FF' : 'gray'}
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
              color={focused ? '#7F00FF' : 'gray'}
            />
          )
        }}
      />
    </Tab.Navigator>
  )
};

export default ButtomTabNavegation;

const styles = StyleSheet.create({ 
  tabBar: {
    position: 'absolute',
    bottom: 10,
    left: 20,
    right: 20,
    elevation: 5,
    backgroundColor: '#fff',
    borderRadius: 20,
    height: 70,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },

  centerButtonWrapper: {
    // top: -25,  // faz o botão flutuar acima da barra
    justifyContent: 'center',
    alignItems: 'center',
  },

  centerButton: {
    width: 50,
    height: 50,
    borderRadius: 35,
    backgroundColor: '#7F00FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7F00FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
});
