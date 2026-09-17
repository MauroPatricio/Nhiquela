import { showMessage } from "react-native-flash-message";
import React from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get('window');

const menuItems = [
  { name: "Home",    iconActive: "home",          iconInactive: "home-outline",          route: "Home" },
  { name: "Trips",   iconActive: "car",            iconInactive: "car-outline",            route: "Trips" },
  { name: "Map",     iconActive: "map",            iconInactive: "map-outline",            route: "Map" },
  { name: "Wallet",  iconActive: "wallet",         iconInactive: "wallet-outline",         route: "Wallet" },
  { name: "Profile", iconActive: "person",         iconInactive: "person-outline",         route: "Profile" },
];

type Props = {
  state: any;
  navigation: any;
};

export default function BottomMenu({ state, navigation }: Props) {
  const currentRoute = state.routes[state.index].name;

  const goTo = (route: string) => {
    try {
      if (!navigation || !navigation.navigate) {
        return;
      }
      navigation.navigate(route);
    } catch (error) {
      showMessage({
        message: "Erro",
        description: "Não foi possível aceder à página.",
        type: "danger",
        icon: "auto",
        duration: 3000,
      });
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.bar}>
        {menuItems.map((item) => {
          const isActive = currentRoute === item.route;

          return (
            <TouchableOpacity
              key={item.name}
              activeOpacity={0.7}
              onPress={() => goTo(item.route)}
              style={styles.tab}
            >
              <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                <Ionicons
                  name={isActive ? (item.iconActive as any) : (item.iconInactive as any)}
                  size={isActive ? 26 : 24}
                  color={isActive ? "#7F00FF" : "#9CA3AF"}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    alignItems: "center",
  },
  bar: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 8,
    width: "100%",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 15,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  iconWrapActive: {
    backgroundColor: "rgba(127, 0, 255, 0.12)",
    borderRadius: 16,
  },
});