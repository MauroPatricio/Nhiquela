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

// const CustomTabBarButton = memo(({ children, onPress }) => (
  <></>
  // <TouchableOpacity
  //   style={styles.centerButtonWrapper}
  //   onPress={onPress}
  //   activeOpacity={0.8}
  // >
  //   <View style={styles.centerButton}>
  //     {children}
  //   </View>
  // </TouchableOpacity>
// ));

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
              color={focused ? '#7F00FF' : 'black'}
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
              color={focused ? '#7F00FF' : 'black'}
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
              name='add-circle'
              size={50}
              color="#7F00FF"
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
  )
};

export default ButtomTabNavegation;

const styles = StyleSheet.create({ 

  centerButtonWrapper: {
    // top: -30,               // sobe mais o botão
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButton: {
    width: 75,
    height: 75,
    borderRadius: 37.5,
    backgroundColor: 'white',
    elevation: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7F00FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    borderWidth: 4,
    borderColor: 'white',
  },
});

