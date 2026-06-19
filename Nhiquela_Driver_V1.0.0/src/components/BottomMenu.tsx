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
  { name: "Home",    iconActive: "home",    iconInactive: "home-outline",    route: "Home" },
  { name: "Trips",   iconActive: "car",     iconInactive: "car-outline",     route: "Trips" },
  { name: "Map",     iconActive: "map",     iconInactive: "map-outline",     route: "Map" },
  { name: "Profile", iconActive: "person",  iconInactive: "person-outline",  route: "Profile" },
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
                  size={24}
                  color={isActive ? "#FFFFFF" : "#7F00FF"}
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
    bottom: 24,
    left: 16,
    right: 16,
    alignItems: "center",
  },
  bar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 36,
    paddingVertical: 10,
    paddingHorizontal: 12,
    width: "100%",
    justifyContent: "space-around",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    backgroundColor: "#7F00FF",
    borderRadius: 24,
    shadowColor: "#7F00FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
});