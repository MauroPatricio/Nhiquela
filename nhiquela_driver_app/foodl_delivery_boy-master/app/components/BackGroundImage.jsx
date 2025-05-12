import { StyleSheet, Image, View } from "react-native";
import React from "react";
import uidata from "../constants/uidata";

const BackGroundImage = () => {
  return (
    <Image
      source={{ uri: uidata.bkImg }}
      style={[
        StyleSheet.absoluteFillObject,
        {
          opacity: 0.4,
        },
      ]}
    />
  );
};

export default BackGroundImage;

