import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import {EXPO_GOOGLE_MAPS_APIKEY} from "@env";
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { TextInput } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { setDestination } from '../features/navSlice';
import { useNavigation } from '@react-navigation/native';


const NavigateCard = () => {
    const dispatch = useDispatch();
    const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.container}>
<Text style={styles.title}>Ola, Mauro Patricio</Text>
    <View style={styles.details}>
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

        // navigation.navigate('RideOptionsCard');
       }}
       />
    </View>
    </SafeAreaView>
  )
}

export default NavigateCard
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
    container: {
        flex:1,
        backgroundColor: 'white'
    },
    title:{
        textAlign: 'center',
        fontWeight: '500'
    },
    details:{}
})