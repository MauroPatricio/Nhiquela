import { View, Text, StyleSheet, ScrollView,FlatList, ActivityIndicator, TouchableOpacity, Image } from 'react-native'
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../hooks/createConnectionApi';
import { useNavigation } from "@react-navigation/native"


const OrderList = (item) => {
  const navigation = useNavigation();
return (
    <ScrollView  
    style={{ backgroundColor: "white" }}
    contentContainerStyle={{
        paddingHorizontal: 10,
      }}>
    

      <TouchableOpacity style={styles.container} onPress={()=>{navigation.navigate('OrderDetailsScreen', {item})}} key={item._id}>
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
      
    </ScrollView>
)
}

export default OrderList


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