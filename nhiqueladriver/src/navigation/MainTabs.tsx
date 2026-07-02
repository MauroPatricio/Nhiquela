// @ts-nocheck
import React from "react";
import { View, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ROUTES } from "./routes";

import HomeScreen from "../screens/HomeScreen";
import TripsScreen from "../screens/TripScreen";
import MapScreen from "../screens/MapScreen";
import ProfileScreen from "../screens/ProfileScreen";
import BottomMenu from "../components/BottomMenu";
import DriverHeader from "../components/DriverHeader";

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <View style={styles.container}>
      <DriverHeader
        onMenuPress={() => console.log("Menu pressed")}
        onNotificationPress={() => console.log("Notifications pressed")}
        onStartTrip={() => console.log("Viagem iniciada")}
        profileImage="https://via.placeholder.com/150"
        todayEarnings="MT 245,00"
        totalPassengers={12}
        credit="MT 100,00"
        currentLocation="Maputo, Moçambique"
        batteryLevel={92}
        online={true}
      />

      <Tab.Navigator
        tabBar={(props) => <BottomMenu {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name={ROUTES.HOME} component={HomeScreen} />
        <Tab.Screen name={ROUTES.TRIPS} component={TripsScreen} />
        <Tab.Screen name={ROUTES.MAP} component={MapScreen} />
        <Tab.Screen name={ROUTES.PROFILE} component={ProfileScreen} />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
