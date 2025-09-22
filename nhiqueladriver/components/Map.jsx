import { StyleSheet, Text, View } from 'react-native'
import React, { useEffect, useRef, useState } from 'react'
import MapView, {Marker} from 'react-native-maps'
// import MapView from 'react-native-maps';

// import styles from '../screens/home.style'
import {selectDestination, selectOrigin, selectTravelTimeInfo, setTravelTimeInfo} from '../features/navSlice'
import { useDispatch, useSelector } from 'react-redux'
import MapViewDirections from 'react-native-maps-directions'
import {EXPO_GOOGLE_MAPS_APIKEY} from "@env";

const Map = () => {
    const origin = useSelector(selectOrigin);
    const destination = useSelector(selectDestination);
    const travelTimeInfo = useSelector(selectTravelTimeInfo);

    const mapRef =useRef(null);
    // const dispatch =useDispatch();
    //     useEffect(()=>{
    //   if (!origin || !destination) return;
    //   // zoom & fit the markers
    //   mapRef.current.fitToSuppliedMarkers(["origin", "destination"],
    //     {edgePadding:{top: 200, right: 100, bottom: 100, left: 100}}
    //   );
    // }, [origin, destination])

    // useEffect(()=>{
    //   if (!origin || !destination) return;


    //   const getTravelTime = async () =>{
    //     fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?units
    //       =imperial&origins=${origin.description}&destinations=${destination.description}&key=${EXPO_GOOGLE_MAPS_APIKEY}`)
    //       .then((res)=>res.json())
    //       .then((data)=>{
    //         dispatch(setTravelTimeInfo(data.rows[0].elements[0]));
    //         console.log(data)
    //       })
    //   }

    //   getTravelTime()
     
    // }, [origin, destination, EXPO_GOOGLE_MAPS_APIKEY])

  return (
  
  
    <MapView style={styles.container}
    ref={mapRef}
    initialRegion={{
        latitude: origin?.location.lat,
        longitude: origin?.location.lng,
        latitudeDelta:0.005,
        longitudeDelta:0.005,
    }}>

 {/* {origin && destination && (
  <MapViewDirections
      origin={origin.description}
      destination={destination.description}
      apikey={EXPO_GOOGLE_MAPS_APIKEY}
      strokeWidth={3}
      strokeColor='#7F00FF'
  />
)} */}

{/* {origin?.location &&(
    <Marker
    coordinate={{
        latitude: origin?.location.lat,
        longitude: origin?.location.lng,

    }}
    title='você está aqui'
    description={origin?.description}
    identifier='origin'
    />
)} */}


{/* {destination?.location &&(
    <Marker
    coordinate={{
        latitude: destination?.location.lat,
        longitude: destination?.location.lng,

    }}
    title='Destino'
    description={destination?.description}
    identifier='destination'
    />
)} */}
        </MapView> 
  )
}

export default Map

const styles = StyleSheet.create({
    container:{flex:1}
})