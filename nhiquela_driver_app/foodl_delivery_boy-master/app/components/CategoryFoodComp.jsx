import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
} from "react-native";
import React from "react";
import { COLORS, SIZES } from "../constants/theme";
import NetworkImage from "../components/NetworkImage";
import { calculateDistance, calculateTravelTime } from "../services/Distance";
import { useContext } from "react";
import { UserLocationContext } from "../context/UserLocationContext";
import { DeliveryContext } from "../context/DeliveryContext";

const CategoryFoodComp = ({ item, onPress }) => {
  const { location, setLoaction } = useContext(UserLocationContext);
  

  const coords2 = {
    latitude: item.restaurantCoords[1],
    longitude: item.restaurantCoords[0],
  };

  const coords1 = {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };

  const coords3 = {
    latitude: item.recipientCoords[1],
    longitude: item.recipientCoords[0],
  };

  const toRestaurant = calculateDistance(coords1, coords2);
  const toClient = calculateDistance(coords2, coords3);

  const totalDistance = parseFloat(toRestaurant) + parseFloat(toClient);



  return (
    <TouchableOpacity style={styles.wrapper} onPress={onPress}>
      <View>
        <View style={{ flexDirection: "row" }}>
          <View
            style={{
              backgroundColor: COLORS.lightWhite,
              borderRadius: 12,
              margin: 5,
            }}
          >
            <NetworkImage
              data={item.restaurantId.imageUrl}
              width={55}
              height={63}
              raduis={10}
            />
          </View>

          <View
            style={{
              backgroundColor: COLORS.secondary,
              borderRadius: 8,
              position: "absolute",
              top: 10,
              right: 5,
            }}
          >
            <Text
              style={[
                styles.restaurant,
                { color: COLORS.lightWhite, marginHorizontal: 5 },
              ]}
            >
              Pick up
            </Text>
          </View>

          <View style={styles.row}>
            <View style={{ width: SIZES.width / 1.7 }}>
              <Text
                style={[styles.restaurant, { color: COLORS.gray }]}
                numberOfLines={1}
              >
                📍{item.restaurantId.coords.address}
              </Text>
              <Text
                style={[styles.restaurant, { color: COLORS.gray }]}
                numberOfLines={1}
              >
                🏡 {item.deliveryAddress.addressLine1}{" "}
                {item.deliveryAddress.district} {item.deliveryAddress.city}
              </Text>
            </View>
            <Text
              style={[
                styles.restaurant,
                { color: COLORS.primary, marginVertical: 5 },
              ]}
            >
              {" "}
              💲{item.deliveryFee} | Distance To:📍{toRestaurant} km | Distance
              To: 🏡 {toClient} km{" "}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default CategoryFoodComp;

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.offwhite,
    marginLeft: 10,
    width: SIZES.width - 40,
    height: 70,
    borderRadius: 12,
  },
  row: {
    marginLeft: 10,
    marginTop: 10,
  },
  restaurant: { fontFamily: "regular", fontSize: 11 },
});
