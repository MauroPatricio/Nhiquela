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
        return <View style={styles.loader}><Text>Processando...</Text></View>;
    }

    return (
        <ScrollView style={styles.container}>
            {/* Top Section with Image and Back Button */}
            <View style={styles.top}>
                <Image 
                    source={{ uri: product.image }} 
                    style={styles.image} 
                    resizeMode="cover" 
                />
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name='chevron-back-circle' size={40} color="#ffffff" />
                </TouchableOpacity>
            </View>

            {/* Card with Product Details */}
            <View style={styles.card}>
                <Text style={styles.name}>{product?.nome}</Text>

<Text style={styles.category}>
    Categoria do Produto: {product?.category?.nome || 'Não categorizado'}
</Text>

<Text style={styles.province}>
    Localização: {product?.province?.name || 'Não especificada'}
</Text>

<Text style={styles.brand}>
    Marca ou Sabor: {product?.brand || 'Não especificado'}
</Text>

<Text style={[
    styles.stock, 
    { color: product?.countInStock > 0 ? '#1B5E20' : 'red' }
]}>
    {product?.countInStock > 0 ? 
      `Quantidade em Estoque: ${product?.countInStock} unidade(s)` : 
      'Produto Esgotado'}
</Text>

<Text style={styles.price}>
    Preço do Fornecedor: {product?.priceFromSeller} Mt
</Text>

<Text style={styles.price}>
    Preço de Venda ao Consumidor: {product?.price} Mt
</Text>

{product?.onSale && (
    <>
        <Text style={styles.onSale}>
            Desconto Aplicado: {product?.onSalePercentage}%
        </Text>

        <Text style={styles.onSale}>
            Preço Promocional: {product?.discount} Mt
        </Text>

        <Text style={styles.onSale}>
              Valor que o fornecedor recebera : {product?.sellerEarningsAfterDiscount} Mt
        </Text>
    </>
)}

<Text style={styles.description}>
    Descrição: {product?.description}
</Text>

{product?.isGuaranteed && (
    <Text style={styles.guarantee}>
        Garantia: {product?.guaranteedPeriod} meses
    </Text>
)}

{product?.isOrdered && (
    <Text style={styles.delivery}>
        Prazo de Entrega: {product?.orderPeriod}
    </Text>
)}

            </View>

            {/* Spacer at bottom */}
            <View style={{ marginBottom: 100 }}/>
        </ScrollView>
    )
};

export default ProductSellerDetail;

const styles = StyleSheet.create({  
    container: {
        flex: 1,
        backgroundColor: '#F4F4F4',
    },
    top: {
        position: 'relative',
    },
    image: {
        width: '100%',
        height: 350,
    },
    backBtn: {
        position: 'absolute',
        top: 40,
        left: 20,
    },
    card: {
        backgroundColor: '#FFFFFF',
        marginTop: -30,
        marginHorizontal: 20,
        padding: 25,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 5,
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#222',
        textAlign: 'center',
        marginBottom: 20,
    },
    category: {
        fontSize: 17,
        color: '#666',
        marginBottom: 12,
        textAlign: 'center',
    },
    province: {
        fontSize: 17,
        color: '#666',
        marginBottom: 12,
        textAlign: 'center',
    },
    brand: {
        fontSize: 17,
        color: '#666',
        marginBottom: 12,
        textAlign: 'center',
    },
    stock: {
        fontSize: 17,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 12,
    },
    price: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#6A0DAD',
        marginBottom: 12,
        textAlign: 'center',
    },
    onSale: {
        fontSize: 15,
        color: 'blue',
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    description: {
        fontSize: 17,
        color: '#444',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 24,
    },
    guarantee: {
        fontSize: 17,
        color: '#1B5E20',
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
    loader: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    }
});
