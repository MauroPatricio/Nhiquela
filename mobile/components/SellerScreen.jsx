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
import MapView, { Marker } from 'react-native-maps'; // Import MapView and Marker

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
  console.log({id})
  const [productsBySeller, setProductsBySeller] = useState(null);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const [sellerLocation, setSellerLocation] = useState({  latitude, longitude}); // example seller location


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
                                        seller={product.seller}
                                        sellerName={product.seller.seller.name}

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
  upperRow: {
    marginHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    top: 60,
    zIndex: 999,
  },
  logo: {
    width: '100%',
    height: 300,
    // borderRadius: 20, // Rounded corners for the logo
    overflow: 'hidden',
  },
  icons: {
    position: 'absolute',
    top: 30,
    flexDirection: "row",
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%', // Ensure icons are spread across the width
    paddingHorizontal: 20,
  },
  icon: {
    backgroundColor: 'white',
    color: '#3e2465',
    borderRadius: 20,
  },
  back: {
    color: 'black',
    backgroundColor: 'rgba(255, 255, 255, 0.8)', // Slight transparency for a modern look
    borderRadius: 22,
    padding: 5,
  },
  heart: {
    color: 'red',
    backgroundColor: 'rgba(255, 255, 255, 0.8)', // Slight transparency for a modern look
    borderRadius: 22,
    padding: 5,
  },
  view: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 20, // Rounded corners for the view container
    elevation: 3, // Shadow for a raised effect
  },
  sellerName: {
    fontSize: 30,
    fontWeight: '700',
    color: '#333333', // Darker color for better readability
  },
  details: {
    flexDirection: 'row',
    marginTop: 5,
  },
  address: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  description: {
    marginTop: 5,
    fontSize: 16,
    color: '#666666', // Grey for less emphasis
  },
  rating: {
    flexDirection: "row",
    alignItems: 'center',
    marginTop: 5,
  },
  title: {
    marginTop: 20,
    marginLeft: 10,
    marginBottom: 12,
    fontWeight: '600',
    fontSize: 22,
    color: '#7F00FF', // Highlight color for the title
  },
  productContainer: {
    marginBottom: 20,
    backgroundColor: '#F9F9F9', // Light grey for product cards
    borderRadius: 15,
    padding: 15,
    elevation: 2, // Shadow effect for product cards
  },
  productImage: {
    width: '100%',
    height: 200,
    borderRadius: 15,
    marginBottom: 10,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '500',
    color: '#7F00FF',
  },
  productRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
});

