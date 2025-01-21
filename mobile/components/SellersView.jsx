import { ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native'
import React, { useEffect, useState } from 'react'
import {ArrowRightIcon} from 'react-native-heroicons/outline'
import SellerCard from './SellerCard'
import api from '../hooks/createConnectionApi';
import { useNavigation } from '@react-navigation/native';

const SellersView = ({title, description}) => {
  const navigation = useNavigation()

  const [isloading, setLoading] = useState(false);
  const [sellers, setSellers] = useState(null);
  const [error, setError] =useState(null);


  const fetchData = async () => {

    try{
      setLoading(true);

      const response = await api.get('/users/sellers');

      if(response.status==200){
          setLoading(false);
          setSellers(response.data.sellers)
      }
    }catch(error){
      setLoading(false);
    }
}

useEffect(()=>{

  fetchData()

}, [])

  return (
    <View>
    <View style={styles.sellerWrapper}>
      <Text style={styles.title}>{title}</Text>
      <TouchableOpacity onPress={()=> navigation.navigate('SellersList',{sellers})}>
      <ArrowRightIcon color={"#7F00FF"} size={30} />

      </TouchableOpacity>
    </View>
    <View>
      <Text style={styles.text}>{description}</Text>
      <ScrollView 
      horizontal
      contentContainerStyle={{
        paddingHorizontal: 1,
      }}
      showsHorizontalScrollIndicator={false}>
        {sellers!=null && sellers?.map(seller=>(


        <SellerCard
        key={seller._id}
        id ={seller._id}
        _id ={seller._id}

        // name={seller.seller.nome.length<50?seller.seller.nome:seller.seller.nome.substring(0, 40) + '...'}

        name={seller.seller.name}ht
        logo={seller.seller.logo ? seller.seller.logo  : '../assets/default1.jpg'}
        description={seller.seller.description}
        rating={seller.seller.rating}
        numReviews={seller.seller.numReviews}
        province={seller.seller.province}
        address={seller.seller.address}
        latitude={seller.seller.latitude}
        longitude={seller.seller.longitude}
        />
        )
        
        )}

      </ScrollView>
    </View>
    </View>

  )
}

export default SellersView

const styles = StyleSheet.create({

  sellerWrapper:{
    marginTop: 15,
    justifyContent: 'space-between',
    flexDirection: "row",
    marginLeft: 15,
    marginRight: 15,
    
  },
  title:{
    fontWeight: "500",
    fontSize: 19
  },
  text:{
    fontSize: 13,
    marginLeft: 15,
    letterSpacing: 1.2
  },
  container: {
    shadowColor: 'rgba(0,0,0, .2)',
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0, //default is 1
    shadowRadius: 0//default is 1
  }
  
})
