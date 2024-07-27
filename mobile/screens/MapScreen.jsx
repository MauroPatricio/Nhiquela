import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import Map from '../components/Map'
import { createStackNavigator } from '@react-navigation/stack';
import NavigateCard from '../components/NavigateCard';
import RideOptionsCard from '../components/RideOptionsCard';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView from 'react-native-maps';
import TransportType from '../components/TransportType';


const Stack = createStackNavigator();


const MapScreen = () => {
  return (
      
    <View style={styles.container}>
      <View style={styles.map}>
          <Map/>
      </View>
      <View style={styles.details}>
      <TransportType/>
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
    flex:1,
  },
  details:{
    flex:1
  }

})