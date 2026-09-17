import { showMessage } from "react-native-flash-message";
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/apiConfig";

const { width } = Dimensions.get('window');

const menuItems = [
  { name: "Home",        iconActive: "home",          iconInactive: "home-outline",          route: "Home" },
  { name: "Trips",       iconActive: "car",            iconInactive: "car-outline",            route: "Trips" },
  { name: "Map",         iconActive: "map",            iconInactive: "map-outline",            route: "Map" },
  { name: "FleetDriver", iconActive: "construct",      iconInactive: "construct-outline",      route: "FleetDriver" },
  { name: "Profile",     iconActive: "person",         iconInactive: "person-outline",         route: "Profile" },
];

type Props = {
  state: any;
  navigation: any;
};

export default function BottomMenu({ state, navigation }: Props) {
  const currentRoute = state.routes[state.index].name;
  const [fleetBadgeCount, setFleetBadgeCount] = useState(0);

  const fetchBadgeCounts = useCallback(async () => {
    try {
      // 1. Obter viatura ativa
      const vRes = await api.get('/fleet/driver/assigned-vehicle').catch(() => null);
      let vehicleId: string | null = null;
      let currentOdometer = 0;

      if (vRes?.data) {
        if (Array.isArray(vRes.data) && vRes.data.length > 0) {
          vehicleId = vRes.data[0]?._id;
          currentOdometer = vRes.data[0]?.currentOdometer || 0;
        } else if (vRes.data.vehicle?._id) {
          vehicleId = vRes.data.vehicle._id;
          currentOdometer = vRes.data.vehicle?.currentOdometer || 0;
        } else if (vRes.data.vehicles?.length > 0) {
          vehicleId = vRes.data.vehicles[0]?._id;
          currentOdometer = vRes.data.vehicles[0]?.currentOdometer || 0;
        } else if (vRes.data._id) {
          vehicleId = vRes.data._id;
          currentOdometer = vRes.data?.currentOdometer || 0;
        }
      }

      const [alertsRes, maintRes] = await Promise.all([
        api.get('/fleet/alerts').catch(() => ({ data: [] })),
        vehicleId ? api.get(`/fleet/maintenance?vehicleId=${vehicleId}`).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      ]);

      const activeAlerts = Array.isArray(alertsRes.data)
        ? alertsRes.data.filter((a: any) => a.status === 'PENDING' || a.status === 'ACTIVE').length
        : 0;

      const overdueMaint = Array.isArray(maintRes.data)
        ? maintRes.data.filter((m: any) => {
            const isOverdue =
              m.status === 'VENCIDA' ||
              m.status === 'ATRASADO' ||
              m.status === 'ATRASADA' ||
              (Number(m.nextMaintenanceKm) > 0 && currentOdometer >= Number(m.nextMaintenanceKm));
            return isOverdue;
          }).length
        : 0;

      setFleetBadgeCount(activeAlerts + overdueMaint);
    } catch (e) {
      // silencioso
    }
  }, []);

  useEffect(() => {
    fetchBadgeCounts();
    const interval = setInterval(fetchBadgeCounts, 12000);
    return () => clearInterval(interval);
  }, [currentRoute, fetchBadgeCounts]);

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
                {item.route === "FleetDriver" && fleetBadgeCount > 0 && (
                  <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>
                      {fleetBadgeCount > 99 ? "99+" : fleetBadgeCount}
                    </Text>
                  </View>
                )}
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
  badgeContainer: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
});