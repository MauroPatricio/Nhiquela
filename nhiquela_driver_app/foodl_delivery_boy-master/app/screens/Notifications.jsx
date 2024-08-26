import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { useState, useContext } from "react";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { COLORS, SIZES } from "../constants/theme";
import { useRoute } from "@react-navigation/native";
import AssetImage from "../components/AssetImage";
import { UserLocationContext } from "../context/UserLocationContext";
import { useEffect } from "react";
import { apiKey, calculateDistance } from "../services/Distance";
import PlaceMarker from "../components/PlaceMarker";
import {
  SimpleLineIcons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import MapText from "../components/MapText";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import fetchOrders from "../hook/fetchOrders";

const Notificaxions = ({navigation}) => {
  const route = useRoute();
  const item = route.params;
  const { location, setLocation } = useContext(UserLocationContext);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [mapRegion, setMapRegion] = useState({
    latitude: 37.785925590588505,
    longitude: -122.41007428687641,
    latitudeDelta: 0.004,
    longitudeDelta: 0.01,
  });

  const pickOrder = async () => {
    const driver = await AsyncStorage.getItem("driver");
    const token = await AsyncStorage.getItem("token");
    const accessToken = JSON.parse(token);
    const data = JSON.parse(driver);

    const endpoint = `http://localhost:6002/api/orders/picked-orders/${item._id}/${data._id}`;
    try {
      const response = await axios.put(endpoint,{}, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if(response.status === 200){
        navigation.replace("bottom-navigation");
      }

    } catch (error) {
      console.log(error.message);
    }
  };

  const origin = {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
  const destination = {
    latitude: item.restaurantCoords[1],
    longitude: item.restaurantCoords[0],
  };


  const placeList = [
    {
      id: 1,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      title: "Your Location",
    },
    {
      id: 2,
      latitude: item.restaurantCoords[1],
      longitude: item.restaurantCoords[0],
      title: "Restaurant",
    },
    {
      id: 3,
      latitude: item.recipientCoords[1],
      longitude: item.recipientCoords[0],
      title: "Client",
    },
  ];


  const toClient = calculateDistance(placeList[1], placeList[2]);

  const totalDistance = parseFloat(toClient) + parseFloat(distance) + 1.5;

  useEffect(() => {
    setMapRegion({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      latitudeDelta: 0.003,
      longitudeDelta: 0.01,
    });
  }, [location]);

  return (
    <View style={styles.container}>
      {item === undefined ? (
        <View style={{ backgroundColor: COLORS.primary, height: SIZES.height }}>
          <View style={styles.undefinedWrapper}>
            <AssetImage
              data={require("../../assets/delivery.png")}
              width={SIZES.width - 20}
              height={SIZES.height / 4}
              mode={"contain"}
            />
          </View>
        </View>
      ) : (
        <View
          style={{
            height: "100%",
            overflow: "hidden",
          }}
        >
          <View style={styles.mapWrapper}>
            <MapView
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              showsUserLocation={true}
              region={mapRegion}
            >
              {placeList.map(
                (item, index) =>
                  index <= 1 && <PlaceMarker coordinates={item} />
              )}
              <MapViewDirections
                origin={origin}
                destination={destination}
                apikey={apiKey}
                strokeWidth={5}
                strokeColor={COLORS.tertiary}
                optimizeWaypoints={true}
                onReady={(result) => {
                  setDistance(result.distance);
                  setDuration(result.duration);
                }}
              />
            </MapView>
          </View>
          <View
            style={{ position: "absolute", zIndex: 0, bottom: 30, left: 10 }}
          >
            <View
              style={{
                width: SIZES.width - 20,
                height: 180,
                backgroundColor: COLORS.primary1,
                borderRadius: 12,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <View
                  style={{
                    marginTop: 10,
                    left: 10,
                    width: SIZES.width - 100,
                    height: 30,
                    backgroundColor: COLORS.lightWhite,
                    borderRadius: 16,
                  }}
                >
                  <Text style={{ top: 5, left: 12, fontFamily: "regular" }}>
                    Order No. {item._id}
                  </Text>
                </View>

                <TouchableOpacity
                  style={{
                    backgroundColor: COLORS.secondary,
                    width: 30,
                    height: 30,
                    borderRadius: 60,
                    right: 16,
                    top: 7,
                  }}
                >
                  <SimpleLineIcons
                    name="phone"
                    size={18}
                    style={{ top: 5, left: 6 }}
                    color={"white"}
                  />
                </TouchableOpacity>
              </View>

              <View
                style={{
                  marginTop: 10,
                  left: 10,
                  width: SIZES.width - 40,
                  height: 70,
                  backgroundColor: COLORS.lightWhite,
                  borderRadius: 12,
                }}
              >
                <View>
                  <View style={{ flexDirection: "row", marginBottom: 10 }}>
                    <View style={{ flexDirection: "row", left: 10 }}>
                      <MaterialCommunityIcons
                        name="map-marker-distance"
                        size={20}
                        style={{ top: 5 }}
                      />
                      <MapText
                        text={`${distance.toFixed(3)} km`}
                        color={COLORS.gray}
                      />
                    </View>

                    <View style={{ flexDirection: "row", left: 50 }}>
                      <MaterialCommunityIcons
                        name="clock-time-two-outline"
                        size={20}
                        style={{ top: 5 }}
                      />
                      <MapText
                        text={`${duration.toFixed(2)} min`}
                        color={COLORS.gray}
                      />
                    </View>

                    <View style={{ flexDirection: "row", left: 80 }}>
                      <MaterialIcons
                        name="trip-origin"
                        size={20}
                        style={{ top: 5 }}
                      />
                      <MapText
                        text={`${totalDistance.toFixed(3)} km`}
                        color={COLORS.gray}
                      />
                    </View>
                  </View>
                  <MapText
                    text={`🏡   ${item.deliveryAddress.addressLine1}${" "}${item.deliveryAddress.district} ${
                      item.deliveryAddress.city
                    }`}
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.btn} onPress={() => pickOrder()}>
                <Text style={styles.btnText}>Pick Up</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ position: "absolute", zIndex: 0, top: 90, left: 10 }}>
            <View
              style={{
                width: SIZES.width - 20,
                height: 50,
                backgroundColor: COLORS.lightWhite,
                borderRadius: 30,
              }}
            >
              <Text
                style={{
                  fontFamily: "medium",
                  fontSize: 13,
                  left: 20,
                  top: 5,
                  color: COLORS.dark,
                }}
              >
                Pick order from {item.restaurantId.title}
              </Text>

              <Text style={styles.restAd}>
                📍 {item.restaurantId.coords.address}
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default Notificaxions;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  restAd: {
    fontFamily: "regular",
    fontSize: 13,
    left: 15,
    top: 5,
    color: COLORS.gray,
  },
  undefinedWrapper: {
    backgroundColor: COLORS.offwhite,
    height: SIZES.height - 80,
    borderBottomEndRadius: 30,
    borderBottomStartRadius: 30,
    paddingTop: SIZES.height / 3,
  },
  mapWrapper: {
    width: "100%",
    height: "100%",
    borderBottomEndRadius: 30,
    borderBottomStartRadius: 30,
    overflow: "hidden", // Ensures the MapView respects the border radius
  },
  map: {
    width: "100%",
    height: "100%",
  },
  btn: {
    top: 10,
    left: 8,
    height: 40,
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    width: SIZES.width - 40,
  },
  btnText: {
    top: 6,
    fontFamily: "bold",
    color: "white",
    left: SIZES.width / 2.6,
    fontSize: 18,
  },
});
