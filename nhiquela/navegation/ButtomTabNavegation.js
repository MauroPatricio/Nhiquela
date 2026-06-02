import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import Home from '../screens/Home';
import Search from '../screens/Search';
import Orders from '../screens/Orders';
import RequestDeliv from '../screens/RequestDeliv';
import Profile from '../screens/Profile';
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
      <Tab.Screen name="Início" component={Home} />
      <Tab.Screen name="Pesquisa" component={Search} />
      <Tab.Screen name="NovoPedido" component={RequestDeliv} />
      <Tab.Screen name="Pedidos" component={Orders} />
      <Tab.Screen name="Perfil" component={Profile} />
    </Tab.Navigator>
  );
};

export default BottomTabNavigation;
