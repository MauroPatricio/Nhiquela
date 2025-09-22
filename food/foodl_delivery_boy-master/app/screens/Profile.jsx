import { StyleSheet, Text, View, Image, TouchableOpacity } from "react-native";
import React, { useContext, useState, useRef } from "react";
import { COLORS, SIZES } from "../constants/theme";

import { LoginContext } from "../context/LoginContext";

import { AntDesign } from "@expo/vector-icons";

import NetworkImage from "../components/NetworkImage";
import ProfileTile from "../components/ProfileTile";
import RegistrationTile from "../components/RegistrationTile";
import LoadingScreen from "../components/LoadingScreen";
import fetchProfile from "../hook/fetchProfile";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserType } from "../context/UserType";
import uidata from "../constants/uidata";
import BackGroundImage from "../components/BackGroundImage";

const Profile = ({ navigation }) => {
  const { user, isProfileLoading, error, refetch } = fetchProfile();
  const { login, setLogin } = useContext(LoginContext);
  const { userType, setUserType } = useContext(UserType);
  const profile =
    "https://d326fntlu7tb1e.cloudfront.net/uploads/b5065bb8-4c6b-4eac-a0ce-86ab0f597b1e-vinci_04.jpg";
  
  if (isProfileLoading) {
    return <LoadingScreen />;
  }

  const logout = async () => {
    await AsyncStorage.removeItem("id");
    await AsyncStorage.removeItem("token");
    setLogin(false);
    setUserType(null);
    navigation.replace("bottom-navigation");
  };

  return (
    <View>
      <View style={{ backgroundColor: COLORS.primary, height: SIZES.height }}>
        <View
          style={{
            backgroundColor: COLORS.offwhite,
            height: SIZES.height - 80,
            borderBottomEndRadius: 30,
            borderBottomStartRadius: 30,
          }}
        >
          <BackGroundImage />
          <View style={styles.profile}>
            <View
              style={{
                flexDirection: "row",
              }}
            >
              <NetworkImage
                data={user === null ? profile : user.profile}
                width={45}
                height={45}
                raduis={99}
              />
              <View style={{ marginLeft: 10, marginTop: 3 }}>
                <Text style={styles.text}>
                  {user === null ? "" : user.username}
                </Text>
                <Text style={styles.email}>
                  {user === null ? "" : user.email}
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={() => logout()}>
              <AntDesign name="logout" size={24} color="red" />
            </TouchableOpacity>
          </View>

          <RegistrationTile
            heading={"Register a restaurant"}
            desc={
              "Join our community and showcase your culinary delights to a wider audience."
            }
          />

          <View
            style={{
              height: 140,
              backgroundColor: COLORS.lightWhite,
              margin: 10,
              borderRadius: 12,
            }}
          >
            <ProfileTile title={"Orders"} icon={"fast-food-outline"} font={1} />
            <ProfileTile title={"Places"} icon={"heart"} font={2} />
            <ProfileTile title={"Payment History"} icon={"creditcard"} />
          </View>

          {userType === "Driver" ? (
            <View />
          ) : (
            <RegistrationTile
              heading={"Join the courier team"}
              desc={
                "Embark on a journey, deliver joy, and earn on your own schedule."
              }
            />
          )}

          <View
            style={{
              height: 140,
              backgroundColor: COLORS.lightWhite,
              margin: 10,
              borderRadius: 12,
            }}
          >
            <ProfileTile
              title={"Shipping Address"}
              icon={"location-outline"}
              font={1}
            />
            <ProfileTile title={"Services Center"} icon={"customerservice"} />
            <ProfileTile title={"Settings"} icon={"setting"} />
          </View>
        </View>
      </View>
    </View>
  );
};

export default Profile;

const styles = StyleSheet.create({
  text: {
    marginLeft: 10,
    fontFamily: "medium",
    color: COLORS.black,
  },
  email: {
    marginLeft: 10,
    fontFamily: "regular",
    color: COLORS.gray,
  },
  profile: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 60,
  },
});
