import { SafeAreaView, ScrollView, StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native'
import React, { useEffect, useLayoutEffect, useState } from 'react'
import {useRoute} from '@react-navigation/native'
import {useNavigation} from '@react-navigation/native'
import { ArrowLeftIcon, StarIcon } from 'react-native-heroicons/outline'
import {Ionicons, SimpleLineIcons, MaterialCommunityIcons, Fontisto  } from '@expo/vector-icons'
import api from '../hooks/createConnectionApi';
import SellerProduct from './SellerProduct'
import BasketIcon from './BasketIcon'
import { useDispatch } from 'react-redux'
import { setSeller } from '../features/sellerSlice'

const SellerScreen = () => {
  const {params: {
    id,
    name,
    logo,
    description,
    rating,
    numReviews,
    province,
    address,
    latitude,
    longitude,
  } }= useRoute();

  const navigation = useNavigation();

  const sellerId = id;
  const [productsBySeller, setProductsBySeller] = useState(null);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();


useEffect(()=>{
  dispatch(setSeller({id,
    name,
    logo,
    description,
    rating,
    numReviews,
    province,
    address,
    latitude,
    longitude,
  }))
}, [])

  const fechtData = async () => {

      try{
        setLoading(true);
  
        const response = await api.get(`/products?seller=${sellerId}`);

        
        if(response.status==200){
            setLoading(false);
            setProductsBySeller(response.data.products)
        }
      }catch(error){
        setLoading(false);
      }
}

  useEffect(()=>{

    fechtData()
  
  }, [])


useLayoutEffect(()=>{
  navigation.setOptions({headerShow: false})
}, [])

  return (
    <>
       <BasketIcon/>

         <ScrollView style={{backgroundColor: 'white'}}>

          <Image 
            source={{uri: logo,
              height: 300
            }}

            style={styles.logo}
          />
          <View style={styles.icons}>

             <TouchableOpacity onPress={()=>navigation.goBack()}>
                <Ionicons name='chevron-back-circle' size={35} style={styles.back}/>
            </TouchableOpacity>

            {/* <TouchableOpacity onPress={()=>navigation.goBack()}>
                <Ionicons name='heart' size={35} style={styles.heart}/>
            </TouchableOpacity> */}
          </View>
          <View style={styles.view}>
              <View style={styles.rating}>
              <Text style={styles.sellerName}>{name}</Text>
                  <StarIcon color={'gold'} opacity={12} size={22}/>
                  <Text>{rating}</Text>
              </View>
              <Text style={{fontWeight: '500', marginLeft: 10}}>Endereço:</Text>
              <View style={styles.details}>
                <View style={styles.address}>
                  <Ionicons name='location-outline' color="#7F00FF" opacity={12} size={22}/>
                  <Text>< Text style={{fontWeight: '500'}}>{province.name}</Text> - {address}</Text>
                </View>
          </View>
         
                <View style={styles.description}>
                <Text style={{fontWeight: '500'}}>Especialidade:</Text>
                  <Text>{description}</Text>
                </View>
          </View>
          <View>
            <Text  style={styles.title}> Produtos</Text>
          </View>
          <View style={{paddingBottom: 90}}>
          {productsBySeller && productsBySeller.map((product)=>(
            <>
            
                                      <SellerProduct   
                                        key={product._id}
                                        id ={product._id}                  
                                        name={product.nome}
                                        image={product.image}
                                        images={product.images}
                                        description={product.description}
                                        rating={product.rating}
                                        numReviews={product.numReviews}
                                        province={product.province}
                                        address={product.address}
                                        price={product.price}
                                        onSale={product.onSale}
                                        countInStock={product.countInStock}
                                        seller={product.seller.seller.name}
                                    />
            </>
          ))}
            </View>

         </ScrollView>
    </>

  )
}

export default SellerScreen

const styles = StyleSheet.create({
  upperRow:{
    // flex:1 , 
    marginHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    top: 60,
    zIndex: 999,
    
},
  logo:{
    // position: 'relative'
  },

  icons:{
    position: 'absolute',
    top: 30,
    // marginLeft: 10,
    flexDirection: "row",
    justifyContent: 'space-between', // Distributes space between the icons
    alignItems: 'center',
  },

  icon: {

    backgroundColor: 'white',
    color: '#3e2465',
    borderRadius: 20,
    
  },
  back:{
    marginLeft: 20,
    color: 'black',
    backgroundColor: 'white',
    borderRadius: 22
  },
  heart:{
    marginLeft: 240,
    color: 'red'

  },
  view:{
    backgroundColor: 'white',
  },

  sellerName:{
    textAlign: "left",
    fontSize: 30,
    fontWeight: '500',
    marginLeft: 10
  },
  details: {
    flexDirection: 'row'
  },
  avaliation: {
    flexDirection: 'row',
    alignItems: 'center',
    alignContent: "center"
  },
  address: {
    // marginLeft: 20,
    flexDirection: 'row',
    width: 340


  },
  description:{
    marginTop: 2,
    marginLeft: 10,
    width: 350
  },
  rating:{
    flexDirection: "row"
  },
  title: {
    marginTop: 10,
    marginLeft: 7,
    marginBottom: 12,
    textAlign: 'left',
    fontWeight: '500',
    fontSize: 20
  }

})