import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { useState, useContext } from "react";
import { COLORS, SIZES } from "../constants/theme";
import { useRoute } from "@react-navigation/native";
import AssetImage from "../components/AssetImage";
import axios from "axios";
import BackGroundImage from "../components/BackGroundImage";
import MapText from "../components/MapText";
import { Ionicons } from "@expo/vector-icons";
import { RatingInput, Rating } from "react-native-stock-star-rating";

const Delivered = () => {
  const route = useRoute();
  const item = route.params;

  return (
    <View style={styles.outer}>
      <View
        style={[
          styles.inner,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <BackGroundImage />

        <AssetImage
          data={require("../../assets/delivery.png")}
          width={SIZES.width}
          height={SIZES.height / 3.5}
          mode={"contain"}
        />

        <View style={{ height: 15 }} />

        <View
          style={{
            marginTop: 20,
            width: SIZES.width - 40,
            height: 95,
            backgroundColor: COLORS.lightWhite,
            borderRadius: 12,
          }}
        >
          <Text style={{ marginLeft: 15, marginTop: 5, fontFamily: "medium" }}>
            {`Order : ${item._id}`}
          </Text>
          <MapText
            text={`🏡 ${item.deliveryAddress.addressLine1} ${item.deliveryAddress.district}${item.deliveryAddress.city}`}
            color={COLORS.gray}
          />

          <View style={{ height: 5 }} />

          <View
            style={{
              margin: 10,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="car-sport" size={24} color={COLORS.gray} />
              <View style={{ width: 10 }} />
              <Text style={{ fontFamily: "bold", color: COLORS.gray }}>
                Driver Rating
              </Text>
            </View>

            <RatingInput
              rating={5}
              color={COLORS.primary}
              setRating={() => {}}
              size={18}
              maxStars={5}
              bordered={false}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

export default Delivered;

const styles = StyleSheet.create({
  inner: {
    backgroundColor: COLORS.offwhite,
    height: SIZES.height - 80,
    borderBottomEndRadius: 30,
    borderBottomStartRadius: 30,
  },
  outer: { backgroundColor: COLORS.primary, height: SIZES.height },
});
