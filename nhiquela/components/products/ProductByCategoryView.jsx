import { View, Text, TextInput, FlatList, Image, ActivityIndicator, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import styles from '../../screens/search.style';
import api from '../../hooks/createConnectionApi';
import { useRoute } from '@react-navigation/native'
import ProductByCategoryTile from '../ProductByCategoryTile';
import { Ionicons } from "@expo/vector-icons"

const ProductByCategoryView = ({ navigation }) => {
    const [searchKey, setSearchKey] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const route = useRoute();
    const { products, title } = route.params;



    const handleSearch = async (query) => {
        setIsLoading(true);
        try {
            const response = await api.get(`/products/search?query=${query}`);
            setSearchResults(response.data.products);
        } catch (error) {
            console.log('Failed to get Products', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setIsLoading(false);

    }, []);

    return (
        <SafeAreaView style={{marginBottom: 60}}>
            <View style={style.Wrapper}>
                <Text style={style.title}>{title}</Text>
                <TouchableWithoutFeedback onPress={() => { navigation.goBack() }}>
                    <Ionicons name='close' size={25}
                        color={'#3e2465'}
                    />
                </TouchableWithoutFeedback>
            </View>

            {isLoading ? (
                <ActivityIndicator size={'large'} color={'#4B0082'} />
            ) : (
                <FlatList
                    style={{ marginHorizontal: 12 }}
                    data={products}
                    keyExtractor={(item) => item._id}
                    renderItem={({ item }) => <ProductByCategoryTile item={item} />}
                />
            )}
        </SafeAreaView>
    );
};

export default ProductByCategoryView;

const style = StyleSheet.create({
    title: {
        fontWeight: "500",
        fontSize: 19
    },
    Wrapper: {
        marginTop: 15,
        justifyContent: 'space-between',
        flexDirection: "row",
        marginLeft: 15,
        marginBottom: 15,
        marginRight: 15
    }
})