import { SafeAreaView, ScrollView, StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native'
import React, { useEffect, useLayoutEffect, useState } from 'react'
import { useRoute } from '@react-navigation/native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import api from '../hooks/createConnectionApi';
import SellerProduct from './SellerProduct'
import BasketIcon from './BasketIcon'
import { useDispatch } from 'react-redux'
import { setSeller } from '../features/sellerSlice'
import MapView, { Marker } from 'react-native-maps'; // Import MapView

const SellerScreen = () => {
  const { params: {
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
  } } = useRoute();

  const navigation = useNavigation();
  const sellerId = id;
  const [productsBySeller, setProductsBySeller] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sellerLocation, setSellerLocation] = useState(null);

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(setSeller({
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
    }));
  }, []);


const updateCoorder=()=>{
  if (latitude && longitude){
    setSellerLocation({latitude: parseFloat(latitude).toFixed(4), longitude: parseFloat(longitude).toFixed(4)});
  }
}

  const fechtData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/products?seller=${sellerId}`);
      if (response.status == 200) {
        setLoading(false);
        setProductsBySeller(response.data.products);
      }
    } catch (error) {
      setLoading(false);
    }
  }



  useEffect(() => {
    fechtData();
    updateCoorder();
  }, [latitude, longitude]);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShow: false })
  }, []);

  return (
    <>
      <BasketIcon />

      <ScrollView style={{ backgroundColor: 'white' }}>
        <Image
          source={{ uri: logo, height: 300 }}
          style={styles.logo}
        />
        <View style={styles.icons}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name='chevron-back-circle' size={35} style={styles.back} />
          </TouchableOpacity>
        </View>

        <View style={styles.view}>
          <View style={styles.rating}>
            <Text style={styles.sellerName}>{name}</Text>
            <Ionicons name="star" color={'gold'} size={22} />
            <Text>{rating}</Text>
          </View>
          {latitude && longitude ? (
          <View style={styles.mapContainer}>
            <Text style={styles.mapTitle}>Localização do Vendedor</Text>
          
{latitude && longitude ?(
                               <MapView
                               style={styles.map}
                               initialRegion={{
                                 latitude: latitude ? parseFloat(latitude) : 0,  // Use valores padrão se não houver latitude
                                 longitude: longitude ? parseFloat(longitude) : 0, // Use valores padrão se não houver longitude
                                 latitudeDelta: 0.001,
                                 longitudeDelta:0.001,
                               }}
                             >
                               {latitude && longitude && (
                                 <Marker
                                   coordinate={{ latitude: parseFloat(latitude), longitude: parseFloat(longitude) }}
                                   title="Localização do Fornecedor"
                                 />
                               )}
                             </MapView>
                            ) : (
                                <Text style={styles.locationText}>Localização do vendedor não disponível.</Text>
                            )}
          </View>
        ) : null}

          <Text style={{ fontWeight: '500', marginLeft: 10 }}>Endereço:</Text>
          <View style={styles.details}>
            <View style={styles.address}>
              <Ionicons name='location-outline' color="#7F00FF" size={22} />
              <Text><Text style={{ fontWeight: '500' }}>{province.name}</Text> - {address}</Text>
            </View>
          </View>

          <View style={styles.description}>
            <Text style={{ fontWeight: '500' }}>Especialidade:</Text>
            <Text>{description}</Text>
          </View>
        </View>

     

        <View>
          <Text style={styles.title}>Produtos</Text>
        </View>

        <View style={{ paddingBottom: 90 }}>
          {productsBySeller && productsBySeller.map((product) => (
            <SellerProduct
              key={product._id}
              id={product._id}
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
          ))}
        </View>

      </ScrollView>
    </>
  )
}

export default SellerScreen;

const styles = StyleSheet.create({
  logo: {
    width: '100%',
    height: 300,
    overflow: 'hidden',
  },
  icons: {
    position: 'absolute',
    top: 30,
    flexDirection: "row",
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  back: {
    color: 'black',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 22,
    padding: 5,
  },
  view: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 20,
    elevation: 3,
  },
  sellerName: {
    fontSize: 30,
    fontWeight: '700',
    color: '#333333',
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
    color: '#666666',
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
    color: '#7F00FF',
  },
  mapContainer: {
    marginTop: 20,
    marginHorizontal: 10,
    borderRadius: 15,
    overflow: 'hidden',
  },
  map: {
    height: 90,
    width: '100%',
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#7F00FF',
    marginLeft: 10,
  },
});
