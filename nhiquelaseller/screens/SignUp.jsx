import { showMessage } from "react-native-flash-message";
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Image,
  SafeAreaView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import api from '../hooks/createConnectionApi';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import BackBtn from '../components/BackBtn';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import Toast from 'react-native-toast-message';
import { Picker } from '@react-native-picker/picker';
import * as Notifications from 'expo-notifications';

// Validation schema
const validationSchema = Yup.object().shape({
  name: Yup.string().trim().required('O nome é obrigatório'),
  email: Yup.string().trim().email('Email inválido').required('O email é obrigatório'),
  password: Yup.string().min(6, 'A senha deve conter no mínimo 6 dígitos').required('A senha é obrigatória'),
  phoneNumber: Yup.string()
    .trim()
    .matches(/^8[2-7][0-9]{7}$/, 'Número inválido. Deve possuir 9 dígitos.')
    .required('Número de telefone é obrigatório'),
  confirmPassword: Yup.string().oneOf([Yup.ref('password'), null], 'As senhas não coincidem').required('Confirmação é obrigatória'),
  checkedTerms: Yup.boolean().oneOf([true], 'Você deve aceitar os termos e condições'),
  seller: Yup.object().shape({
    name: Yup.string().trim().required('O nome do estabelecimento é obrigatório'),
    description: Yup.string().trim().required('A descrição do estabelecimento é obrigatória'),
    address: Yup.string().trim().required('O endereço do estabelecimento é obrigatório'),

    phoneNumberAccount: Yup.string()
      .trim()
      .matches(/^8[4-5][0-9]{7}$/, 'O telefone deve ter 9 dígitos e começar com 84 ou 85.')
      .required('Número de telefone obrigatório'),
    alternativePhoneNumberAccount: Yup.string()
      .trim()
      .matches(/^8[6-7][0-9]{7}$/, 'O telefone deve ter 9 dígitos e começar com 86 ou 87.')
      .required('Número de telefone obrigatório'),
    province: Yup.string().trim().required('A localização do estabelecimento é obrigatória'),
    tipoEstabelecimento: Yup.string().trim().required('O tipo de estabelecimento é obrigatório'),
  }),
});

const SignUp = () => {
  const navigation = useNavigation();
  const [image, setImage] = useState(null);
  const [provinces, setProvinces] = useState([]);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [tiposEstabelecimentos, setTiposEstabelecimentos] = useState([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // Fetch provinces
  useEffect(() => {
    const fetchProvinces = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('provinces');
        setProvinces(data.provinces);
      } catch (error) {
        console.error('Erro ao buscar províncias:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProvinces();
  }, []);

  // Fetch tiposEstabelecimentos
  useEffect(() => {
    const fetchTipos = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('tipoestabelecimentos');
        setTiposEstabelecimentos(data.tipoestabelecimentos);
      } catch (error) {
        console.error('Erro ao buscar tipos de estabelecimento:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTipos();
  }, []);

  // Get current location
  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Permissão de localização negada',
          text2: 'Permita o acesso à localização para continuar.',
        });
        return;
      }
      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
      Toast.show({ type: 'success', text1: 'Localização atualizada' });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Erro ao obter localização',
        text2: 'Não foi possível obter a localização.',
      });
    } finally {
      setLocationLoading(false);
    }
  };

  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Handle image picker - CORRIGIDO para evitar salto de tela
  const handleImagePicker = async (setFieldValue, setFieldTouched) => {
    try {
      // Desabilita o scroll temporariamente para evitar saltos
      setScrollEnabled(false);
      
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Permissão negada',
          text2: 'Permissão para acessar a galeria é necessária!',
        });
        setScrollEnabled(true);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (result.canceled || !result.assets?.length) {
        setScrollEnabled(true);
        return;
      }

      

      const imageUri = result.assets[0].uri;
      setImage(imageUri);
      setImageUploading(true);

      const uploadedUrl = await uploadImage(imageUri);

      if (uploadedUrl) {
        setFieldValue('seller.logo', uploadedUrl);
        setFieldTouched('seller.logo', true);
                
        Toast.show({ 
          type: 'success', 
          text1: 'Logo carregada com sucesso!' 
        });
      }
    } catch (err) {
      console.error('Erro ao escolher imagem:', err);
      Toast.show({ 
        type: 'error', 
        text1: 'Erro ao selecionar a imagem' 
      });
    } finally {
      setImageUploading(false);
      // Pequeno delay para garantir que a UI foi atualizada antes de reabilitar o scroll
      setTimeout(() => setScrollEnabled(true), 100);
    }
  };

  // Upload image - CORRIGIDO com melhor tratamento de erros
  const uploadImage = async (uri) => {
    try {
      const fileName = uri.split('/').pop();
      const fileType = fileName.split('.').pop();

      const formData = new FormData();
      formData.append('file', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name: fileName,
        type: `image/${fileType}`,
      });

      const response = await api.post('/upload', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 segundos timeout
      });

      const imageUrl = response.data?.secure_url || response.data?.url || null;
      if (!imageUrl) {
        console.warn('Backend não retornou URL:', response.data);
        throw new Error('URL da imagem não retornada pelo servidor');
      }
      
      return imageUrl;
    } catch (error) {
      console.error('Erro ao enviar imagem:', error.response?.data || error);
      Toast.show({ 
        type: 'error', 
        text1: 'Erro no upload da imagem',
        text2: 'Tente novamente com uma imagem menor'
      });
      return null;
    }
  };

  // Handle form submit - CORRIGIDO
  const handleSubmit = async (values) => {
    try {
      // 🚨 1️⃣ Validação de localização
      if (!location?.coords) {
        Toast.show({
          type: 'error',
          text1: 'Ative a localização para continuar.',
        });
        return;
      }

      // 🔧 2️⃣ Preenche coordenadas e flag de vendedor
      values.seller.latitude = location.coords.latitude;
      values.seller.longitude = location.coords.longitude;
      values.isSeller = true;
      values.seller.logo=image;

      if(!values.seller.logo){
                 showMessage({
        message: 'Erro',
        description: 'A logo do estabelecimento é obrigatória!',
        type: "danger",
        icon: "auto",
        duration: 3000,
      });
                      return;

      }

     
 

      // ⏳ 3️⃣ Mostra loader
      setLoading(true);

      // 📡 4️⃣ Envia dados para o backend
      const response = await api.post('/users/signup', values);

      // 🔔 5️⃣ Permissão de notificações
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        throw new Error('Permissão de notificações não concedida.');
      }

      // 🎉 6️⃣ Sucesso
      Toast.show({
        type: 'success',
        text1: 'Perfil criado com sucesso!',
        text2: 'Agora podes iniciar sessão na tua conta.',
      });

      navigation.navigate('Login');
    } catch (error) {

        Toast.show({
        type: 'error',
        text1: 'Conta nao registada!',
        text2: 'Sem sucesso.',
      });
      console.error('Erro no cadastro:', error.response?.data || error);

      // 🔍 7️⃣ Tenta extrair a mensagem do backend de forma inteligente
      let backendMessage = null;

      if (error.response?.data) {
        const data = error.response.data;

        if (typeof data === 'string') {
          backendMessage = data;
        } else if (Array.isArray(data?.errors)) {
          backendMessage = data.errors[0]?.msg || JSON.stringify(data.errors[0]);
        } else if (typeof data?.message === 'string') {
          backendMessage = data.message;
        } else if (typeof data?.error === 'string') {
          backendMessage = data.error;
        } else if (typeof data?.msg === 'string') {
          backendMessage = data.msg;
        } else if (typeof data === 'object') {
          backendMessage = Object.values(data).join(', ');
        }
      }

      const msg =
        backendMessage ||
        error.message ||
        'Ocorreu um erro inesperado. Verifique sua conexão e tente novamente.';

      // 🚨 8️⃣ Mostra mensagem em Toast
      Toast.show({
        type: 'error',
        text1: 'Erro ao criar conta',
        text2: msg.length > 120 ? msg.substring(0, 117) + '...' : msg,
      });
    } finally {
      // ✅ 9️⃣ Sempre fecha o loader
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: 'white' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={styles.container}>
          <ScrollView
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 50 }}
            showsVerticalScrollIndicator={false}
            scrollEnabled={scrollEnabled} // Controla o scroll para evitar saltos
          >
            <BackBtn onPress={() => navigation.goBack()} />
            <Image source={require('../assets/nhiquela2.png')} style={styles.cover} />
            <Text style={styles.title}>NOVO REGISTO</Text>

            <Formik
              initialValues={{
                name: '',
                email: '',
                password: '',
                confirmPassword: '',
                phoneNumber: '',
                seller: {
                  name: '',
                  logo: '',
                  description: '',
                  address: '',
                  phoneNumberAccount: '',
                  alternativePhoneNumberAccount: '',
                  province: '',
                  tipoEstabelecimento: '',
                },
              }}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
            >
{({ handleChange, handleBlur, handleSubmit, setFieldValue, setFieldTouched, values, errors, touched }) => (
                <>
                  {/* User info */}
                  <Text style={styles.sectionTitle}>Dados do representante</Text>
                  <Text style={styles.label}>Nome e apelido</Text>
                  <View style={styles.inputWrapper(touched.name ? '#7F00FF' : '#7F00FF')}>
                    <TextInput 
                      style={styles.input} 
                      value={values.name} 
                      onChangeText={handleChange('name')} 
                      onBlur={handleBlur('name')} 
                    />
                  </View>
                  {touched.name && errors.name && <Text style={styles.error}>{errors.name}</Text>}

                  <Text style={styles.label}>Número de telefone</Text>
                  <View style={styles.inputWrapper(touched.phoneNumber ? '#7F00FF' : '#7F00FF')}>
                    <TextInput 
                      style={styles.input} 
                      value={values.phoneNumber} 
                      onChangeText={handleChange('phoneNumber')} 
                      onBlur={handleBlur('phoneNumber')} 
                      keyboardType="numeric" 
                    />
                  </View>
                  {touched.phoneNumber && errors.phoneNumber && <Text style={styles.error}>{errors.phoneNumber}</Text>}

                  <Text style={styles.label}>Email</Text>
                  <View style={styles.inputWrapper(touched.email ? '#7F00FF' : '#7F00FF')}>
                    <TextInput 
                      style={styles.input} 
                      value={values.email} 
                      onChangeText={handleChange('email')} 
                      onBlur={handleBlur('email')} 
                      keyboardType="email-address" 
                      autoCapitalize="none"
                    />
                  </View>
                  {touched.email && errors.email && <Text style={styles.error}>{errors.email}</Text>}

                  <Text style={styles.label}>Senha</Text>
                  <View style={styles.inputWrapper(touched.password ? '#7F00FF' : '#7F00FF')}>
                    <TextInput 
                      style={styles.input} 
                      value={values.password} 
                      onChangeText={handleChange('password')} 
                      onBlur={handleBlur('password')} 
                      secureTextEntry={!showPassword} 
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                      <MaterialCommunityIcons name={showPassword ? 'eye-off' : 'eye'} size={24} color="#7F00FF" />
                    </TouchableOpacity>
                  </View>
                  {touched.password && errors.password && <Text style={styles.error}>{errors.password}</Text>}

                  <Text style={styles.label}>Confirmar Senha</Text>
                  <View style={styles.inputWrapper(touched.confirmPassword ? '#7F00FF' : '#7F00FF')}>
                    <TextInput 
                      style={styles.input} 
                      value={values.confirmPassword} 
                      onChangeText={handleChange('confirmPassword')} 
                      onBlur={handleBlur('confirmPassword')} 
                      secureTextEntry={!showConfirmPassword} 
                    />
                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                      <MaterialCommunityIcons name={showConfirmPassword ? 'eye-off' : 'eye'} size={24} color="#7F00FF" />
                    </TouchableOpacity>
                  </View>
                  {touched.confirmPassword && errors.confirmPassword && <Text style={styles.error}>{errors.confirmPassword}</Text>}

                  {/* Seller info */}
                  <Text style={styles.sectionTitle}>Detalhes do estabelecimento</Text>

                  {/* Logo do estabelecimento - CORRIGIDO */}
                  <Text style={styles.label}>Logo do estabelecimento</Text>

                  <View style={styles.imageContainer}>
                    {image ? (
                      <Image source={{ uri: image }} style={styles.logo} />
                    ) : (
                      <View style={styles.placeholderContainer}>
                        <MaterialCommunityIcons name="image-outline" size={40} color="#7F00FF" />
                        <Text style={styles.placeholderText}>Nenhuma imagem selecionada</Text>
                      </View>
                    )}
                    
                    {imageUploading && (
                      <View style={styles.uploadingOverlay}>
                        <ActivityIndicator size="large" color="#7F00FF" />
                        <Text style={styles.uploadingText}>Carregando...</Text>
                      </View>
                    )}
                  </View>

                  {errors.seller?.logo && touched.seller?.logo && (
                    <Text style={styles.error}>{errors.seller.logo}</Text>
                  )}

                  <TouchableOpacity
                    style={[styles.button, imageUploading && styles.buttonDisabled]}
                    onPress={() => handleImagePicker(setFieldValue, setFieldTouched)}
                    disabled={imageUploading}
                  >
                    {imageUploading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.buttonText}>
                        {image ? 'Alterar Logo' : 'Adicionar Logo'}
                      </Text>
                    )}
                  </TouchableOpacity>

                  <Text style={styles.label}>Nome da empresa</Text>
                  <View style={styles.inputWrapper(touched.seller?.name ? '#7F00FF' : '#7F00FF')}>
                    <TextInput 
                      style={styles.input} 
                      value={values.seller.name} 
                      onChangeText={handleChange('seller.name')} 
                      onBlur={handleBlur('seller.name')} 
                    />
                  </View>
                  {touched.seller?.name && errors.seller?.name && <Text style={styles.error}>{errors.seller?.name}</Text>}

                  <Text style={styles.label}>Descrição do estabelecimento [Especialidade]</Text>
                  <View style={styles.inputWrapper(touched.seller?.description ? '#7F00FF' : '#7F00FF')}>
                    <TextInput 
                      style={styles.input} 
                      value={values.seller.description} 
                      onChangeText={handleChange('seller.description')} 
                      onBlur={handleBlur('seller.description')} 
                    />
                  </View>
                  {touched.seller?.description && errors.seller?.description && <Text style={styles.error}>{errors.seller?.description}</Text>}

                  <Text style={styles.label}>Localização do estabelecimento</Text>
                  <View style={styles.pickerContainer}>
                    <Picker 
                      selectedValue={values.seller.province} 
                      onValueChange={(item) => setFieldValue('seller.province', item)}
                      style={styles.picker}
                    >
                      <Picker.Item label="Selecione a localização" value="" />
                      {provinces.map((province) => (
                        <Picker.Item key={province._id} label={province.name} value={province._id} />
                      ))}
                    </Picker>
                  </View>
                  {touched.seller?.province && errors.seller?.province && <Text style={styles.error}>{errors.seller?.province}</Text>}

                  <Text style={styles.label}>Endereço do estabelecimento [Rua/Av.]</Text>
                  <View style={styles.inputWrapper(touched.seller?.address ? '#7F00FF' : '#7F00FF')}>
                    <TextInput 
                      style={styles.input} 
                      value={values.seller.address} 
                      onChangeText={handleChange('seller.address')} 
                      onBlur={handleBlur('seller.address')} 
                    />
                  </View>
                  {touched.seller?.address && errors.seller?.address && <Text style={styles.error}>{errors.seller?.address}</Text>}

                  <Text style={styles.label}>Tipo de Estabelecimento</Text>
                  <View style={styles.pickerContainer}>
                    <Picker 
                      selectedValue={values.seller.tipoEstabelecimento} 
                      onValueChange={(item) => setFieldValue('seller.tipoEstabelecimento', item)} 
                      style={styles.picker}
                    >
                      <Picker.Item label="Selecione o tipo de estabelecimento" value="" />
                      {tiposEstabelecimentos.map((tipo) => (
                        <Picker.Item key={tipo._id} label={tipo.nome} value={tipo._id} />
                      ))}
                    </Picker>
                  </View>
                  {touched.seller?.tipoEstabelecimento && errors.seller?.tipoEstabelecimento && <Text style={styles.error}>{errors.seller?.tipoEstabelecimento}</Text>}

                  <Text style={styles.label}>Número de telefone da empresa para pagamentos [MPESA]</Text>
                  <View style={styles.inputWrapper(touched.seller?.phoneNumberAccount ? '#7F00FF' : '#7F00FF')}>
                    <TextInput 
                      style={styles.input} 
                      value={values.seller.phoneNumberAccount} 
                      onChangeText={handleChange('seller.phoneNumberAccount')} 
                      onBlur={handleBlur('seller.phoneNumberAccount')} 
                      keyboardType="numeric" 
                    />
                  </View>
                  {touched.seller?.phoneNumberAccount && errors.seller?.phoneNumberAccount && <Text style={styles.error}>{errors.seller?.phoneNumberAccount}</Text>}

                  <Text style={styles.label}>Número de telefone da empresa para pagamentos [EMOLA]</Text>
                  <View style={styles.inputWrapper(touched.seller?.alternativePhoneNumberAccount ? '#7F00FF' : '#7F00FF')}>
                    <TextInput 
                      style={styles.input} 
                      value={values.seller.alternativePhoneNumberAccount} 
                      onChangeText={handleChange('seller.alternativePhoneNumberAccount')} 
                      onBlur={handleBlur('seller.alternativePhoneNumberAccount')} 
                      keyboardType="numeric" 
                    />
                  </View>
                  {touched.seller?.alternativePhoneNumberAccount && errors.seller?.alternativePhoneNumberAccount && <Text style={styles.error}>{errors.seller?.alternativePhoneNumberAccount}</Text>}

                  {/* Location */}
                  <Text style={styles.label}>Localização GPS</Text>
                  <TouchableOpacity 
                    style={[styles.button, locationLoading && styles.buttonDisabled]} 
                    onPress={getCurrentLocation} 
                    disabled={locationLoading}
                  >
                    {locationLoading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.buttonText}>Atualizar Localização</Text>
                    )}
                  </TouchableOpacity>
                  {location?.coords && (
                    <Text style={styles.locationText}>
                      Latitude: {location.coords.latitude.toFixed(6)}, Longitude: {location.coords.longitude.toFixed(6)}
                    </Text>
                  )}
                  {!location?.coords && <Text style={styles.error}>Localização não disponível</Text>}

                  <TouchableOpacity 
                    style={[styles.button, loading && styles.buttonDisabled]} 
                    onPress={handleSubmit} 
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.buttonText}>Registar</Text>
                    )}
                  </TouchableOpacity>
                  <View style={{ marginBottom: 210 }} />
                </>
              )}
            </Formik>
          </ScrollView>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: 'white', 
    padding: 20 
  },
  cover: { 
    height: 120, 
    width: '100%', 
    resizeMode: 'contain', 
    marginBottom: 20 
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    color: '#7F00FF', 
    marginBottom: 20 
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '500', 
    marginTop: 15, 
    marginBottom: 10, 
    color: '#7F00FF' 
  },
  label: { 
    fontSize: 14, 
    color: '#7F00FF', 
    marginBottom: 5 
  },
  inputWrapper: (borderColor) => ({
    borderColor,
    backgroundColor: '#FFF',
    borderWidth: 1,
    height: 50,
    borderRadius: 12,
    flexDirection: 'row',
    paddingHorizontal: 15,
    alignItems: 'center',
    marginBottom: 15,
  }),
  input: { 
    flex: 1, 
    fontSize: 16, 
    color: '#333' 
  },
  error: { 
    color: 'red', 
    fontSize: 12, 
    marginBottom: 10, 
    marginLeft: 5 
  },
  // Estilos CORRIGIDOS para a imagem
  imageContainer: {
    alignItems: 'center',
    marginVertical: 15,
    position: 'relative',
  },
  logo: { 
    width: 120, 
    height: 120, 
    resizeMode: 'cover', 
    borderRadius: 12, 
    borderWidth: 2, 
    borderColor: '#7F00FF' 
  },
  placeholderContainer: {
    width: 120,
    height: 120,
    borderWidth: 2,
    borderColor: '#7F00FF',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
  },
  placeholderText: {
    color: '#7F00FF',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  uploadingText: {
    color: '#7F00FF',
    marginTop: 8,
    fontSize: 12,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#7F00FF',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
  },
  picker: { 
    backgroundColor: '#FFF',
  },
  button: { 
    backgroundColor: '#7F00FF', 
    paddingVertical: 15, 
    borderRadius: 12, 
    alignItems: 'center', 
    marginVertical: 10 
  },
  buttonText: { 
    color: '#FFF', 
    fontSize: 18, 
    fontWeight: '700' 
  },
  buttonDisabled: { 
    backgroundColor: '#A9A9A9' 
  },
  eyeIcon: { 
    padding: 10 
  },
  locationText: { 
    fontSize: 12, 
    color: '#555', 
    textAlign: 'center', 
    marginBottom: 10 
  },
});

export default SignUp;