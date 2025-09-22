import React, { useState, useEffect, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts } from 'expo-font';
import * as SplashScreen from "expo-splash-screen";
import * as Location from 'expo-location';
import BottomTab from './app/navigation/BottomTab';
import SignUp from "./app/screens/SignUp";
import { ParcelCountContext } from './app/context/ParcelCount';
import { UserLocationContext } from './app/context/UserLocationContext';
import { UserReversedGeoCode } from './app/context/UserReversedGeoCode';
import { LoginContext } from './app/context/LoginContext';
import DriverRegistration from './app/screens/DriverRegistration';
import { UserType } from './app/context/UserType';
import { DeliveryContext } from './app/context/DeliveryContext';
import { TriggerContext } from './app/context/TriggerContext';

const Stack = createNativeStackNavigator();

export default function App() {
  const [location, setLocation] = useState(null);
  const [login, setLogin] = useState(false);
  const [delivery, setDelivery] = useState('Placed');
  const [trigger, setTrigger] = useState(false);
  const [address, setAddress] = useState(null);
  const [parcelCount, setParcelCount] = useState(0);
  const [userType, setUserType] = useState(null);
  const [error, setErrorMsg] = useState(null);


  const defaultAddress = { "city": "Shanghai", "country": "China", "district": "Pudong", "isoCountryCode": "CN", "name": "33 East Nanjing Rd", "postalCode": "94108", "region": "SH", "street": "Stockton St", "streetNumber": "1", "subregion": "San Francisco County", "timezone": "America/Los_Angeles" }

  const [fontsLoaded] = useFonts({
    regular: require('./assets/fonts/Poppins-Regular.ttf'),
    light: require('./assets/fonts/Poppins-Light.ttf'),
    bold: require('./assets/fonts/Poppins-Bold.ttf'),
    medium: require('./assets/fonts/Poppins-Medium.ttf'),
    extrabold: require('./assets/fonts/Poppins-ExtraBold.ttf'),
    semibold: require('./assets/fonts/Poppins-SemiBold.ttf'),
  });


  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    (async () => {
      setAddress(defaultAddress);

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location as denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location)

    })();
  }, [])

  if (!fontsLoaded) {
    return;
  }
  return (

    <UserLocationContext.Provider value={{ location, setLocation }}>
      <UserReversedGeoCode.Provider value={{ address, setAddress }}>
        <LoginContext.Provider value={{ login, setLogin }}>
          <UserType.Provider value={{ userType, setUserType }}>
            <ParcelCountContext.Provider value={{ parcelCount, setParcelCount }}>
              <DeliveryContext.Provider value={{ delivery, setDelivery }}>
                <TriggerContext.Provider value={{ delivery, setDelivery }}>
                  <NavigationContainer>
                    <Stack.Navigator>
                      <Stack.Screen
                        name='bottom-navigation'
                        component={BottomTab}
                        options={{ headerShown: false }}
                      />

                      <Stack.Screen
                        name='signUp'
                        component={SignUp}
                        options={{ headerShown: false }}
                      />

                      <Stack.Screen
                        name='registration'
                        component={DriverRegistration}
                        options={{ headerShown: false }}
                      />


                    </Stack.Navigator>
                  </NavigationContainer>
                </TriggerContext.Provider>
              </DeliveryContext.Provider>
            </ParcelCountContext.Provider>
          </UserType.Provider>
        </LoginContext.Provider>
      </UserReversedGeoCode.Provider>
    </UserLocationContext.Provider>
);
}


