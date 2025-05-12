import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Image,   Alert
} from 'react-native';
import { Formik } from 'formik';
import api from '../hooks/createConnectionApi';
import { Picker } from '@react-native-picker/picker';
import Toast from 'react-native-toast-message';
import * as Yup from 'yup';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';

const NewProduct = () => {

  const navigation = useNavigation()
  const [provinces, setProvinces] = useState(null);
  const [categories, setCategories] = useState(null);
const [image, setImage] = useState(null)
const [loading, setLoading] = useState(null);
const [error, setError] = useState(null);
const [errorColor, setErrorColor] = useState(null);
const [errorSize, setErrorSize] = useState(null);

const [colors, setColors] = useState(null);
const [sizes, setSizes] = useState(null);
const [selectedColors, setSelectedColors] = useState([]);
const [selectedSizes, setSelectedSizes] = useState([]);

const [userData, setUserData] = useState(null);

  const handleSubmit = async (values, resetForm) => {
    console.log('Form Values:', values);

    setLoading(true); 

    if(userData == null) return;
    try {
      if (!selectedColors) {
        setErrorColor(' Adicione as cores disponiveis do produto.');
        Toast.show({
          type: 'success',
          text1: errorColor,
          position: 'top',
          visibilityTime: 4000, // Time for how long the toast will show
          autoHide: true,
          topOffset: 30,
          bottomOffset: 40,
          style: {
              
          backgroundColor: '#4CAF50', // Green background for success
          borderLeftWidth: 10,
          borderLeftColor: '#7F00FF', // Left border accent for success
          },
          text1Style: {
          fontSize: 18,
          fontWeight: 'bold',
          color: 'red', // Text color
          
          },
        });


        return;
      }

      if (!selectedSizes) {
        setErrorSize('Adicione os tamanhos disponiveis produto.');

        Toast.show({
          type: 'success',
          text1: errorSize,
          position: 'top',
          visibilityTime: 4000, // Time for how long the toast will show
          autoHide: true,
          topOffset: 30,
          bottomOffset: 40,
          style: {
              
          backgroundColor: '#4CAF50', // Green background for success
          borderLeftWidth: 10,
          borderLeftColor: '#7F00FF', // Left border accent for success
          },
          text1Style: {
          fontSize: 18,
          fontWeight: 'bold',
          color: 'red', // Text color
          
          },
        });

        return;
      }

      values.color= selectedColors;
      values.size = selectedSizes;

      // console.log(userData.token)
       const response = await api.post('/products/', values, 
        {
          headers: { Authorization: `Bearer ${userData.token}` }
        });
        setLoading(false); // Start loading before the fetch

      if (response.status === 200) {

        Toast.show({
          type: 'success',
          text1: 'Produto criado com sucesso',
          position: 'top',
          visibilityTime: 4000, // Time for how long the toast will show
          autoHide: true,
          topOffset: 30,
          bottomOffset: 40,
          style: {
              
          backgroundColor: '#4CAF50', // Green background for success
          borderLeftWidth: 10,
          borderLeftColor: '#7F00FF', // Left border accent for success
          },
          text1Style: {
          fontSize: 18,
          fontWeight: 'bold',
          color: 'black', // Text color
          
          },
        });

        resetForm(); // Limpa o formulário após a submissão
        setSelectedColors([]);
        setSelectedSizes([]);
        setImage(null)

        navigation.navigate('ProductListSeller');

      }
    } catch (error) {
      const errorMessage = error.response?.data.error; // Acessa a mensagem de erro enviada

      console.error(errorMessage);

      alert(errorMessage);
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
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setImage(uri);
      const uploadedImage = await uploadImage(uri);
      setFieldValue('image', uploadedImage); // Update the seller's logo in Formik state
    }
  };

  const uploadImage = async (uri) => {
    const bodyFormData = new FormData();
    bodyFormData.append('file', {
      uri,
      name: 'image.jpg', // You can set the actual file name here
      type: 'image/jpeg' // Adjust the MIME type if necessary
    });

    try {
      const { data } = await api.post('upload', bodyFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setImage(data.secure_url);
      return data.secure_url; // Return the uploaded image URL
    } catch (error) {
      // console.error(error);
      Alert.alert('Erro', 'Falha ao enviar a imagem.');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); // Start loading before the fetch
      try {
        const { data } = await api.get('provinces');
        setProvinces(data.provinces); // Update the provinces state
        setLoading(false); // End loading after successful fetch
      } catch (err) {
        setError(err.message); // Set error message
        setLoading(false); // End loading even after error
      }
    };
    fetchData();
  }, []);


  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); // Start loading before the fetch
      try {
        const { data } = await api.get('categories');
        setCategories(data.categories); // Update the provinces state
        setLoading(false); // End loading after successful fetch
      } catch (err) {
        setError(err.message); // Set error message
        setLoading(false); // End loading even after error
      }
    };
    fetchData();
  }, []);


  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); // Start loading before the fetch
      try {
        const { data } = await api.get('colors');
        setColors(data.colors); // Update the provinces state
        setLoading(false); // End loading after successful fetch
      } catch (err) {
        setError(err.message); // Set error message
        setLoading(false); // End loading even after error
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); // Start loading before the fetch
      try {
        const { data } = await api.get('sizes');
        setSizes(data.sizes); // Update the provinces state
        setLoading(false); // End loading after successful fetch
      } catch (err) {
        setError(err.message); // Set error message
        setLoading(false); // End loading even after error
      }
    };
    fetchData();
  }, []);

  // Definir o esquema de validação usando Yup
  const validationSchema = Yup.object().shape({
    nome: Yup.string()
      .required('O nome é obrigatório'),
    name: Yup.string()
      .required('O nome do produto é obrigatório'),

    slug: Yup.string()
      .required('O nome abreviado do produto é obrigatório'),
    price: Yup.number()
      .typeError('O preço deve ser um número')
      .required('O preço é obrigatório'),
      image: Yup.string()
      .required('A imagem do produto é obrigatória'),
    category: Yup.string()
      .required('A categoria é obrigatória'),
    province: Yup.string()
      .required('A localização é obrigatória'),
    countInStock: Yup.number()
      .typeError('A quantidade em estoque deve ser um número')
      .required('A quantidade em estoque é obrigatória'),
    description: Yup.string()
      .required('A descrição é obrigatória'),
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


    // Function to toggle colors
    const handleColorSelect = (color) => {
      setSelectedColors((prevSelectedColors) => {
        if (prevSelectedColors.includes(color)) {
          // Remove the color
          return prevSelectedColors.filter((c) => c !== color);
        } else {
          // Add the color
          return [...prevSelectedColors, color];
        }
      });
    };

  // Function to toggle sizes
  const handleSizeSelect = (size) => {
    setSelectedSizes((prevSelectedSizes) => {
      if (prevSelectedSizes.includes(size)) {
        // Remove the size
        return prevSelectedSizes.filter((s) => s !== size);
      } else {
        // Add the size
        return [...prevSelectedSizes, size];
      }
    });
  };



  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Criar novo produto</Text>

{userData && userData.isApproved?




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
          qualityType: '',
          conditionStatus: '',
          isOrdered: false,
          orderPeriod: 0,
          isGuaranteed: false,
          guaranteedPeriod: 0,
        }}
        validationSchema={validationSchema}

        onSubmit={(values, { resetForm }) => handleSubmit(values, resetForm)}
        >
        {({ handleChange, handleBlur, handleSubmit, values, setFieldValue, touched, errors, resetForm }) => (
          <>

        
<Picker
            selectedValue={values.category || ''} // Verificação segura do campo
            onValueChange={(itemValue) => setFieldValue('category', itemValue)} // Atualizando seller.categorie
            style={styles.picker}
          >
            <Picker.Item label="Categoria" value="" />
            {categories && categories.map((categorie) => (
              <Picker.Item key={categorie._id} label={categorie.nome} value={categorie._id} />
            ))}
          </Picker>

                      {/* </View> */}
                      {touched.category && errors.category && (
                                <Text style={styles.error}>{errors.category}</Text> // Mensagem de erro
                              )}

          

          <Picker
            selectedValue={values.province || ''} // Verificação segura do campo
            onValueChange={(itemValue) => setFieldValue('province', itemValue)} // Atualizando seller.province
            style={styles.picker}
          >
            <Picker.Item label="Localização do produto" value="" />
            {provinces && provinces.map((province) => (
              <Picker.Item key={province._id} label={province.name} value={province._id} />
            ))}
          </Picker>

                    {/* </View> */}
                    {touched.province && errors.province && (
                                <Text style={styles.error}>{errors.province}</Text> // Mensagem de erro
                              )}

<Picker
  selectedValue={null} // Avoid pre-selection in multi-select scenarios
  onValueChange={(itemValue) => handleColorSelect(itemValue)}
  style={styles.picker}
>
  <Picker.Item label="Selecione a cor" value="" />
  {colors && colors.map((color) => (
    <Picker.Item key={color._id} label={color.nome} value={color} />
  ))}
</Picker>

<Text>Cores selecionadas: {selectedColors.map(color => color.nome).join(', ')}</Text>

{errorColor && <p style={{ color: 'red' }}>{errorColor}</p>}


{/* {touched.size && errors.size && (
                      <Text style={styles.error}>{errors.size}</Text> // Mensagem de erro para tamanho
                    )}  */}

<Picker
  selectedValue={null} // Avoid pre-selection in multi-select scenarios
  onValueChange={(itemValue) => handleSizeSelect(itemValue)}
  style={styles.picker}
>
  <Picker.Item label="Selecione o tamanho" value="" />
  {sizes && sizes.map((size) => (
    <Picker.Item key={size._id} label={size.nome} value={size} />
  ))}
</Picker>
<Text style={styles.size} >Tamanhos seleccionados: {selectedSizes.map(size => size.nome).join(', ')}</Text>
{errorSize && <p style={{ color: 'red' }}>{errorSize}</p>}

                    {/* {touched.size && errors.size && (
                      <Text style={styles.error}>{errors.size}</Text> // Mensagem de erro para tamanho
                    )}  */}


<>
   
        </>


            <TextInput
              style={styles.input}
              placeholder="Nome do produto (PT)"
              onChangeText={handleChange('nome')}
              onBlur={handleBlur('nome')}
              value={values.nome}
            />

            <TextInput
              style={styles.input}
              placeholder="Nome do produto (En)"
              onChangeText={handleChange('name')}
              onBlur={handleBlur('name')}
              value={values.name}
            />

            <TextInput
              style={styles.input}
              placeholder="Nome abreviado"
              onChangeText={handleChange('slug')}
              onBlur={handleBlur('slug')}
              value={values.slug}
            />

<TextInput
              style={styles.input}
              placeholder="[Detalhes do produto]"
              onChangeText={handleChange('description')}
              onBlur={handleBlur('description')}
              value={values.description}
            />

         

                         {/* Upload da Logo */}
                         {image ? (
  <Image source={{ uri: image }} style={styles.logo} />
) : (
  <Text style={{color: 'red'}}>Adicione a imagem</Text>
)}

  {/* </View> */}
  {touched.image && errors.image && (
                                <Text style={styles.error}>{errors.image}</Text> // Mensagem de erro
                              )}
      


          <TouchableOpacity
              style={styles.imagePicker}
              onPress={() => handleImagePicker(setFieldValue)}
            >
              <Text style={styles.imagePickerText}>
                {values.image ? 'Mudar Image' : 'Imagem do produto'}
              </Text>
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Preço"
              onBlur={handleBlur('price')}
              value={values.price}
              onChangeText={(text) => {
                const filteredText = text.replace(/[^0-9]/g, ''); // Permitir apenas letras e espaços
                setFieldValue('price', filteredText); // Atualiza o campo de nome com o texto filtrado
              }}
            />

            <TextInput
              style={styles.input}
              placeholder="Marca/Sabor"
              onChangeText={handleChange('brand')}
              onBlur={handleBlur('brand')}
              value={values.brand}
            />

            <TextInput
              style={styles.input}
              placeholder="Quantidade disponível"
              onBlur={handleBlur('countInStock')}
              value={values.countInStock}
              onChangeText={(text) => {
                const filteredText = text.replace(/[^0-9]/g, ''); // Permitir apenas letras e espaços
                setFieldValue('countInStock', filteredText); // Atualiza o campo de nome com o texto filtrado
              }}
            />

         

            <View style={styles.switchRow}>
              <Text>Está em promoção?</Text>
              <TouchableOpacity
                onPress={() => setFieldValue('onSale',!values.onSale)}
                style={[styles.switchButton, values.onSale ? styles.active : styles.inactive]}
              >
                <Text style={styles.switchText}>{values.onSale ? 'Sim' : 'Não'}</Text>
              </TouchableOpacity>
            </View>

            {values.onSale && (
              <TextInput
                style={styles.input}
                placeholder="Percentagem da promoção"
                onChangeText={(text) => {
                  const filteredText = text.replace(/[^0-9]/g, ''); // Permitir apenas letras e espaços
                  setFieldValue('price', filteredText); // Atualiza o campo de nome com o texto filtrado
                }}
                onBlur={handleBlur('onSalePercentage')}
                value={String(values.onSalePercentage)}
              />
            )}

                  <View style={styles.switchRow}>
                    <Text>Produto solicitado por encomenda?</Text>
                    <TouchableOpacity
                      onPress={() => setFieldValue('isOrdered', !values.isOrdered)} // Alterado para usar setFieldValue
                      style={[styles.switchButton, values.isOrdered ? styles.active : styles.inactive]}
                    >
                      <Text style={styles.switchText}>{values.isOrdered ? 'Sim' : 'Não'}</Text>
                    </TouchableOpacity>
                  </View>

                  {values.isOrdered && (
                    <TextInput
                      style={styles.input}
                      placeholder="Número de dias de entrega do produto"
                      onChangeText={(text) => {
                        const filteredText = text.replace(/[^0-9]/g, ''); // Permitir apenas letras e espaços
                        setFieldValue('orderPeriod', filteredText); // Atualiza o campo de nome com o texto filtrado
                      }}
                      onBlur={handleBlur('orderPeriod')}
                      value={values.orderPeriod}
                    />
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
              <TextInput
                style={styles.input}
                placeholder="Período de garantia (meses)"
                onChangeText={handleChange('guaranteedPeriod')}

               
                onBlur={handleBlur('guaranteedPeriod')}
                value={values.guaranteedPeriod}
              />
            )}

            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}   disabled={loading} >Criar produto</Text>
            </TouchableOpacity>

            <View style={{ marginBottom: 250 }} />
          </>
        )}
      </Formik>
      :<Text style={styles.notAccepted}> Caso deseje expor seus produtos a sua conta conta deve ser autorizada, em caso de duvidas para mais informações, por favor contacte a NHIQUELA pelo contacto 853600036.
 </Text>
}
    </ScrollView>
  );
};

export default NewProduct;

const styles = StyleSheet.create({
  container: {
    paddingTop: 40,
    backgroundColor: '#fff',
    padding:20
  },
  notAccepted:{
    color: 'red',
    alignItems: 'center',
    textAlign: 'center',
    marginTop: 200
  },

  size:{
      marginBottom: 12,
  },

  error:{
    color: 'red'
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
    color:'#7F00FF'
  },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    padding: 10,
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
  imagePreview: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 10,
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
