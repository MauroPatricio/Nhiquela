import {
  ScrollView,
  Text,
  View,
  Alert,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
} from "react-native";
import React, { useState } from "react";
import axios from "axios";
import Button from "../components/Button";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SIZES } from "../constants/theme";
import { Formik } from "formik";
import * as Yup from "yup";
import styles from "./login.style";
import AssetImage from "../components/AssetImage";
import ChoicesList from "../components/ChoicesList";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserLocationContext } from "../context/UserLocationContext";
import { useContext } from "react";

const validationSchema = Yup.object().shape({
  phone: Yup.string()
    .min(8, "Number must be at least 9 character")
    .required("Required"),
  vehicleNumber: Yup.string()
    .min(3, "Provide a valid vehicle number")
    .required("Required"),
});

const vehicles = ["Bike", "Car", "Scooter"];
const bkImg =
  "https://d326fntlu7tb1e.cloudfront.net/uploads/ab6356de-429c-45a1-b403-d16f7c20a0bc-bkImg-min.png";

const DriverRegistration = ({ navigation }) => {
  const { location, setLocation } = useContext(UserLocationContext);
  const [loader, setLoader] = useState(false);
  const [phone, setPhone] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [selectedChoice, setSelectedChoice] = useState(null);

  console.log(selectedChoice);
  const inValidForm = () => {
    Alert.alert("Invalid Form", "Please provide all required fields", [
      {
        text: "Cancel",
        onPress: () => {},
      },
      {
        text: "Continue",
        onPress: () => {},
      },
      { defaultIndex: 1 },
    ]);
  };

  const registerDriver = async (values) => {
    const token = await AsyncStorage.getItem("token");
    const accessToken = JSON.parse(token);
    setLoader(true);

    try {
      const endpoint = "http://localhost:6002/api/driver";

      console.log(selectedChoice);
      const data = {
        "vehicleType": selectedChoice,
        "vehicleNumber": values.vehicleNumber,
        "latitude": location.coords.latitude,
        "longitude": location.coords.longitude,
        "phone": values.phone,
      };

      const headers = {
        Authorization: `Bearer ${accessToken}`,
      };

      const response = await axios.post(endpoint, data, { headers });
      if (response.status === 201) {

        setLoader(false);

        navigation.goBack();
      } else {
        console.log(response.status);
      }
    } catch (error) {
        console.log(error);
      Alert.alert(
        "Error",
        "Oops, Error logging in try again with correct credentials",
        [
          {
            text: "Cancel",
            onPress: () => {},
          },
          {
            text: "Continue",
            onPress: () => {},
          },
          { defaultIndex: 1 },
        ]
      );
    } finally {
      setLoader(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: COLORS.white }}>
      <Image
        source={{ uri: bkImg }}
        style={[
          StyleSheet.absoluteFillObject,
          {
            opacity: 0.3,
          },
        ]}
      />
      <SafeAreaView style={{ marginHorizontal: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons
              name="chevron-back-circle"
              size={30}
              color={COLORS.primary}
            />
          </TouchableOpacity>

          <Text
            style={{
              fontSize: 16,
              fontFamily: "bold",
              color: COLORS.primary,
              paddingLeft: 80,
            }}
          >
            Join Courier Team
          </Text>
        </View>

        <View style={{ marginVertical: 30 }}>
          <AssetImage
            data={require("../../assets/delivery.png")}
            width={SIZES.width - 40}
            height={200}
            mode={"contain"}
          />
        </View>
        <ChoicesList setSelectedChoice={setSelectedChoice} />
        <View></View>

        <Formik
          initialValues={{
            phone: "",
            vehicleNumber: "",
          }}
          validationSchema={validationSchema}
          onSubmit={(values) => registerDriver(values)}
        >
          {({
            handleChange,
            handleBlur,
            touched,
            handleSubmit,
            values,
            errors,
            isValid,
            setFieldTouched,
          }) => (
            <View>
              <View style={styles.wrapper}>
                <Text style={styles.label}>Vehicle Number</Text>
                <View
                  style={styles.inputWrapper(
                    touched.vehicleNumber ? COLORS.secondary : COLORS.offwhite
                  )}
                >
                  <Ionicons
                    name="car-sport-outline"
                    size={20}
                    color={COLORS.gray}
                    style={styles.iconStyle}
                  />

                  <TextInput
                    placeholder="Vehicle Number"
                    onFocus={() => {
                      setFieldTouched("vehicleNumber");
                    }}
                    onBlur={() => {
                      setFieldTouched("vehicleNumber", "");
                    }}
                    value={values.vehicleNumber}
                    onChangeText={handleChange("vehicleNumber")}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={{ flex: 1 }}
                  />
                </View>
                {touched.vehicleNumber && errors.vehicleNumber && (
                  <Text style={styles.errorMessage}>
                    {errors.vehicleNumber}
                  </Text>
                )}
              </View>

              <View style={styles.wrapper}>
                <Text style={styles.label}>Phone Number</Text>
                <View
                  style={styles.inputWrapper(
                    touched.phone ? COLORS.secondary : COLORS.offwhite
                  )}
                >
                  <Ionicons
                    name="phone-portrait-outline"
                    size={20}
                    color={COLORS.gray}
                    style={styles.iconStyle}
                  />

                  <TextInput
                    placeholder="Enter Phone Number"
                    onFocus={() => {
                      setFieldTouched("phone");
                    }}
                    onBlur={() => {
                      setFieldTouched("phone", "");
                    }}
                    value={values.phone}
                    onChangeText={handleChange("phone")}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={{ flex: 1 }}
                  />
                </View>
                {touched.phone && errors.phone && (
                  <Text style={styles.errorMessage}>{errors.phone}</Text>
                )}
              </View>

              <Button
                title={"S U B M I T"}
                onPress={isValid ? handleSubmit : inValidForm}
                loader={loader}
                isValid={isValid}
              />
            </View>
          )}
        </Formik>
      </SafeAreaView>
    </ScrollView>
  );
};

export default DriverRegistration;
