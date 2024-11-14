import { StyleSheet, Text, TouchableOpacity, View, ScrollView, TextInput } from 'react-native';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addTotalToPay, selectBasketItems, selectBasketTotal, addIva, addDeliverPrice, selectSellers } from '../features/basketSlice';
import { useNavigation } from '@react-navigation/native';
import BottomSheetComponent from './BottomSheetComponent';
import { SafeAreaView } from 'react-native-safe-area-context';
import haversine from 'haversine';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';

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

    const financialFees = 0;
    const pricePerKm = 10;
    const minDelivPrice = 100;
    const iva = 0;
    const subtotal = basketTotal + financialFees + iva;

    const distancePrice = distance ? (distance * pricePerKm).toFixed(2) : 0;
    const distanceToPay = distance && distance < 10 ? minDelivPrice : minDelivPrice + Number(distancePrice);
    const totalToPay = subtotal + distanceToPay;

    useEffect(() => {
        if (sellers.length > 0) {
            sellers.forEach(seller => {
                if (seller.seller.latitude && seller.seller.longitude) {
                    setSellerLocation({
                        latitude: parseFloat(seller.seller.latitude),
                        longitude: parseFloat(seller.seller.longitude)
                    });
                }
            });
        }
    }, [sellers]);

    useEffect(() => {
        const requestLocationPermission = async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.log('No access to location');
                return;
            }
            let currentLocation = await Location.getCurrentPositionAsync({});
            setUserLocation({
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude
            });
        };
        requestLocationPermission();
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
        if (totalToPay && distanceToPay) {
            dispatch(addTotalToPay(totalToPay));
            dispatch(addIva(iva));
            dispatch(addDeliverPrice(distanceToPay));
        }
    }, [totalToPay, distanceToPay, dispatch]);

    if (items.length === 0) return null;

    return (
        <View style={styles.popupContent}>
            <View style={styles.barPopup}>
                <Text style={styles.length}>Subtotal</Text>
                <Text style={styles.total}>{parseFloat(basketTotal).toFixed(2)} MT</Text>
            </View>
            {/* <View style={styles.barPopup}>
                <Text style={styles.length}>Serviços financeiros</Text>
                <Text style={styles.total}>{financialFees} MT</Text>
            </View> */}
            <View style={styles.barPopup}>
                <Text style={styles.totalDescript}>Total a pagar</Text>
                <Text style={styles.totalPrice}>{subtotal.toFixed(2)} MT</Text>
            </View>
            <TouchableOpacity style={styles.barPayment} onPress={handleOpenBottomSheet}>
                <Text style={styles.payment}>Detalhes do destino de entrega</Text>
            </TouchableOpacity>

            <SafeAreaView>
                <BottomSheetComponent isOpen={isBottomSheetOpen} toggleSheet={handleCloseBottomSheet}>
                    <View style={styles.bottomSheetContent}>
                        <Text style={styles.bottomSheetTitle}>Endereço de entrega</Text>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <TextInput
                                style={styles.inputField}
                                placeholder="Insira o endereço de entrega"
                                value={address}
                                onChangeText={setAddress}
                            />
                            <View>
                                {userLocation ? (
                                    <Text style={styles.locationText}>
                                        Sua localização: {parseFloat(userLocation.latitude).toFixed(4)}, {parseFloat(userLocation.longitude).toFixed(4)}
                                    </Text>
                                ) : (
                                    <Text style={styles.locationText}>Obtendo localização...</Text>
                                )}
                                {distance ? (
                                    <Text style={styles.distanceText}>Distância até o fornecedor: {distance.toFixed(2)} km</Text>
                                ) : (
                                    <Text style={styles.distanceText}>Calculando distância...</Text>
                                )}
                            </View>

                            {userLocation && sellerLocation.latitude && sellerLocation.longitude ? (
                                <MapView
                                    style={styles.map}
                                    initialRegion={{
                                        latitude: userLocation.latitude,
                                        longitude: userLocation.longitude,
                                        latitudeDelta: 0.0922,
                                        longitudeDelta: 0.0421,
                                    }}
                                >
                                    <Marker coordinate={userLocation} title="Sua Localização" />
                                    <Marker coordinate={sellerLocation} title="Localização do Fornecedor" />
                                </MapView>
                            ) : (
                                <Text style={styles.locationText}>Localização do vendedor não disponível.</Text>
                            )}

                            <View style={styles.barPopup}>
                                <Text style={styles.length}>Subtotal</Text>
                                <Text style={styles.total}>{basketTotal} MT</Text>
                            </View>
                            {/* <View style={styles.barPopup}>
                                <Text style={styles.length}>Serviços financeiros</Text>
                                <Text style={styles.total}>{financialFees} MT</Text>
                            </View> */}
                            <View style={styles.barPopup}>
                                <Text style={styles.length}>Custo de entrega</Text>
                                <Text style={styles.total}>{distance ? distanceToPay : 'Calculando...'} MT</Text>
                            </View>
                            <View style={styles.barPopup}>
                                <Text style={styles.totalDescript}>Total a pagar</Text>
                                <Text style={styles.totalPrice}>{parseFloat(totalToPay).toFixed(2)} MT</Text>
                            </View>
                        </ScrollView>
                    </View>

                    {userLocation && sellerLocation.latitude && sellerLocation.longitude && (
                        <TouchableOpacity style={styles.barPayment} onPress={() => navigation.navigate('PaymentMethod')}>
                            <Text style={styles.payment}>Finalizar compra</Text>
                        </TouchableOpacity>
                    )}
                </BottomSheetComponent>
            </SafeAreaView>
        </View>
    );
};

export default CartDetails;


const styles = StyleSheet.create({
    bottomSheetContent: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff', // Clean white background for the bottom sheet
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5, // Adds subtle shadow for depth
    },
    bottomSheetTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333', // Darker font color for good contrast
        marginBottom: 15,
        textAlign: 'center', // Center the title for better UX
    },
    inputField: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        padding: 10,
        marginBottom: 15,
    },
    locationText: {
        fontSize: 16,
        color: '#555', // Soft grey for secondary info
        marginBottom: 10,
        textAlign: 'center',
        backgroundColor: '#F0F0F0', // Slight background contrast
        padding: 10,
        borderRadius: 10, // Rounded corners for a modern look
    },
    distanceText: {
        fontSize: 16,
        color: '#FF5733', // Highlight distance with a noticeable color
        marginBottom: 10,
        textAlign: 'center',
        fontWeight: '600',
    },
    map: {
        width: '100%',
        height: 200, // Height of the map
        marginTop: 15,
        marginBottom: 15,
    },
    scrollView: {
        flexGrow: 1, // Ensure the scroll view expands fully
    },
    barPayment: {
        backgroundColor: '#7F00FF', // Vibrant purple for the payment button
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 30, // Rounded for a button-like appearance
        marginTop: 20,
        shadowColor: '#7F00FF', // Subtle shadow matching the button color
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.5,
        shadowRadius: 5,
        elevation: 5,
        alignSelf: 'center',
    },
    payment: {
        color: '#fff', // White text for strong contrast
        fontSize: 16,
        fontWeight: '600',
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
        padding: 2,
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
        fontWeight: '600',
    },
    totalPrice: {
        color: '#7F00FF',
        fontWeight: '600',
    },
});
