import { StyleSheet, Text, FlatList, View } from 'react-native'
import React from 'react'
import useFetch from '../../hooks/useFetch'
import { ActivityIndicator } from 'react-native-paper';
import ProductCardView from './ProductCardView';

const ProductList = () => {
    const {data, isLoading, error} = useFetch();

    if(isLoading){

        return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size={24} />
          </View>
        )
    }

    return (
        <View style={styles.container}>
            <FlatList
            data={data.products}
            keyExtractor={(item) => item._id}
            numColumns={2}
            renderItem={(item) => <ProductCardView item={item}/>}
            contentContainerStyle={styles.container}
            ItemSeparatorComponent={()=> <View style={styles.separator}/>}
           />
     
        </View>
    )
}

export default ProductList

const styles = StyleSheet.create({

    loadingContainer:{
        flex:1,
        alignItems: "center",
        justifyContent: "center",
        alignContent: "center"
    },
    container: {
        alignItems: "center",
        paddingTop: 35,
    },
    separator:{
        height:16,
    
    }
})