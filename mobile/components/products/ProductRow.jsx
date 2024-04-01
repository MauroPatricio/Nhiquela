import {FlatList, View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import React from 'react'
import ProductCardView from '../products/ProductCardView'
import useFetch from '../../hooks/useFetch'
const ProductRow = () => {
    const {data, isLoading, error} = useFetch();
    
    const items = [
        { id: 1, text: 'Item 1'},
        { id: 2, text: 'Item 2' },
        { id: 3, text: 'Item 3' },
        { id: 4, text: 'Item 3' },
        // Add more items here...
      ];

    const renderItem = ({item}) => (
        <View style={styles.item}>
            <Text style={styles.text}>{item.text}</Text>
        </View>
    )
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