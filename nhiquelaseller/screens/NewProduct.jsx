import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Image, Alert, RefreshControl  } from 'react-native';
import { Formik } from 'formik';
import api from '../hooks/createConnectionApi';
import { Picker } from '@react-native-picker/picker';
import Toast from 'react-native-toast-message';
import * as Yup from 'yup';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';

const NewProduct = () => {
  const navigation = useNavigation();
  const [provinces, setProvinces] = useState(null);
  const [categories, setCategories] = useState(null);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);
  const [errorColor, setErrorColor] = useState(null);
  const [errorSize, setErrorSize] = useState(null);
  const [colors, setColors] = useState(null);
  const [sizes, setSizes] = useState(null);
  const [selectedColors, setSelectedColors] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [userData, setUserData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleSubmit = async (values, resetForm) => {
    if (userData == null) return;

    try {
      if (selectedColors.length === 0) {
        setErrorColor('Adicione as cores disponíveis do produto.');
        Toast.show({
          type: 'error',
          text1: 'Adicione as cores disponíveis do produto.',
          text2: '',
          position: 'top',
        });
        return;
      }

      if (selectedSizes.length === 0) {
        setErrorSize('Adicione os tamanhos disponíveis do produto.');
        Toast.show({
          type: 'error',
          text1: 'Adicione os tamanhos disponíveis do produto',
          text2: '',
          position: 'top',
        });
        return;
      }

      values.color = selectedColors;
      values.size = selectedSizes;

      const response = await api.post('products/', values, {
        headers: { Authorization: `Bearer ${userData.token}` },
      });

      if (response.status === 200) {
        Toast.show({
          type: 'success',
          text1: 'SUCESSO',
          text2: 'Produto criado com sucesso!',
          position: 'top',
        });

        resetForm();
        setSelectedColors([]);
        setSelectedSizes([]);
        setImage(null);
        navigation.navigate('ProductListSeller');
      }
    } catch (error) {
      const errorMessage = error.response?.data.error || 'Erro ao criar o produto.';
      Toast.show({
        type: 'error',
        text1: 'Erro',
        text2: errorMessage,
        position: 'top',
      });
    }
  };

  const handleImagePicker = async (setFieldValue) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Erro', 'Permissão para acessar a galeria é necessária!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setImage(uri);
      const uploadedImage = await uploadImage(uri);
      setFieldValue('image', uploadedImage);
    }
  };

  const uploadImage = async (uri) => {
    const bodyFormData = new FormData();
    bodyFormData.append('file', {
      uri,
      name: 'image.jpg',
      type: 'image/jpeg',
    });

    try {
      const { data } = await api.post('upload', bodyFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setImage(data.secure_url);
      return data.secure_url;
    } catch (error) {
      Alert.alert('Erro', 'Falha ao enviar a imagem.');
    }
  };
// Fetch provinces
const fetchProvinces = async () => {
  try {
    const { data } = await api.get('provinces');
    setProvinces(data.provinces);
  } catch (err) {
    setError(err.message);
  }
};

useEffect(() => {
  fetchProvinces();
  fetchCategories();
  fetchSizes();
  fetchColors();
}, []);
// Fetch categories
const fetchCategories = async () => {
  try {
    const { data } = await api.get('categories');
    setCategories(data.categories);
  } catch (err) {
    setError(err.message);
  }
};

// Fetch colors
const fetchColors = async () => {
  try {
    const { data } = await api.get('colors');
    setColors(data.colors);
  } catch (err) {
    setError(err.message);
  }
};

// Fetch sizes
const fetchSizes = async () => {
  try {
    const { data } = await api.get('sizes');
    setSizes(data.sizes);
  } catch (err) {
    setError(err.message);
  }
};

// Refresh function
const onRefresh = async () => {
  setRefreshing(true);
  try {
    await Promise.all([fetchProvinces(), fetchCategories(), fetchColors(), fetchSizes()]);
  } catch (error) {
    console.error('Erro ao atualizar os dados:', error);
  } finally {
    setRefreshing(false);
  }
};

  const validationSchema = Yup.object().shape({
    nome: Yup.string().required('O nome é obrigatório'),
    name: Yup.string().required('O nome do produto é obrigatório'),
    slug: Yup.string().required('O nome abreviado do produto é obrigatório'),
    price: Yup.number().typeError('O preço deve ser um número').required('O preço é obrigatório'),
    image: Yup.string().required('A imagem do produto é obrigatória'),
    category: Yup.string().required('A categoria é obrigatória'),
    province: Yup.string().required('A localização é obrigatória'),
    countInStock: Yup.number().typeError('A quantidade em estoque deve ser um número').required('A quantidade em estoque é obrigatória'),
    description: Yup.string().required('A descrição é obrigatória'),
    brand: Yup.string().required('A Marca ou sabor do produto é obrigatório'),

  });

  const checkIfUserExist = async () => {
    const id = await AsyncStorage.getItem('id');
    const userId = `user${JSON.parse(id)}`;

    try {
      const currentUser = await AsyncStorage.getItem(userId);
      if (currentUser !== null) {
        const parseData = JSON.parse(currentUser);
        setUserData(parseData);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    checkIfUserExist();
  }, []);

  const handleColorSelect = (color) => {
    setSelectedColors((prevSelectedColors) => {
      if (prevSelectedColors.includes(color)) {
        return prevSelectedColors.filter((c) => c !== color);
      } else {
        return [...prevSelectedColors, color];
      }
    });
  };

  const handleSizeSelect = (size) => {
    setSelectedSizes((prevSelectedSizes) => {
      if (prevSelectedSizes.includes(size)) {
        return prevSelectedSizes.filter((s) => s !== size);
      } else {
        return [...prevSelectedSizes, size];
      }
    });
  };

  return (
    <ScrollView style={styles.container}
    refreshControl={
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        colors={['#7F00FF']}
        tintColor="#7F00FF"
      />
    }>
      <Text style={styles.title}>Criar novo produto</Text>

      {userData && userData.isApproved ? (
        <Formik
          initialValues={{
            nome: '',
            name: '',
            slug: '',
            image: '',
            price: '',
            category: '',
            province: '',
            brand: '',
            countInStock: '',
            description: '',
            onSale: false,
            onSalePercentage: 0,
            color: '',
            size: '',
            orderPeriod: 0,
            isGuaranteed: false,
            guaranteedPeriod: 0,
          }}
          validationSchema={validationSchema}
          onSubmit={(values, { resetForm }) => handleSubmit(values, resetForm)}
        >
          {({ handleChange, handleBlur, handleSubmit, values, setFieldValue, touched, errors }) => (
            <>
              <Picker
                selectedValue={values.category || ''}
                onValueChange={(itemValue) => setFieldValue('category', itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Categoria" value="" />
                {categories &&
                  categories.map((categorie) => (
                    <Picker.Item key={categorie._id} label={categorie.nome} value={categorie._id} />
                  ))}
              </Picker>
              {touched.category && errors.category && <Text style={styles.error}>{errors.category}</Text>}

              <Picker
                selectedValue={values.province || ''}
                onValueChange={(itemValue) => setFieldValue('province', itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Localização do produto" value="" />
                {provinces &&
                  provinces.map((province) => (
                    <Picker.Item key={province._id} label={province.name} value={province._id} />
                  ))}
              </Picker>
              {touched.province && errors.province && <Text style={styles.error}>{errors.province}</Text>}

              <Picker
                selectedValue={null}
                onValueChange={(itemValue) => handleColorSelect(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Selecione a cor" value="" />
                {colors &&
                  colors.map((color) => (
                    <Picker.Item key={color._id} label={color.nome} value={color} />
                  ))}
              </Picker>
              <Text>Cores selecionadas: {selectedColors.map((color) => color.nome).join(', ')}</Text>
              {errorColor && <Text style={styles.error}>{errorColor}</Text>}

              <Picker
                selectedValue={null}
                onValueChange={(itemValue) => handleSizeSelect(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Selecione o tamanho" value="" />
                {sizes &&
                  sizes.map((size) => (
                    <Picker.Item key={size._id} label={size.nome} value={size} />
                  ))}
              </Picker>
              <Text>Tamanhos selecionados: {selectedSizes.map((size) => size.nome).join(', ')}</Text>
              {errorSize && <Text style={styles.error}>{errorSize}</Text>}

              <TextInput
                style={styles.input}
                placeholder="Nome do produto (PT)"
                onChangeText={handleChange('nome')}
                onBlur={handleBlur('nome')}
                value={values.nome}
              />
              {touched.nome && errors.nome && <Text style={styles.error}>{errors.nome}</Text>}

              <TextInput
                style={styles.input}
                placeholder="Nome do produto (En)"
                onChangeText={handleChange('name')}
                onBlur={handleBlur('name')}
                value={values.name}
              />
              {touched.name && errors.name && <Text style={styles.error}>{errors.name}</Text>}

              <TextInput
                style={styles.input}
                placeholder="Nome abreviado"
                onChangeText={handleChange('slug')}
                onBlur={handleBlur('slug')}
                value={values.slug}
              />
              {touched.slug && errors.slug && <Text style={styles.error}>{errors.slug}</Text>}

              <TextInput
                style={styles.input}
                placeholder="Descrição do produto"
                onChangeText={handleChange('description')}
                onBlur={handleBlur('description')}
                value={values.description}
              />
              {touched.description && errors.description && <Text style={styles.error}>{errors.description}</Text>}

              {image ? (
                <Image source={{ uri: image }} style={styles.logo} />
              ) : (
                <Text style={{ color: 'red' }}>Adicione a imagem</Text>
              )}
              {touched.image && errors.image && <Text style={styles.error}>{errors.image}</Text>}

              <TouchableOpacity
                style={styles.imagePicker}
                onPress={() => handleImagePicker(setFieldValue)}
              >
                <Text style={styles.imagePickerText}>
                  {values.image ? 'Mudar Imagem' : 'Imagem do produto'}
                </Text>
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                placeholder="Preço"
                onChangeText={(text) => {
                  const filteredText = text.replace(/[^0-9]/g, '');
                  setFieldValue('price', filteredText);
                }}
                onBlur={handleBlur('price')}
                value={values.price}
              />
              {touched.price && errors.price && <Text style={styles.error}>{errors.price}</Text>}

              <TextInput
                style={styles.input}
                placeholder="Marca/Sabor"
                onChangeText={handleChange('brand')}
                onBlur={handleBlur('brand')}
                value={values.brand}
              />
              {touched.brand && errors.brand && <Text style={styles.error}>{errors.brand}</Text>}

              <TextInput
                style={styles.input}
                placeholder="Quantidade disponível"
                onChangeText={(text) => {
                  const filteredText = text.replace(/[^0-9]/g, '');
                  setFieldValue('countInStock', filteredText);
                }}
                onBlur={handleBlur('countInStock')}
                value={values.countInStock}
              />
              {touched.countInStock && errors.countInStock && <Text style={styles.error}>{errors.countInStock}</Text>}

              <View style={styles.switchRow}>
                <Text>Está em promoção?</Text>
                <TouchableOpacity
                  onPress={() => setFieldValue('onSale', !values.onSale)}
                  style={[styles.switchButton, values.onSale ? styles.active : styles.inactive]}
                >
                  <Text style={styles.switchText}>{values.onSale ? 'Sim' : 'Não'}</Text>
                </TouchableOpacity>
              </View>

              {values.onSale && (
                    <View>
                      <Picker
                        selectedValue={values.onSalePercentage}
                        onValueChange={(itemValue) => setFieldValue('onSalePercentage', itemValue)}
                        style={styles.input}
                      >
                        <Picker.Item label="Selecione a percentagem de desconto" value="" />
                        {[10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95].map((percent) => (
                          <Picker.Item key={percent} label={`${percent}%`} value={percent} />
                        ))}
                      </Picker>
                    </View>
                  )}
                  {touched.onSalePercentage && errors.onSalePercentage && (
                    <Text style={styles.error}>{errors.onSalePercentage}</Text>
                  )}

              <View style={styles.switchRow}>
                <Text>Produto solicitado por encomenda?</Text>
                <TouchableOpacity
                  onPress={() => setFieldValue('isOrdered', !values.isOrdered)}
                  style={[styles.switchButton, values.isOrdered ? styles.active : styles.inactive]}
                >
                  <Text style={styles.switchText}>{values.isOrdered ? 'Sim' : 'Não'}</Text>
                </TouchableOpacity>
              </View>

              {values.isOrdered && (
                  <View>
                    <Picker
                      selectedValue={values.orderPeriod}
                      onValueChange={(itemValue) => setFieldValue('orderPeriod', itemValue)}
                      style={styles.input}
                    >
                      <Picker.Item label="Em quantos dias a encomenda será entregue?" value="" />
                      {[1, 2, 5, 7, 10, 15, 20, 30, 45].map((days) => (
                        <Picker.Item key={days} label={`${days} dias`} value={days} />
                      ))}
                    </Picker>
                  </View>
                )}
              {touched.orderPeriod && errors.orderPeriod && (
                <Text style={styles.error}>{errors.orderPeriod}</Text>
              )}

              <View style={styles.switchRow}>
                <Text>Tem garantia?</Text>
                <TouchableOpacity
                  onPress={() => setFieldValue('isGuaranteed', !values.isGuaranteed)}
                  style={[styles.switchButton, values.isGuaranteed ? styles.active : styles.inactive]}
                >
                  <Text style={styles.switchText}>{values.isGuaranteed ? 'Sim' : 'Não'}</Text>
                </TouchableOpacity>
              </View>

              {values.isGuaranteed && (
                        <View>
                          <Text style={styles.label}>Período de garantia (meses)</Text>
                          <Picker
                            selectedValue={values.guaranteedPeriod}
                            onValueChange={(itemValue) => setFieldValue('guaranteedPeriod', itemValue)}
                            style={styles.input}
                          >
                            <Picker.Item label="1 mês" value="1" />
                            <Picker.Item label="3 meses" value="3" />
                            <Picker.Item label="6 meses" value="6" />
                            <Picker.Item label="9 meses" value="9" />
                            <Picker.Item label="12 meses" value="12" />
                          </Picker>
                        </View>
                      )}
                      {touched.guaranteedPeriod && errors.guaranteedPeriod && (
                        <Text style={styles.error}>{errors.guaranteedPeriod}</Text>
                      )}

              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.submitButtonText}>Criar produto</Text>
              </TouchableOpacity>

              <View style={{ marginBottom: 250 }} />
            </>
          )}
        </Formik>
      ) : (
        <Text style={styles.notAccepted}>
        A sua conta ainda não está autorizada para a publicação de produtos. Para activá-la e começar a vender, entre em contato com a equipe da NHIQUELA através dos números 853600036. Estamos à disposição para ajudar! 
        </Text>
      )}
    </ScrollView>
  );
};

export default NewProduct;

const styles = StyleSheet.create({
  container: {
    paddingTop: 40,
    backgroundColor: '#fff',
    padding: 20,
  },
  notAccepted: {
    color: 'blue',
    textAlign: 'center',
    marginTop: 200,
    fontSize: 20,
    fontWeight: '500'
  },
  error: {
    color: 'red',
    marginBottom: 10,
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    borderRadius: 15,
    alignSelf: 'center',
    marginVertical: 15,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#7F00FF',
  },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  picker: {
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 10,
    borderRadius: 5,
  },
  imagePicker: {
    backgroundColor: '#7F00FF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  imagePickerText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  switchButton: {
    padding: 8,
    borderRadius: 4,
  },
  active: {
    backgroundColor: '#7F00FF',
  },
  inactive: {
    backgroundColor: '#ccc',
  },
  switchText: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#7F00FF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});