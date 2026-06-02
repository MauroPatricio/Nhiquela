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
  { name: "Início",     iconActive: "home",              iconInactive: "home-outline",              route: "Início" },
  { name: "Pesquisa",   iconActive: "search",            iconInactive: "search-outline",            route: "Pesquisa" },
  { name: "NovoPedido", iconActive: "add",               iconInactive: "add",                       route: "NovoPedido", isCenter: true },
  { name: "Pedidos",    iconActive: "file-tray-full",    iconInactive: "file-tray-full-outline",    route: "Pedidos" },
  { name: "Perfil",     iconActive: "person",            iconInactive: "person-outline",            route: "Perfil" },
];

export default function BottomMenu({ state, navigation }) {
  const currentRoute = state.routes[state.index].name;

  const goTo = (route) => {
    try {
      navigation?.navigate(route);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível aceder à página.");
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.bar}>
        {menuItems.map((item) => {
          const isActive = currentRoute === item.route;

          if (item.isCenter) {
            return (
              <TouchableOpacity
                key={item.name}
                activeOpacity={0.8}
                onPress={() => goTo(item.route)}
                style={styles.centerTab}
              >
                <View style={[styles.centerIconWrap, isActive && styles.centerIconWrapActive]}>
                  <Ionicons
                    name="add"
                    size={30}
                    color="#FFFFFF"
                  />
                </View>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={item.name}
              activeOpacity={0.7}
              onPress={() => goTo(item.route)}
              style={styles.tab}
            >
              <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                <Ionicons
                  name={isActive ? item.iconActive : item.iconInactive}
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
  centerTab: {
    width: 68,
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
  centerIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#7F00FF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7F00FF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  centerIconWrapActive: {
    backgroundColor: "#5900B3",
    borderRadius: 28,
    transform: [{ scale: 1.08 }],
    shadowColor: "#5900B3",
  }
});
