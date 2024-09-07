import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React from 'react'
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native'

const ProductView = () => {
  const navigation = useNavigation();
  return (
    <View style={styles.item}>
      <Text style={styles.text}>Novos Produtos</Text>
      <TouchableOpacity onPress={() => { navigation.navigate("ProductList") }} style={styles.icon}>
        <Ionicons name='list-circle' size={30} color={"black"} />
      </TouchableOpacity>

    </View>
  )
}

export default ProductView

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
    fontWeight: '600'
    // marginLeft:33
  },
  icon: {
    marginLeft: 133
  }

})