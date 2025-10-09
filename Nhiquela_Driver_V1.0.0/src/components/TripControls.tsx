import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../styles/colors";

type Props = {
  onCancelTrip: () => void;
  onFinishTrip: () => void;
  canFinishTrip: boolean;
  routeDrawn: boolean; // indica se rota já foi desenhada
};

export default function TripControls({
  onCancelTrip,
  onFinishTrip,
  canFinishTrip,
  routeDrawn,
}: Props) {
  const handleCancel = () => {
    if (routeDrawn) {
      Alert.alert(
        "❌ Cancelamento não permitido",
        "Não é possível cancelar a viagem após a rota estar desenhada. Complete a entrega do produto.",
        [{ text: "OK" }]
      );
    } else {
      onCancelTrip();
    }
  };

  return (
    <View style={styles.container}>
      {/* Botão Cancelar Viagem */}
      <TouchableOpacity onPress={handleCancel}>
        <LinearGradient
          colors={["#FF4E4E", "#FF7F7F"]}
          style={styles.cancelButton}
        >
          <Text style={styles.text}>Cancelar Viagem</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Botão Finalizar Viagem */}
      <TouchableOpacity
        onPress={onFinishTrip}
        disabled={!canFinishTrip}
        style={{ opacity: canFinishTrip ? 1 : 0.6 }}
      >
        <LinearGradient
          colors={canFinishTrip ? ["#27AE60", "#2ECC71"] : ["#ccc", "#aaa"]}
          style={styles.finishButton}
        >
          <Text style={styles.text}>Finalizar Viagem</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 30,
    width: "100%",
    paddingHorizontal: 20,
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 6,
  },
  finishButton: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 6,
  },
  text: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
  },
});
