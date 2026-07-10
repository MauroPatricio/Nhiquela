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


  return (
    <View style={styles.container}>
      {/* Botão Finalizar Viagem */}
      <TouchableOpacity
        onPress={onFinishTrip}
        style={{ opacity: 1 }}
      >
        <LinearGradient
          colors={canFinishTrip ? ["#27AE60", "#2ECC71"] : ["#ccc", "#aaa"]}
          style={styles.finishButton}
        >
          <Text style={styles.text}>Cheguei ao Destino</Text>
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
