import { View, Text, StyleSheet, FlatList } from 'react-native'
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context'


const Orders = () => {
  const [isLoading, setIsLoading] = useState(false);


  
  useEffect(()=>{

  },[])


  return (
    <SafeAreaView>
 {/* {isLoading ? (
        <ActivityIndicator size={'large'} color={'#4B0082'} />
      ) :
       (
        <FlatList
          style={{ marginHorizontal: 12 }}
          data={searchResults}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <SearchTile item={item} />}
        />
      )} */}
    </SafeAreaView>
  );
};

export default Orders;



const styles = StyleSheet.create({
    searchContainer:{
        flexDirection: "row",
        justifyContent: "center",
        backgroundColor: "white",
        borderRadius: 10,
        marginVertical: 9,
        marginTop: 21,
        marginHorizontal: 12,
        height: 50
        },
    searchIcon:{
        marginHorizontal: 10,
        color: "black",
        marginTop: 10
    },
    searchWrapper:{
        flex: 1,
        backgroundColor: "#F5F5F5",
        // marginRight: 5,
        borderRadius: 2
    },
    searchInput: {
    width: "100%",
    paddingHorizontal: 12,
    marginTop: 9
    },
    searchBtn:{
        width: 50,
        height: "100%",
        borderRadius: 12,
         alignItems: "center",
         marginTop: 10 
    },
    searchImage:{
        resizeMode:  "contain",
        width: 100,
        height: 100,
        alignContent: "center",
        alignItems: "center",
        marginTop: 220,
        opacity: 1
    },
    Text:{
        marginTop: 300,
        marginLeft: 130
    }
})
