import { StyleSheet, Text, TextInput, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import Map from '../components/Map'
import { createStackNavigator } from '@react-navigation/stack';
import NavigateCard from '../components/NavigateCard';
import RideOptionsCard from '../components/RideOptionsCard';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView from 'react-native-maps';
import TransportType from '../components/TransportType';
import {Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location';
import { useDispatch, useSelector } from 'react-redux';
import { selectOrigin, setOrigin } from '../features/navSlice';
import {EXPO_GOOGLE_MAPS_APIKEY} from "@env";
import axios from 'axios';

const Stack = createStackNavigator();


const MapScreen = () => {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [address, setAddress] = useState(null);

    const origin = useSelector(selectOrigin);
    const dispatch = useDispatch();



  useEffect(() => {
    (async () => {
      // Request permission to access location
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      try {
        // Get current position
        let location = await Location.getCurrentPositionAsync({
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 1000
        });

        const { latitude, longitude } = location.coords;

      //   if (latitude && longitude) {

      //   const response = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`);
        
      //   if (response.data.results.length > 0) {
      //     setAddress(response.data.results[0].formatted_address);
      //   } else {
      //     setErrorMsg('No address found for the current location.');
      //   }
      // }

        dispatch(setOrigin({
          location: {
            lat: location.coords.latitude,
            lng: location.coords.longitude
          },
          description: location.description
        }));
        
        setLocation(location);

      } catch (error) {
        // Handle any errors that occur during the request
        setErrorMsg(error.message);
      }
    })();
  }, []);

  return (
      
    <View style={styles.container}>
      <View style={styles.map}>
          <Map/>
      </View>
      <View style={{position: 'absolute', 
        right: 20, 
        top: 35, 
        left:20, 
        flexDirection: 'row'
        // backgroundColor: 'red'
         }}>
          
          <View style={{left: 0,height: 40, width: 40, borderRadius: 130, backgroundColor: 'white', alignContent:'center', alignItems: 'center'}}>

          <Ionicons name='menu' size={35} color='black'/>
          </View>
      <View style={{backgroundColor: 'white', flex:1, flexDirection:'row', alignItems:'center', paddingHorizontal: 12,borderRadius: 22}}>
        <Ionicons name='location-outline' size={22} color={'green'}/> 
        <TextInput value='' placeholder='Posicao actual'/>
      </View>
      </View>
      <View style={styles.details}>
      {/* <TransportType/> */}
      <View style={{
            flex:1,
            backgroundColor: 'red', 
            borderRadius: 20
      }}>
        <View style={{
          backgroundColor: 'green',
          margin: 15,
          borderRadius: 12,
          flexDirection: 'row',
          alignItems: 'center',}}>
            <Ionicons name='search' size={25}/>
          <TextInput value='' placeholder='Local de destino'/>
        </View>

      </View>
      </View>
    </View>
  
  )
}

export default MapScreen

const styles = StyleSheet.create({
  container:{
    flex:1,
  },
  map:{
    flex:2,
  },
  details:{
    flex:1,
    backgroundColor: 'white', 
    borderRadius: 20,
    padding: 20
  }

})