import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "../styles/colors";

type Props = {
  from: string;
  to: string;
  date: string;
  price: number;
};

export default function TripCard({ from, to, date, price }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.route}>{`${from} → ${to}`}</Text>
      <Text style={styles.info}>Data: {date}</Text>
      <Text style={styles.info}>Preço: {price} MZN</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 10,
    shadowColor: COLORS.black,
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  route: { fontSize: 18, color: COLORS.black },
  info: { fontSize: 14, color: COLORS.black },
});
