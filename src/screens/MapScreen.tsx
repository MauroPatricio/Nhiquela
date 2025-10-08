import React, { useState, useEffect } from "react";
import { View, StyleSheet, Alert } from "react-native";
import TripMap from "../components/TripMap";
import TripControls from "../components/TripControls";
import { getCurrentLocation } from "../services/locationService";

export default function MapScreen({ route, navigation }: any) {
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [destination, setDestination] = useState<any>(null);
  const [routeDrawn, setRouteDrawn] = useState(false);
  const [canFinishTrip, setCanFinishTrip] = useState(false);

  const { tripData } = route.params || {};

  useEffect(() => {
    console.log("📦 Dados recebidos em tripData:", tripData);

    (async () => {
      try {
        const location = await getCurrentLocation();
        setCurrentLocation(location);

        console.log("tripData Recebido", tripData);

        if (tripData?.destinationLocation) {
          console.log("🎯 Definindo destino recebido:", tripData.destinationLocation);
          setDestination(tripData.destinationLocation);
        } else {
          console.log("⚠️ Nenhum destino recebido em tripData");
        }
      } catch (err: any) {
        console.error("❌ Erro ao obter localização:", err.message);
        Alert.alert("Erro", err.message);
      }
    })();
  }, [tripData]);

  const handleSelectDestination = () => {
    if (!currentLocation) return;

    const newDestination = {
      latitude: currentLocation.latitude + 0.005,
      longitude: currentLocation.longitude + 0.005,
    };
    console.log("📍 Definindo destino manualmente:", newDestination);
    setDestination(newDestination);
  };

  const handleCancelTrip = () => {
    if (routeDrawn) {
      Alert.alert(
        "❌ Cancelamento não permitido",
        "Não é possível cancelar a viagem após a rota estar desenhada. Complete a entrega do produto.",
        [{ text: "OK" }]
      );
    } else {
      Alert.alert("Viagem cancelada", "Você cancelou a viagem.");
      navigation.goBack();
    }
  };

  const handleFinishTrip = () => {
    if (!canFinishTrip) {
      Alert.alert(
        "⏳ Viagem não pode ser finalizada",
        "Você precisa estar próximo ao destino para finalizar."
      );
      return;
    }
    Alert.alert("✅ Viagem finalizada", "Entrega concluída com sucesso!");
    navigation.navigate("Home");
  };

  return (
    <View style={styles.container}>
      {currentLocation && (
        <TripMap
          // origin={currentLocation}
          destination={{
            latitude: currentLocation.latitude + 0.005, // desloca 500m para teste
            longitude: currentLocation.longitude + 0.005,
          }}
          onRouteReady={() => {
            setRouteDrawn(true);
            setCanFinishTrip(true); // libera botão finalizar
          }}
        />
      )}

      <TripControls
        onCancelTrip={handleCancelTrip}
        onFinishTrip={handleFinishTrip}
        canFinishTrip={canFinishTrip}
        routeDrawn={routeDrawn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
});
