import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React from 'react'
import {useNavigation} from '@react-navigation/native'

const SearchTile = (item) => {
    const navigation = useNavigation();
  return (
    <View>
      <TouchableOpacity style={styles.container} onPress={()=>{navigation.navigate('ProductDetail', {item})}}>
        <View style={styles.image}>
        <Image source={{uri: item.item.image}}
        style={styles.productImg}/>
        </View>
        <View style={styles.textContainer}>
            <Text style={styles.productTitle}>{item.item.name.length<30?item.item.name: item.item.name.substring(0, 30)+`...`}</Text>
            
            <Text style={styles.seller}>{item.item.seller.name.length<20?item.item.seller.name: item.item.seller.name.substring(0, 25)+`...`}
            </Text>
            <Text style={styles.price}>{item.item.price} MT</Text>
            
        </View>
        </TouchableOpacity>
    </View>
  )
}

export default SearchTile

const styles = StyleSheet.create({
container:{
    flexDirection: 'row',
    justifyContent:'space-between',
    backgroundColor: '#fff',
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
    marginBottom: 10,
    // width:100
},
image: {
    width: 70,
    backgroundColor:"white",
    borderRadius: 12,
    justifyContent: "center",
    alignContent: "center",
    marginLeft: 5
},
productImg:{
    width: "100%",
    height: 60
},
textContainer: {
    justifyContent:'space-between',
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 5,
    marginBottom: 10,

},
productTitle:{
    fontSize: 12,
    fontWeight: "700",
    color: "black",
    width:240,

},
seller:{
    fontSize: 12,
    color: "grey",
    marginTop: 3,
    width:80,

},
price: {
    fontWeight: "600"
}

})