import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React from 'react'
import { StarIcon } from 'react-native-heroicons/outline'
import {Ionicons} from "@expo/vector-icons"

const SellerCard = ({
    id,
    name,
    logo,
    description,
    rating,
    numReviews,
    province,
    address,
    latitude,
    longitude,
}) => {
  return (
    <TouchableOpacity style={styles.card} onPress={()=>{}}>
      <View  style={styles.card_template}>

                  <View style={styles.imageContainer}>
                          <Image source={{uri: logo,
                          height:150,
                          // width: 100
                      }}
                          style={styles.image}/>
                </View>
                <Text> {name}</Text>

          <View style={styles.description}>
            <Ionicons name="location-outline" color="#7F00FF" size={24}/>
            <Text>{address}</Text>
          
          </View>
          <View style={styles.description}>
              <StarIcon color="darkorange" opacity={0.5} size={22}/>
              <Text style={{color: 'black'}}>{rating}</Text>
          </View>
      </View>
    </TouchableOpacity>
  )
}

export default SellerCard

const styles = StyleSheet.create({
  description:{
    flexDirection: "row"
  },
  card_template:{
    marginTop: 5,
    // marginLeft:12,
    height:220,
    width:170,
    borderWidth: 0,
    // borderRadius:20,
    alignContent:"center",
    alignItems:"center",
    shadowColor: 'grey',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 100,
    shadowRadius: 100,
    elevation: 1,
  },

  card: {
    backgroundColor: '#F5F5F5',
    // borderRadius: 12,
    // width: '100%',
        // shadowColor: 'grey',
    // shadowOffset: {width: 0, height: 4},
    // shadowOpacity: 100,
    // shadowRadius: 100,
    // elevation: 1,
    margin: 10


  },
  elevation: {
    elevation: 20,
    shadowColor: 'grey',
  },

  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    
},
imageContainer: {
    // flex: 1,
    // width: 170,
    // marginLeft: 12/2,
    // marginTop: 5,
    // borderRadius: 12,
    // overflow:"hidden",
    // backgroundColor: "white"
},
image:{
    aspectRatio: 1,
    resizeMode: 'cover',
        // borderRadius: 12,

},
details:{
    padding: 12
},
title:{
    fontSize: 12,
    fontWeight: '800'
},
supplier:{
    fontSize: 12,
    fontWeight: '600'

},
price:{
    fontSize: 12,
    fontWeight: '400'
},
addBtn:{
    position: "absolute",
    bottom: 10,
    right: 12
}
})