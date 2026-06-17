import { TouchableOpacity, View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import React from 'react';
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSelector } from 'react-redux';
import { selectUserLocation } from '../../features/locationSlice';
import { getDistance } from 'geolib';

const { width } = Dimensions.get('window');
// Calcula a largura para caberem 2 por linha com espaçamento (ex: 20px padding)
const CARD_WIDTH = (width / 2) - 20;

const ProductCardView = ({ item }) => {
    const navigation = useNavigation();
    const product = item.item;
    const userLocation = useSelector(selectUserLocation);

    let distanceText = '';
    if (userLocation && (product.seller?.latitude || product.seller?.seller?.latitude)) {
        const prodLat = parseFloat(product.seller?.seller?.latitude || product.seller?.latitude);
        const prodLng = parseFloat(product.seller?.seller?.longitude || product.seller?.longitude);
        if (!isNaN(prodLat) && !isNaN(prodLng)) {
            const dist = getDistance(
                { latitude: userLocation.latitude, longitude: userLocation.longitude },
                { latitude: prodLat, longitude: prodLng }
            );
            distanceText = ` • ${(dist / 1000).toFixed(1)} km`;
        }
    }

    return (
        <TouchableOpacity 
            activeOpacity={0.9} 
            onPress={() => navigation.navigate("ProductDetail", { item })}
            style={styles.cardWrapper}
        >
            <View style={styles.container}>
                {/* Imagem do Produto */}
                <View style={styles.imageContainer}>
                    <Image 
                        source={{ uri: product.image }} 
                        style={styles.image} 
                    />
                    
                    {/* Badges Flutuantes (Canto Superior Esquerdo) */}
                    <View style={styles.badgesContainer}>
                        {product.onSale && (
                            <View style={[styles.badge, styles.badgePromo]}>
                                <Text style={styles.badgeText}>Promoção</Text>
                            </View>
                        )}
                        {product.isOrdered ? (
                            <View style={[styles.badge, styles.badgeOrder]}>
                                <Text style={styles.badgeText}>Por Encomenda</Text>
                            </View>
                        ) : product.countInStock === 0 ? (
                            <View style={[styles.badge, styles.badgeOut]}>
                                <Text style={styles.badgeText}>Esgotado</Text>
                            </View>
                        ) : null}
                    </View>
                </View>

                {/* Detalhes do Produto */}
                <View style={styles.details}>
                    {/* Fornecedor */}
                    <View style={styles.supplierRow}>
                        <Ionicons name="storefront-outline" size={10} color="#7F00FF" />
                        <Text style={styles.supplier} numberOfLines={1}>
                            {' '}{product.seller?.seller?.name || product.seller?.name || 'Fornecedor N/A'}
                            <Text style={styles.distanceText}>{distanceText}</Text>
                        </Text>
                    </View>
                    
                    {/* Nome do Produto */}
                    <Text style={styles.title} numberOfLines={2}>{product.nome}</Text>
                    
                    {/* Preço e Botão de Adicionar */}
                    <View style={styles.priceRow}>
                        <View>
                            {product.onSale ? (
                                <>
                                    <Text style={styles.originalPrice}>{product.price} MT</Text>
                                    <Text style={styles.promoPrice}>{product.discount} MT</Text>
                                </>
                            ) : (
                                <Text style={styles.price}>{product.price} MT</Text>
                            )}
                        </View>
                        
                        {/* Botão de Adicionar ao Carrinho (Rápido) */}
                        <TouchableOpacity style={styles.addBtn} activeOpacity={0.7} onPress={() => navigation.navigate("ProductDetail", { item })}>
                            <Ionicons name='add' size={20} color={'#FFF'} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default ProductCardView;

const styles = StyleSheet.create({
    cardWrapper: {
        width: CARD_WIDTH,
        marginHorizontal: 5,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 4, // Sombra suave para premium feel
    },
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        overflow: 'hidden',
    },
    imageContainer: {
        width: '100%',
        height: CARD_WIDTH, // Aspect Ratio 1:1
        backgroundColor: '#F8F9FA',
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    badgesContainer: {
        position: 'absolute',
        top: 8,
        left: 8,
        alignItems: 'flex-start',
        gap: 4,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgePromo: {
        backgroundColor: '#FF3B30',
    },
    badgeOrder: {
        backgroundColor: '#FF9500',
    },
    badgeOut: {
        backgroundColor: '#8E8E93',
    },
    badgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    details: {
        padding: 12,
        paddingTop: 10,
    },
    supplierRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    supplier: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
    },
    distanceText: {
        color: '#9CA3AF',
        fontSize: 11,
        fontWeight: '700',
    },
    title: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1C1C1E',
        marginBottom: 8,
        lineHeight: 18,
        height: 36, // Garante que 2 linhas ficam alinhadas mesmo se o nome for curto
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginTop: 2,
    },
    price: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1C1C1E',
    },
    originalPrice: {
        fontSize: 11,
        fontWeight: '600',
        color: '#8E8E93',
        textDecorationLine: 'line-through',
        marginBottom: -2,
    },
    promoPrice: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FF3B30',
    },
    addBtn: {
        backgroundColor: '#7F00FF',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#7F00FF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    }
});