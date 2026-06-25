import { StyleSheet, Text, TouchableOpacity, View, ScrollView, Switch, TextInput } from 'react-native';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addTotalToPay, selectBasketItems, selectBasketTotal, addIva, addDeliverPrice, selectSellers, addAddress } from '../features/basketSlice';
import { useNavigation } from '@react-navigation/native';
import BottomSheetComponent from './BottomSheetComponent';
import { SafeAreaView } from 'react-native-safe-area-context';
import haversine from 'haversine';
import * as Location from 'expo-location';
import { SafeMapView as MapView, SafeMarker as Marker } from './SafeMapView';

const CartDetails = () => {
    const items = useSelector(selectBasketItems);
    const navigation = useNavigation();
    const basketTotal = useSelector(selectBasketTotal);
    const sellers = useSelector(selectSellers);
    const [isBottomSheetOpen, setBottomSheetOpen] = useState(false);
    const bottomSheetRef = useRef(null);
    const [sellerLocation, setSellerLocation] = useState({ latitude: null, longitude: null });
    const [distance, setDistance] = useState(null);
    const [userLocation, setUserLocation] = useState(null);
    const [address, setAddress] = useState('');
    const [isUserWantDelivery, setIsUserWantDelivery] = useState(true); // Entrega ativada por padrão
    const [distanceToPay, setDistanceToPay] = useState(0);
const [totalToPay, setTotalToPay] = useState(subtotal); 

    const financialFees = 0;
    const pricePerKm = 10;
    const minDelivPrice = 100;
    const iva = 0;
    const subtotal = basketTotal + financialFees + iva;

    const distancePrice = distance ? (distance * pricePerKm).toFixed(2) : 0;
    // const  distanceToPay =isUserWantDelivery ? (distance && distance < 10 ? minDelivPrice : minDelivPrice + Number(distancePrice)) : 0;
    
    // const totalToPay = isUserWantDelivery ? subtotal + distanceToPay : subtotal; // Condicional para considerar a entrega

    useEffect(() => {
        if (sellers.length > 0) {
            const validSeller = sellers.find(seller => seller.seller.latitude && seller.seller.longitude);
            if (validSeller) {
                setSellerLocation({
                    latitude: parseFloat(validSeller.seller.latitude),
                    longitude: parseFloat(validSeller.seller.longitude)
                });
            }
        }
    }, [sellers]);

    useEffect(() => {
        let locationSubscription;

        const startLocationTracking = async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.log('Permissão de localização negada');
                return;
            }

            locationSubscription = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 5000, // Atualiza a cada 5 segundos
                    distanceInterval: 10, // Atualiza a cada 10 metros
                },
                (newLocation) => {
                    setUserLocation({
                        latitude: newLocation.coords.latitude,
                        longitude: newLocation.coords.longitude,
                    });
                }
            );
        };

        startLocationTracking();

        return () => {
            if (locationSubscription) {
                locationSubscription.remove();
            }
        };
    }, []);

    useEffect(() => {
        if (userLocation && sellerLocation.latitude && sellerLocation.longitude) {
            const calculatedDistance = haversine(userLocation, sellerLocation, { unit: 'km' });
            setDistance(calculatedDistance);
        }
    }, [userLocation, sellerLocation]);

    const handleOpenBottomSheet = () => {
        setBottomSheetOpen(true);
        bottomSheetRef.current?.expand();
    };

    const handleCloseBottomSheet = () => {
        setBottomSheetOpen(false);
        bottomSheetRef.current?.close();
    };

    const dispatch = useDispatch();


    useEffect(() => {
        let newDistanceToPay = 0;
    
        if (isUserWantDelivery) {
            if (distance) {
                newDistanceToPay = distance < 10 ? minDelivPrice : minDelivPrice + Number(distancePrice);
            } else {
                newDistanceToPay = minDelivPrice; // Valor mínimo quando distância ainda não foi calculada
            }
        }else{
            setAddress('')
        }
    
        setDistanceToPay(newDistanceToPay);
        setTotalToPay(subtotal + newDistanceToPay);
    
    }, [isUserWantDelivery, distance, subtotal]);
    
    // Atualizar Redux sempre que os valores mudarem
    useEffect(() => {
        dispatch(addTotalToPay(totalToPay));
        dispatch(addIva(iva));
        dispatch(addDeliverPrice(distanceToPay));
    }, [totalToPay, distanceToPay, dispatch]);


    useEffect(() => {
  dispatch(addAddress(address));
}, [address]);

    // useEffect(() => {
    //     if (totalToPay && distanceToPay) {
    //         dispatch(addTotalToPay(totalToPay));
    //         dispatch(addIva(iva));
    //         console.log(distanceToPay)
    //         dispatch(addDeliverPrice(distanceToPay));
    //     }
    // }, [totalToPay, distanceToPay,isUserWantDelivery, dispatch]);

    // Effect to update distanceToPay when isUserWantDelivery changes
// useEffect(() => {
//     const newDistanceToPay = isUserWantDelivery 
//         ? (distance && distance < 10 ? minDelivPrice : minDelivPrice + Number(distancePrice)) 
//         : 0;

//     setDistanceToPay(newDistanceToPay);
//     if (totalToPay && distanceToPay) {
//         dispatch(addTotalToPay(totalToPay));
//         dispatch(addIva(iva));
//         console.log(distanceToPay)
//         dispatch(addDeliverPrice(distanceToPay));
//     }
//     setTotalToPay(subtotal + newDistanceToPay);
// }, [isUserWantDelivery, distance, distancePrice, subtotal]);

    if (items.length === 0) return null;

    return (
        <View style={styles.popupContent}>
            <View style={styles.barPopup}>
                <Text style={styles.length}>Subtotal</Text>
                <Text style={styles.total}>{parseFloat(basketTotal).toFixed(2)} MT</Text>
            </View>
            <View style={styles.barPopup}>
                <Text style={styles.totalDescript}>Total a pagar</Text>
                <Text style={styles.totalPrice}>{subtotal.toFixed(2)} MT</Text>
            </View>
           <TouchableOpacity
                    style={styles.barPayment}
                    onPress={() => navigation.navigate('DeliveryDetails')}
                >
                    <Text style={styles.payment}>Detalhes do destino de entrega</Text>
                </TouchableOpacity>
        </View>
    );
};

export default CartDetails;
const styles = StyleSheet.create({
    bottomSheetContent: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 6,
    },
    bottomSheetTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
        textAlign: 'center',
    },
    locationText: {
        fontSize: 16,
        color: '#666',
        marginBottom: 10,
        textAlign: 'center',
        backgroundColor: '#F8F8F8',
        padding: 12,
        borderRadius: 12,
    },
    distanceText: {
        fontSize: 16,
        color: 'black',
        marginBottom: 10,
        textAlign: 'center',
        fontWeight: '600',
    },
    map: {
        width: '100%',
        height: 220,
        borderRadius: 15,
        marginTop: 15,
        marginBottom: 15,
    },
    barPayment: {
        backgroundColor: '#7F00FF',
        paddingVertical: 14,
        paddingHorizontal: 22,
        borderRadius: 30,
        marginTop: 40,
        shadowColor: '#7F00FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
        elevation: 6,
        alignSelf: 'center',
    },
    payment: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
    },
    popupContent: {
        position: 'absolute',
        alignContent: 'center',
        bottom: 0,
        fontWeight: '500',
        width: '100%',
        zIndex: 500,
        marginLeft: 5,
        paddingRight: 10,
    },
    barPopup: {
        alignItems: 'center',
        flexDirection: 'row',
        padding: 6,
        justifyContent: 'space-between',
    },
    length: {
        fontWeight: '600',
        color: 'grey',
        borderRadius: 5,
    },
    total: {
        fontWeight: '600',
        color: 'grey',
    },
    totalDescript: {
        color: '#7F00FF',
        fontWeight: '700',
    },
    totalPrice: {
        color: '#7F00FF',
        fontWeight: '700',
    },
    switchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginVertical: 12,
    },
    switchText: {
        fontSize: 16,
        color: '#7F00FF',
        fontWeight: '600',
    },
    statusText: {
        fontSize: 16,
        color: 'black',
        textAlign: 'center',
        marginVertical: 12,
        fontWeight: '600',
    },
    switchButton: {
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10,
    },
    switchButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
    },
    popupContent: {
    position: 'absolute',
    bottom: 20, // Distância da parte inferior da tela
    width: '100%',
    paddingHorizontal: 16, // Margem lateral para não encostar nas bordas
    zIndex: 500,
    backgroundColor: '#fff', // Fundo para o botão se destacar
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 20,
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: -3 },
    // shadowOpacity: 0.1,
    // shadowRadius: 5,
    // elevation: 6,
},

barPayment: {
    backgroundColor: '#7F00FF',
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 30,
    alignSelf: 'center',
    shadowColor: '#7F00FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
    marginTop: 20,
},

// Opcional: aumentar o touch target do botão
payment: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
},
});
