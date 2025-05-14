import React from 'react';
import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const ProductSellerDetail = () => {
    const {
        params: { product }
    } = useRoute();

    const navigation = useNavigation();

    if (!product) {
        return <Text>Processando...</Text>;
    }

    return (
        <ScrollView style={styles.container}>
            <Image source={{ uri: product.image }} style={styles.image} resizeMode="contain" />
            <View style={styles.icons}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name='chevron-back-circle' size={40} style={styles.back} />
                </TouchableOpacity>
            </View>
            <View style={styles.details}>
                <Text style={styles.name}>{product?.nome}</Text>

                <Text style={styles.category}>Categoria: {product.category?.nome || 'Sem categoria'}</Text>
                <Text style={styles.province}>Localização do produto: {product.province?.name || 'Sem provincia'}</Text>
                <Text style={styles.brand}>Marca/sabor: {product.brand}</Text>
                <Text style={[styles.stock, { color: product.countInStock > 0 ? '#7F00FF' : 'red' }]}> 
                    {product.countInStock > 0 ? `Quantidade disponível: ${product.countInStock} unidade(s)` : 'Fora de estoque'}
                </Text>
                <Text style={styles.price}>Valor do fornecedor: {product.priceFromSeller} Mt</Text>

                <Text style={styles.price}>Preço de Venda: {product.price} Mt</Text>
                
                {product.onSale && (
                    <Text style={styles.onSale}>Em promoção: {product.onSalePercentage}%</Text>
                )}
                
                <Text style={styles.description}>{product.description}</Text>
                
                
                {product.isGuaranteed && (
                    <Text style={styles.guarantee}>Garantia: {product.guaranteedPeriod} meses</Text>
                )}
                
                {product.isOrdered && (
                    <Text style={styles.delivery}>Entrega em: {product.orderPeriod} dias</Text>
                )}
            </View>
            <View style={{ marginBottom: 210 }} />
        </ScrollView>
    );
};

export default ProductSellerDetail;
const styles = StyleSheet.create({
    back: {
        top: 40,
        color: '#7F00FF',
    },
    icons: {
        position: 'absolute',
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '90%',
    },
    container: {
        flex: 1,
        backgroundColor: '#F4F4F4',
        padding: 20,
    },
    image: {
        width: '100%',
        height: 300,
        borderRadius: 15,
        // backgroundColor: '#EAEAEA',
    },
    details: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 5,
        marginBottom: 25,
    },
    name: {
        fontSize: 26,
        fontWeight: '700',
        color: '#222',
        textAlign: 'center',
        marginBottom: 12,
    },
    price: {
        fontSize: 17,
        // color: '#6A0DAD',
        fontWeight: '600',
        marginBottom: 12,
        textAlign: 'center',
    },
    onSale: {
        fontSize: 17,
        // color: '#E63946',
        fontWeight: '600',
        marginBottom: 12,
        textAlign: 'center',
    },
    brand: {
        fontSize: 17,
        color: '#666',
        marginBottom: 12,
        textAlign: 'center',
    },
    description: {
        fontSize: 17,
        color: '#444',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 22,
    },
    stock: {
        fontSize: 17,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 12,
        color: '#1B5E20',
    },
    category: {
        fontSize: 17,
        color: '#666',
        textAlign: 'center',
        marginBottom: 12,
    },
    province: {
        fontSize: 17,
        color: '#666',
        textAlign: 'center',
        marginBottom: 12,
    },
    guarantee: {
        fontSize: 17,
        color: '#008000',
        fontWeight: '600',
        marginBottom: 12,
        textAlign: 'center',
    },
    delivery: {
        fontSize: 17,
        color: '#007BFF',
        fontWeight: '600',
        marginBottom: 12,
        textAlign: 'center',
    },
});
