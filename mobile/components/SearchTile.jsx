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
            <Text style={styles.productTitle}>{item.item.name}</Text>
            <Text style={styles.seller}>{item.item.seller.name}</Text>
            <Text style={styles.price}>{item.item.price} MT</Text>

        </View>
        </TouchableOpacity>
    </View>
  )
}

export default SearchTile

const styles = StyleSheet.create({
container:{
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    flexDirection: "row",
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#FFF",
    shadowColor: "black",
},
image: {
    width: 70,
    backgroundColor:"white",
    borderRadius: 12,
    justifyContent: "center",
    alignContent: "center"
},
productImg:{
    width: "100%",
    height: 60
},
textContainer: {
    flex: 1,
    marginHorizontal: 12
},
productTitle:{
    fontSize: 12,
    fontWeight: "700",
    color: "black"
},
seller:{
    fontSize: 12,
    color: "grey",
    marginTop: 3
},
price: {
    fontWeight: "600"
}

})