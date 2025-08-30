import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  FlatList,
  SafeAreaView,
} from "react-native";
import MapView, { Marker, Polyline, UrlTile } from "react-native-maps";
import { LinearGradient } from "expo-linear-gradient";

const transportTypes = ["Mota", "Carro"];
const goodsTypes = [
  "Roupa",
  "Sapatos",
  "Caixas",
  "Botija de gás",
  "Matabicho Romântico",
  "Outro",
];
const paymentOptions = ["Cash", "Mobile Money", "Card"];
const paymentMethods = ["Pré-pago", "Pagamento na entrega"];

const transportImages = {
  Mota: require("../assets/vehicle/bycicle.png"),
  Carro: require("../assets/vehicle/car.png"),
};

const goodsImages = {
  Roupa: require("../assets/roupas.jpg"),
  Sapatos: require("../assets/sapatos.jpg"),
  Caixas: require("../assets/caixas.jpg"),
  "Botija de gás": require("../assets/galp.png"),
  "Matabicho Romântico": require("../assets/matabicho.jpg"),
  Outro: require("../assets/outro.jpg"),
};

// Função para calcular distância usando Haversine
const haversineDistance = (coord1, coord2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371; // Raio da Terra em km
  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);
  const lat1 = toRad(coord1.latitude);
  const lat2 = toRad(coord2.latitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function RequestDelivScreen() {
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [transportType, setTransportType] = useState("");
  const [goodType, setGoodType] = useState("");
  const [customGood, setCustomGood] = useState("");
  const [deliverCity, setDeliverCity] = useState("");
  const [paymentOption, setPaymentOption] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [description, setDescription] = useState("");

  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [distance, setDistance] = useState(0);
  const [deliveryPrice, setDeliveryPrice] = useState(0);

  const handleTransportSelect = (type) => {
    setTransportType(type);
    recalcPrice(type, distance);
  };

  const handleGoodSelect = (good) => {
    setGoodType(good);
    if (good !== "Outro") setCustomGood("");
  };

  const recalcPrice = (transport, dist) => {
    if (!transport || !dist) return;
    const base = transport === "Carro" ? 200 : 100;
    const pricePerKm = transport === "Carro" ? 30 : 20;
    setDeliveryPrice(base + dist * pricePerKm);
  };

  const handleMapPress = (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    if (!origin) {
      setOrigin({ latitude, longitude });
    } else if (!destination) {
      setDestination({ latitude, longitude });
      const dist = haversineDistance(origin, { latitude, longitude });
      setDistance(dist);
      recalcPrice(transportType, dist);
    } else {
      // Reinicia pontos ao clicar no mapa pela terceira vez
      setOrigin({ latitude, longitude });
      setDestination(null);
      setDistance(0);
      setDeliveryPrice(0);
    }
  };

  const handleSubmit = () => {
    if (
      !name ||
      !phoneNumber ||
      !transportType ||
      !goodType ||
      !deliverCity ||
      !origin ||
      !destination ||
      !paymentOption ||
      !paymentMethod ||
      !description
    ) {
      Alert.alert("Erro", "Preencha todos os campos obrigatórios!");
      return;
    }
    const finalGood = goodType === "Outro" ? customGood : goodType;
    const requestData = {
      name,
      phoneNumber,
      transportType,
      goodType: finalGood,
      deliverCity,
      origin: `${origin.latitude},${origin.longitude}`,
      destination: `${destination.latitude},${destination.longitude}`,
      distance,
      deliveryPrice,
      paymentOption,
      paymentMethod,
      description,
    };
    console.log("Pedido de entrega:", requestData);
    Alert.alert("Sucesso", "Pedido de entrega criado com sucesso!");
  };

  const renderOption = (item, selected, onPress, image) => (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.optionButton,
        selected && styles.optionButtonSelected,
        { elevation: selected ? 5 : 2 },
      ]}
    >
      {image && <Image source={image} style={styles.optionImage} />}
      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Solicitar transporte</Text>

        {/* Mapa - Origem e Destino */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Selecione o ponto de recolha e entrega</Text>
          <Text style={{ fontSize: 14, color: "#666", marginBottom: 10, textAlign: "center" }}>
            {!origin 
              ? "Toque no mapa para definir o ponto de recolha."
              : !destination 
                ? "Agora toque no mapa para definir o ponto de entrega."
                : "Toque no mapa novamente para redefinir os pontos."}
          </Text>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: -25.9655,
              longitude: 32.5892,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            onPress={handleMapPress}
          >
            {/* Tile do OpenStreetMap */}
            <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} />
            
            {origin && <Marker coordinate={origin} title="Recolha" pinColor="green" />}
            {destination && <Marker coordinate={destination} title="Entrega" pinColor="red" />}
            {origin && destination && (
              <Polyline 
                coordinates={[origin, destination]} 
                strokeColor="#007bff" 
                strokeWidth={3} 
              />
            )}
          </MapView>
        </View>

        {/* Informações do Cliente */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Informações do Cliente</Text>
          <TextInput
            style={styles.input}
            placeholder="Nome completo"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="Número de telefone"
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />
        </View>

        {/* Local de Entrega */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Local de Entrega</Text>
          <TextInput
            style={styles.input}
            placeholder="Local de entrega"
            value={deliverCity}
            onChangeText={setDeliverCity}
          />
        </View>

        {/* Descrição */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Descrição do Pedido</Text>
          <TextInput
            style={[styles.input, { height: 80 }]}
            placeholder="Descrição do pedido"
            multiline
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Transporte */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Tipo de Transporte</Text>
          <FlatList
            data={transportTypes}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item}
            renderItem={({ item }) =>
              renderOption(
                item,
                transportType === item,
                () => handleTransportSelect(item),
                transportImages[item]
              )
            }
          />
        </View>

        {/* Tipo de bem */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Tipo de Bem</Text>
          <FlatList
            data={goodsTypes}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item}
            renderItem={({ item }) =>
              renderOption(
                item,
                goodType === item,
                () => handleGoodSelect(item),
                goodsImages[item]
              )
            }
          />
          {goodType === "Outro" && (
            <TextInput
              style={styles.input}
              placeholder="Digite o bem"
              value={customGood}
              onChangeText={setCustomGood}
            />
          )}
        </View>

        {/* Pagamento */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Opção de Pagamento</Text>
          <FlatList
            data={paymentOptions}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item}
            renderItem={({ item }) => renderOption(item, paymentOption === item, () => setPaymentOption(item))}
          />

          <Text style={[styles.sectionTitle, { marginTop: 15 }]}>Método de Pagamento</Text>
          <FlatList
            data={paymentMethods}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item}
            renderItem={({ item }) => renderOption(item, paymentMethod === item, () => setPaymentMethod(item))}
          />
        </View>

        {/* Resumo */}
        <View style={styles.sectionCard}>
          <Text style={styles.priceText}>
            Distância: {distance.toFixed(2)} km{"\n"}Preço estimado: {deliveryPrice.toFixed(2)} MT
          </Text>
        </View>

        {/* Botão */}
        <TouchableOpacity onPress={handleSubmit} activeOpacity={0.8} style={{ marginBottom: 30 }}>
          <LinearGradient colors={["#7F00FF", "#E100FF"]} style={styles.submitButton}>
            <Text style={styles.submitButtonText}>Criar Pedido</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ marginBottom: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 15, paddingBottom: 20 },
  title: { fontSize: 26, fontWeight: "bold", marginBottom: 15, textAlign: "center", color: "#4a148c" },
  sectionCard: { backgroundColor: "#fff", borderRadius: 12, padding: 15, marginBottom: 15, elevation: 3 },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 10, color: "#333" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 10, marginBottom: 10, backgroundColor: "#fff" },
  optionButton: { padding: 10, backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: "#ddd", marginRight: 10, marginBottom: 10, alignItems: "center", width: 100 },
  optionButtonSelected: { backgroundColor: "#7F00FF", borderColor: "#7F00FF" },
  optionText: { color: "#333", textAlign: "center" },
  optionTextSelected: { color: "#fff", fontWeight: "bold" },
  optionImage: { width: 50, height: 50, marginBottom: 5 },
  map: { height: 250, borderRadius: 12 },
  priceText: { fontSize: 18, fontWeight: "600", textAlign: "center", color: "#4a148c" },
  submitButton: { padding: 15, borderRadius: 12, alignItems: "center" },
  submitButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});
