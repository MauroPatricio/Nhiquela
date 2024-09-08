import { ScrollView, StyleSheet, Text, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import {ArrowRightIcon} from 'react-native-heroicons/outline'
import SellerCard from './SellerCard'
import api from '../hooks/createConnectionApi';

const SellersView = ({title, description}) => {


  const [isloading, setLoading] = useState(false);
  const [sellers, setSellers] = useState(null);
  const [error, setError] =useState(null);


  const fechtData = async () => {

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

  fechtData()

}, [])

  return (
    <View>
    <View style={styles.sellerWrapper}>
      <Text style={styles.title}>{title}</Text>
      <ArrowRightIcon color={"#7F00FF"}/>
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
        // name={seller.seller.nome.length<50?seller.seller.nome:seller.seller.nome.substring(0, 40) + '...'}

        name={seller.seller.name}
        logo={seller.seller.logo}
        description={seller.seller.description}
        rating={seller.seller.rating}
        numReviews={seller.seller.numReviews}
        province={seller.seller.province}
        address={seller.seller.address}
        latitude={''}
        longitude={''}
        />
        ))}

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
