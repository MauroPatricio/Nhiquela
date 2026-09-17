import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import Home from '../screens/Home';
import Orders from '../screens/Orders';
import Profile from '../screens/Profile';
import NewProduct from '../screens/NewProduct';
import ProductListSeller from '../components/products/ProductListSeller';
import BottomMenu from '../components/BottomMenu';

const Tab = createBottomTabNavigator();

const BottomTabNavigation = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <BottomMenu {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="ProductListSeller" component={ProductListSeller} />
      <Tab.Screen name="produtos" component={NewProduct} />
      <Tab.Screen name="Orders" component={Orders} />
      <Tab.Screen name="Profile" component={Profile} />
    </Tab.Navigator>
  )
};

export default BottomTabNavigation;
