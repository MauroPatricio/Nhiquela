import { StyleSheet, Image, View } from "react-native";
import React from "react";

const NetworkImage = ({ data, width, height, mode, raduis }) => {
  return (
    <Image source={{uri: data}} style={styles.image(width, height, mode, raduis)} />
  );
};

export default NetworkImage;

const styles = StyleSheet.create({
  image: (width, height, mode, raduis) => ({
    height: height,
    width: width,
    borderRadius: raduis,
    resizeMode: mode,
  }),
});
