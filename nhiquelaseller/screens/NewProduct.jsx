import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Image, Alert, RefreshControl } from 'react-native';
import { Formik } from 'formik';
import api from '../hooks/createConnectionApi';
import { Picker } from '@react-native-picker/picker';
import Toast from 'react-native-toast-message';
import * as Yup from 'yup';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
// import io from 'socket.io-client';

const validationSchema = Yup.object().shape({
  nome: Yup.string().required('Nome do produto (PT) é obrigatório'),
  name: Yup.string().required('Nome do produto (EN) é obrigatório'),
  image: Yup.string().required('A imagem do produto é obrigatória'),
  price: Yup.number().required('Preço é obrigatório'),
  category: Yup.string().required('Categoria é obrigatória'),
  province: Yup.string().required('Localização do produto é obrigatória'),
  brand: Yup.string().required('Marca/Sabor é obrigatória'),
  countInStock: Yup.number().required('Quantidade disponível é obrigatória'),
});

const NewProduct = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [editingProduct, setEditingProduct] = useState(null);
  const [provinces, setProvinces] = useState(null);
  const [categories, setCategories] = useState(null);
  const [image, setImage] = useState(null);
  const [errorColor, setErrorColor] = useState(null);
  const [errorSize, setErrorSize] = useState(null);
  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [userData, setUserData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socket, setSocket] = useState(null);

  // Estados locais para os campos do formulário
  const [name, setName] = useState('');
  const [nome, setNome] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [province, setProvince] = useState('');
  const [brand, setBrand] = useState('');
  const [description, setDescription] = useState('');
  const [countInStock, setCountInStock] = useState('');

  // Configuração do Socket.io
  // useEffect(() => {
  //   const newSocket = io(process.env.API_URL); // Substitua pela sua URL do backend
  //   setSocket(newSocket);

  //   return () => {
  //     newSocket.disconnect();
  //   };
  // }, []);

  // Listener para atualizações de produtos via Socket.io
  useEffect(() => {
    if (!socket) return;

    const handleProductUpdate = (updatedProduct) => {
      if (editingProduct && updatedProduct._id === editingProduct._id) {
        setEditingProduct(updatedProduct);
        Toast.show({
          type: 'success',
          text1: 'Produto atualizado em tempo real',
          position: 'top',
          visibilityTime: 2000
        });
      }
    };

    socket.on('newProduct', handleProductUpdate);

    return () => {
      socket.off('newProduct', handleProductUpdate);
    };
  }, [socket, editingProduct]);

  // Carrega o userData do AsyncStorage
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('userData');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUserData(parsedUser);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
      }
    };
    loadUserData();
  }, []);

  // Atualiza estados locais quando editingProduct muda
  useEffect(() => {
    if (editingProduct) {
      setNome(editingProduct.nome || '');
      setName(editingProduct.name || '');
      setPrice(editingProduct.price?.toString() || '');
      setCategory(editingProduct.category?._id || '');
      setProvince(editingProduct.province?._id || '');
      setBrand(editingProduct.brand || '');
      setDescription(editingProduct.description || '');
      setCountInStock(editingProduct.countInStock?.toString() || '');
      setImage(editingProduct.image || null);
      setSelectedColors(editingProduct.color || []);
      setSelectedSizes(editingProduct.size || []);
    }
  }, [editingProduct]);

  // Carrega o produto para edição quando recebido via rota
  useEffect(() => {
    const productToEdit = route.params?.productToEdit;
    if (productToEdit) {
      setEditingProduct(productToEdit);
    } else {
      // Modo criação: limpar tudo
      setEditingProduct(null);
      setSelectedColors([]);
      setSelectedSizes([]);
      setImage(null);
      setNome('');
      setName('');
      setPrice('');
      setCategory('');
      setProvince('');
      setBrand('');
      setDescription('');
      setCountInStock('');
    }
  }, [route.params]);

  // Carrega os dados iniciais
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      await Promise.all([
        loadCategories(),
        loadProvinces(),
        loadColors(),
        loadSizes(),
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const { data } = await api.get('/categories');
      setCategories(data.categories);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const loadProvinces = async () => {
    try {
      const { data } = await api.get('/provinces');
      setProvinces(data.provinces);
    } catch (error) {
      console.error('Erro ao carregar províncias:', error);
    }
  };

  const loadColors = async () => {
    try {
      const { data } = await api.get('/colors');
      setColors(data.colors);
    } catch (error) {
      console.error('Erro ao carregar cores:', error);
    }
  };

  const loadSizes = async () => {
    try {
      const { data } = await api.get('/sizes');
      setSizes(data.sizes);
    } catch (error) {
      console.error('Erro ao carregar tamanhos:', error);
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

  const handleColorSelect = (item) => {
    if (item && !selectedColors.find(c => c._id === item._id)) {
      setSelectedColors(prev => [...prev, item]);
      setErrorColor(null);
    }
  };

  const handleSizeSelect = (item) => {
    if (item && !selectedSizes.find(s => s._id === item._id)) {
      setSelectedSizes(prev => [...prev, item]);
      setErrorSize(null);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadInitialData();
    } catch (error) {
      console.error('Erro ao atualizar:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSubmit = async (values, { resetForm }) => {
    if (!userData) return;

    setIsSubmitting(true);
    try {
      if (selectedColors.length === 0) {
        setErrorColor('Adicione as cores disponíveis do produto.');
        Toast.show({ type: 'error', text1: 'Adicione as cores disponíveis do produto.', position: 'top' });
        return;
      }

      if (selectedSizes.length === 0) {
        setErrorSize('Adicione os tamanhos disponíveis do produto.');
        Toast.show({ type: 'error', text1: 'Adicione os tamanhos disponíveis do produto', position: 'top' });
        return;
      }

      values.color = selectedColors;
      values.size = selectedSizes;

      let response;
      if (editingProduct) {
        response = await api.put(`products/${editingProduct._id}`, values, {
          headers: { Authorization: `Bearer ${userData.token}` },
        });
        
        // Atualiza o estado com os dados retornados
        setEditingProduct(response.data.product);
        navigation.navigate('ProductListSeller');

        Toast.show({ 
          type: 'success', 
          text1: 'SUCESSO', 
          text2: 'Produto atualizado com sucesso!',
          position: 'top',
          visibilityTime: 2000
        });
      } else {
        response = await api.post('products/', values, {
          headers: { Authorization: `Bearer ${userData.token}` },
        });
        
        Toast.show({ 
          type: 'success', 
          text1: 'SUCESSO', 
          text2: 'Produto criado com sucesso!', 
          position: 'top',
          visibilityTime: 2000
        });
        resetForm();
        setSelectedColors([]);
        setSelectedSizes([]);
        setImage(null);
        navigation.navigate('ProductListSeller');
      }
    } catch (error) {
      const errorMessage = error.response?.data.error || 'Erro ao salvar o produto.';
      Toast.show({ 
        type: 'error', 
        text1: 'Erro', 
        text2: errorMessage, 
        position: 'top',
        visibilityTime: 3000
      });
    } finally {
      setIsSubmitting(false);
    }
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
      <Text style={styles.title}>
        {editingProduct ? 'Editar Produto' : 'Criar novo produto'}
      </Text>

      {userData && userData?.isApproved ? (
        <Formik
          enableReinitialize
          initialValues={{
            nome: nome,
            name: name,
            image: image || '',
            price: price,
            category: category,
            province: province,
            brand: brand,
            countInStock: countInStock,
            description: description,
            onSale: editingProduct?.onSale || false,
            onSalePercentage: editingProduct?.onSalePercentage || 0,
            color: selectedColors,
            size: selectedSizes,
            orderPeriod: editingProduct?.orderPeriod || 0,
            isGuaranteed: editingProduct?.isGuaranteed || false,
            guaranteedPeriod: editingProduct?.guaranteedPeriod || 0,
            isOrdered: editingProduct?.isOrdered || false,
          }}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ handleChange, handleBlur, handleSubmit, values, setFieldValue, touched, errors }) => (
            <>
              <Picker
                selectedValue={values.category || ''}
                onValueChange={(itemValue) => {
                  setFieldValue('category', itemValue);
                  setCategory(itemValue);
                }}
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
                onValueChange={(itemValue) => {
                  setFieldValue('province', itemValue);
                  setProvince(itemValue);
                }}
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
                onChangeText={(text) => {
                  handleChange('nome')(text);
                  setNome(text);
                }}
                onBlur={handleBlur('nome')}
                value={values.nome}
              />
              {touched.nome && errors.nome && <Text style={styles.error}>{errors.nome}</Text>}

              <TextInput
                style={styles.input}
                placeholder="Nome do produto (En)"
                onChangeText={(text) => {
                  handleChange('name')(text);
                  setName(text);
                }}
                onBlur={handleBlur('name')}
                value={values.name}
              />
              {touched.name && errors.name && <Text style={styles.error}>{errors.name}</Text>}

         

              <TextInput
                style={styles.input}
                placeholder="Descrição do produto"
                onChangeText={(text) => {
                  handleChange('description')(text);
                  setDescription(text);
                }}
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
                  handleChange('price')(filteredText);
                  setPrice(filteredText);
                }}
                onBlur={handleBlur('price')}
                value={values.price}
                keyboardType="numeric"
              />
              {touched.price && errors.price && <Text style={styles.error}>{errors.price}</Text>}

              <TextInput
                style={styles.input}
                placeholder="Marca/Sabor"
                onChangeText={(text) => {
                  handleChange('brand')(text);
                  setBrand(text);
                }}
                onBlur={handleBlur('brand')}
                value={values.brand}
              />
              {touched.brand && errors.brand && <Text style={styles.error}>{errors.brand}</Text>}

              <TextInput
                style={styles.input}
                placeholder="Quantidade disponível"
                onChangeText={(text) => {
                  const filteredText = text.replace(/[^0-9]/g, '');
                  handleChange('countInStock')(filteredText);
                  setCountInStock(filteredText);
                }}
                onBlur={handleBlur('countInStock')}
                value={values.countInStock}
                keyboardType="numeric"
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

              <TouchableOpacity 
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} 
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? 'Processando...' : editingProduct ? 'Atualizar Produto' : 'Criar Produto'}
                </Text>
              </TouchableOpacity>

              <View style={{ marginBottom: 250 }} />
            </>
          )}
        </Formik>
      ) : (
        <View style={styles.notAccepted}>
          <Text style={styles.notAcceptedTitle}>Sua conta está em análise!</Text>
          
          <Text style={styles.notAcceptedText}>
            Para começar a publicar seus produtos e vender na NHIQUELA, precisamos finalizar a ativação da sua conta.
          </Text>

          <Text style={styles.notAcceptedContact}>
            Entre em contato conosco pelo <Text style={styles.notAcceptedHighlight}>WhatsApp: 85 3600036</Text>
          </Text>
          
          <Text style={styles.notAcceptedContact}> ou pelo email:
            <Text style={styles.notAcceptedHighlight}>nhiquelaservicosconsultoria@gmail.com</Text>
          </Text>

          <Text style={styles.notAcceptedText}>
            Nossa equipe está pronta para ajudar você a começar suas vendas o mais rápido possível!
          </Text>

          <Text style={styles.notAcceptedFooter}>
            Agradecemos sua paciência e interesse em fazer parte da nossa plataforma.
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

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
    fontSize: 16,
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
  submitButtonDisabled: {
    backgroundColor: '#CC99FF',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  notAccepted: {
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 12,
    margin: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#7F00FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notAcceptedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 12,
    textAlign: 'center',
  },
  notAcceptedText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4A5568',
    marginBottom: 8,
  },
  notAcceptedContact: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3748',
    marginTop: 12,
    marginBottom: 4,
  },
  notAcceptedHighlight: {
    color: '#7F00FF',
    fontWeight: '600',
  },
  notAcceptedFooter: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#718096',
    marginTop: 16,
    textAlign: 'center',
  },
  label: {
    marginBottom: 8,
    fontWeight: '600',
    color: '#4A5568',
  }
});

export default NewProduct;