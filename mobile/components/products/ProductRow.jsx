import {FlatList, View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import React from 'react'
import ProductCardView from '../products/ProductCardView'
import useFetch from '../../hooks/useFetch'
const ProductRow = () => {
    const {data, isLoading, error} = useFetch();

  return (
    <ScrollView>
      {isLoading?(<ActivityIndicator 
                  size={24}
                  color={'black'}
                  />):error?<Text>Possui erros</Text>:
        <FlatList
            data ={data.products}
            keyExtractor={(item) => item._id}
            renderItem ={(item) => <ProductCardView item={item}/>}
            horizontal
            contentContainerStyle={{columnGap: 12}}
        />
                  
                  }

    </ScrollView>
  )
}

export default ProductRow


const styles = StyleSheet.create({

  item: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
    },
    image: {
      width: 64,
      height: 64,
      marginRight: 16,
    },
    text: {
      fontSize: 24,
      marginLeft:33
    },

})