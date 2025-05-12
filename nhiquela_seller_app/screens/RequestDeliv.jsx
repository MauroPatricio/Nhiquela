import { StyleSheet, Text, View, Image} from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import NavOptions from '../components/NavOptions'
import {EXPO_GOOGLE_MAPS_APIKEY} from "@env";
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import NavFavourites from '../components/NavFavourites';
import TransportType from '../components/TransportType';


const RequestDeliv = () => {

  return (
    <SafeAreaView style={styles.container}>

{/* <View>

      <Text style={{ textAlign:'center', top: 300, fontWeight: '600', fontSize: '100'}}>Brevemente</Text>
</View> */}
          <TransportType/>

    {/* <NavOptions/> */}
    {/* <NavFavourites/> */}
    </SafeAreaView>
  )
}

export default RequestDeliv

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    flex:1
  },
  google:{
    marginTop:10
  },
  title: {
    fontWeight: '600',
    fontSize: 30,
    marginTop: 30,
    marginBottom: 30,
    marginLeft: 10
  },
  
})