import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React from 'react'
import {useNavigation} from '@react-navigation/native'
import {EXPO_GOOGLE_MAPS_APIKEY} from "@env";
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { useDispatch, useSelector } from 'react-redux';
import { selectDestination, selectOrigin, setDestination, setOrigin } from '../features/navSlice';
import TransportType from './TransportType';
import { Button } from 'react-native';



const NavOptions = () => {
    const dispatch = useDispatch();
    const navigation = useNavigation();
    const origin = useSelector(selectOrigin);
    const destination = useSelector(selectDestination);

    return (

      <>
      <Text style={styles.title}>Solicitar transporte</Text>

      <Text>Local de origem:</Text>
      <GooglePlacesAutocomplete
       styles={InputBoxStyles}
      placeholder='Onde buscar a encomenda?'
      onPress={(data, details = null) => {
        dispatch(setOrigin({
          location: details.geometry.location,
          description: data.description
        }));
        dispatch(setDestination(null));
      }}
      query={{
        key: EXPO_GOOGLE_MAPS_APIKEY,
        language: 'pt',
      }}
      fetchDetails={true}
      enablePoweredByContainer={false}
    />

<Text>Local de destino:</Text>
{origin && 
  <GooglePlacesAutocomplete
       styles={InputBoxStyles}
       placeholder='Local de destino?'
       nearbyPlacesAPI='GooglePlacesSearch'
       debounce={400}
       fetchDetails={true}
       minLength={2}
       enablePoweredByContainer={false}
       query={{
        key: EXPO_GOOGLE_MAPS_APIKEY,
        language: 'pt'
       }}
       onPress={(data, details=null)=>{
        dispatch(setDestination({
            location: details.geometry.location,
            description: data.description,
        }))

        //  navigation.navigate('MapScreen');
       }}
       />
}
{origin && destination && 

<Button title='Solicitar' onPress={()=>navigation.navigate('MapScreen')}></Button>
}
      </>

  )
}

export default NavOptions

const InputBoxStyles = StyleSheet.create({
  container: {
      backgroundColor: 'white',
      paddingTop: 20,
      flex:0
  },
  textInput:{
      backgroundColor: '#F0F0F0',
      borderRadius: 0,
      fontSize: 18
  },
  textInputContainer:{
      paddingHorizontal: 20,
      paddingBottom: 0
  }
})

const styles = StyleSheet.create({
  title: {
    fontWeight: '600',
    fontSize: 30,
    marginTop: 30,
    marginBottom: 30,
    marginLeft: 10
  },
})