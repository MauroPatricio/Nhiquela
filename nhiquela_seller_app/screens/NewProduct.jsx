import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React, { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import {Ionicons } from '@expo/vector-icons'
import {useNavigation} from '@react-navigation/native'
import ProductList from '../components/products/ProductList'
import api from './../hooks/createConnectionApi';

const NewProduct = () => {
    const navigation = useNavigation();

    
  const [nome, setNome] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState('');
  const [images, setImages] = useState([]);
  const [rating] = useState(0);
  const [numReviews] = useState(0);

  const [category, setCategory] = useState('');
  const [province, setProvince] = useState('');

  const [countInStock, setCountInStock] = useState('');
  const [brand, setBrand] = useState('');
  const [description, setDescription] = useState('');

  const [conditionStatu, setConditionStatu] = useState('');
  const [qualityTyp, setQualityTyp] = useState('');

  const [selectedColors, setSelectedColors] =useState([]);
  const [selectedSizes, setSelectedSizes] =useState([]);

  const [onSale, setOnSale] = useState(false);
  const [onSalePercentage, setOnSalePercentage] = useState(0);

  const [isGuaranteed, setIsGuaranteed] = useState(false);
  const [isOrdered, setIsOrdered] = useState(false);
  
  const [orderPeriod, setOrderPeriod] = useState('');
  const [guaranteedPeriod, setGuaranteedPeriod] = useState('');

  


    
  return (
    <SafeAreaView style={styles.container}>
            {/* <View style={styles.wrapper}>
                <View style={styles.upperRow}>
                <TouchableOpacity onPress={()=>navigation.goBack()}>
                    <Ionicons name='chevron-back-circle' size={30} color={'white'}/>
                </TouchableOpacity>
                <Text style={styles.text}>Lista de produtos</Text>
            </View>
                <ProductList/>
            </View> */}
            <Text>Novo Produto</Text>
      </SafeAreaView>

  )
}

export default NewProduct

const styles = StyleSheet.create({

container:{
    flex: 1,
    backgroundColor: '#F5F5F5'
},
wrapper: {
    flex: 1,
    backgroundColor:  'lightwhite'
},
upperRow:{
    width:300,
    marginHorizontal: 20,
    flexDirection: 'row',
    justifyContent: "flex-start",
    alignItems: "center",
    position: "absolute",
    backgroundColor: "black",
    borderRadius: 24,
    top: 22,
    zIndex: 999
},
text:{
    color: "white",
    marginLeft: 10,
}

    
})