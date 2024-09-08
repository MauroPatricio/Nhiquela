import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigation } from '@react-navigation/native'
import { selectDestination, selectOrigin, selectTravelTimeInfo } from '../features/navSlice'
import { Icon } from 'react-native-elements'
import { SafeAreaView } from 'react-native-safe-area-context'


const images ={
    image1: require('../assets/vehicle/bycicle.png'),
    image2: require('../assets/vehicle/car.png'),
    image3: require('../assets/vehicle/truck.png'),
    image4: require('../assets/vehicle/reboque.png')

}
const data = [
    {
      id: '1',
      title: 'Motorizada para entregas',
      image:'image1',
      screen: 'MapScreen',
      price: 150,
      type: 1
    },{
      id: '2',
      title: 'Carro para entregas',
      image:'image2',
      screen: 'MapScreen',
      price: 300,
      type: 2
    }
    ,{
        id: '3',
        title: 'Camião',
        image:'image3',
        screen: 'MapScreen',
        price: 3500,
        type: 3
      }
      ,{
        id: '4',
        title: 'Reboque',
        image:'image4',
        screen: 'MapScreen',
        price: 4000,
        type: 4
      }
  ]
const TransportType = () => {
    const dispatch = useDispatch();

    const navigation = useNavigation();
    const origin = '';
    // const destination = useSelector(selectDestination);

    // const travelTimeInfo = useSelector(selectTravelTimeInfo);
    const [selected, setSelected] = useState(null);


  return (
<SafeAreaView>

<Text style={styles.title2}>Solicitar transporte</Text>
 <Text style={styles.type}>Tipo de transporte a solicitar:</Text>
 <FlatList
      // horizontal
      keyExtractor={(item)=> item.id}
      numColumns={2}
      contentContainerStyle={{columnGap: 12}}
      data={data}
  
      renderItem={({item})=>(
          <TouchableOpacity style={styles.container} onPress={()=> navigation.navigate(item.screen, item)}
        // <TouchableOpacity style={styles.container && item.id === selected?.id && {backgroundColor:'grey'}} onPress={()=> setSelected(item)}
          disabled={!origin}
          >
            <View style={!origin && styles.component}>

              <Image
              source={images[item.image]}
              style={styles.image}
              resizeMode="cover"
              />
              <Text style={styles.title}>{item.title}</Text>
                           {/* <Text style={{fontWeight:'500'}}>{item.price} MT</Text> */}
              <Icon 
              name='arrowright'
              type='antdesign' color={'black'}
              />
            </View>
              </TouchableOpacity>
            
              
      )}
      />

</SafeAreaView>
  )
}

export default TransportType

const styles = StyleSheet.create({

  container2:{
      flex:1,
      backgroundColor: 'white'
    },
      container: {
          // alignItems: 'center',
          marginBottom: 15,
          marginLeft: 10,
          backgroundColor: '#F0F0F0',
          margin: 2,
        
          // marginBottom: 10
      },
      image:{
          aspectRatio: 1,
          resizeMode: 'cover',
        //   width: 50,
          height: 150,
          marginRight: 10,
          marginLeft:10
      
      },
      title: {
          textAlign: 'center',
          fontWeight: '500',
          // width:100
          // marginBottom: 10
          
      },
      icon: {
          // backgroundColor: '#808080',
          backgroundColor:'black',
          padding: 5,
          borderRadius: 22,
                backgroundColor: 'white'

      },    
    type: {
  
      textAlign: 'center',
      marginBottom: 30,
      marginTop: 10,
        backgroundColor: 'white'

    },
    component:{
      opacity: 0.1
    },
    title2: {
      fontWeight: '600',
      fontSize: 30,
      marginTop: 30,
      marginBottom: 30,
      marginLeft: 10,
    },
})