import React from "react";
import { 
  View, 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  Dimensions,
  Alert
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../styles/colors";

const { width } = Dimensions.get('window');

// Ícones usando texto Unicode (emojis e símbolos)
const ICONS = {
  home: '🏠',
  car: '🚗',
  map: '🗺️',
  profile: '👤',
};

type MenuItem = {
  name: string;
  label: string;
  icon: string;
  route: string;
};

const menuItems: MenuItem[] = [
  { name: "Home", label: "Início", icon: ICONS.home, route: "Home" },
  { name: "Trips", label: "Viagens", icon: ICONS.car, route: "Trips" },
  { name: "Map", label: "Mapa", icon: ICONS.map, route: "Map" },
  { name: "Profile", label: "Perfil", icon: ICONS.profile, route: "Profile" },
];

type Props = {
  state: any;
  navigation: any;
};

export default function BottomMenu({ state, navigation }: Props) {
  const currentRoute = state.routes[state.index].name;

  const handleNavigation = (route: string) => {
    try {
      if (!navigation || !navigation.navigate) {
        console.error("❌ Objeto de navegação não disponível");
        return;
      }
      navigation.navigate(route);
    } catch (error) {
      console.error(`❌ Erro ao navegar para ${route}:`, error);
      Alert.alert(
        "Erro de Navegação", 
        `Não foi possível acessar ${route}. Verifique se a tela existe.`
      );
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={COLORS.gradientPrimary}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        {menuItems.map((item) => {
          const isActive = currentRoute === item.route;
          
          return (
            <TouchableOpacity
              key={item.name}
              style={[
                styles.menuItem,
                isActive && styles.activeMenuItem
              ]}
              onPress={() => handleNavigation(item.route)}
            >
              <View style={styles.iconContainer}>
                <Text style={[
                  styles.iconText,
                  isActive && styles.activeIconText
                ]}>
                  {item.icon}
                </Text>
                {isActive && (
                  <View style={styles.activeDot} />
                )}
              </View>
              <Text style={[
                styles.menuText,
                isActive && styles.activeMenuText
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  gradient: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: 70,
  },
  menuItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    marginHorizontal: 2,
  },
  activeMenuItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    transform: [{ scale: 1.05 }],
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    position: 'relative',
  },
  iconText: {
    fontSize: 18,
    color: COLORS.gray100,
  },
  activeIconText: {
    color: COLORS.white,
    transform: [{ scale: 1.1 }],
  },
  activeDot: {
    position: 'absolute',
    bottom: -2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.secondaryLight,
  },
  menuText: {
    color: COLORS.gray100,
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 2,
  },
  activeMenuText: {
    color: COLORS.white,
    fontWeight: "700",
  },
});