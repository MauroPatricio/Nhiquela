import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet, Image, SafeAreaView,
  TouchableOpacity, Platform, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard,
  ActivityIndicator,
  Animated
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

// Validation schema (mantive o teu esquema original)
const validationSchema = Yup.object().shape({
  name: Yup.string()
    .trim()
    .required('O nome é obrigatório'),
  email: Yup.string()
    .trim()
    .email('Email inválido')
    .required('O email é obrigatório'),
  password: Yup.string()
    .min(6, 'A senha deve conter no mínimo 6 dígitos')
    .required('A senha é obrigatória'),
  phoneNumber: Yup.string()
    .trim()
    .matches(/^8[2-7][0-9]{7}$/, 'Número de telefone inválido. Deve começar com 82, 83, 84, 85, 86 ou 87 e ter 9 dígitos.')
    .required('Número de telefone é obrigatório'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'As senhas não coincidem')
    .required('A confirmação da senha é obrigatória'),
  checkedTerms: Yup.boolean()
    .oneOf([true], 'Você deve aceitar os termos e condições'),
  seller: Yup.object().shape({
    name: Yup.string()
      .trim()
      .required('O nome do estabelecimento é obrigatório'),
    logo: Yup.string()
      .trim()
      .required('A Logo é obrigatória'),
    description: Yup.string()
      .trim()
      .required('A descrição do estabelecimento é obrigatória'),
    address: Yup.string()
      .trim()
      .required('O endereço do estabelecimento é obrigatório'),
    phoneNumberAccount: Yup.string()
      .trim()
      .matches(/^8[4-5][0-9]{7}$/, 'O telefone deve ter 9 dígitos e começar com 84 ou 85.')
      .required('Número de telefone obrigatório'),
    alternativePhoneNumberAccount: Yup.string()
      .trim()
      .matches(/^8[6-7][0-9]{7}$/, 'O telefone deve ter 9 dígitos e começar com 86 ou 87.')
      .required('Número de telefone obrigatório'),
    province: Yup.string()
      .trim()
      .required('A localização do estabelecimento é obrigatória'),
    tipoEstabelecimento: Yup.string()
      .trim()
      .required('O tipo de estabelecimento é obrigatório'),
  }),
});

const SignUp = () => {
  const navigation = useNavigation();
  const [image, setImage] = useState(null); // URI local para pré-visualização
  const [provinces, setProvinces] = useState([]);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false); // novo estado
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [tiposEstabelecimentos, setTiposEstabelecimentos] = useState([]);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('provinces');
        setProvinces(data.provinces || []);
      } catch (error) {
        console.error('Erro ao buscar províncias:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProvinces();
  }, []);

  useEffect(() => {
    const fetchTiposEstabelecimentos = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('tipoestabelecimentos');
        setTiposEstabelecimentos(data.tipoestabelecimentos || []);
      } catch (error) {
        console.error('Erro ao buscar Tipos Estabelecimentos:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTiposEstabelecimentos();
  }, []);

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Permissão de localização negada',
          text2: 'Por favor, permita o acesso à localização para continuar.',
        });
        setLocationLoading(false);
        return;
      }
      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
      Toast.show({
        type: 'success',
        text1: 'Localização atualizada',
        text2: 'Sua localização foi atualizada com sucesso.',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Erro ao obter localização',
        text2: 'Não foi possível obter a localização atual.',
      });
    } finally {
      setLocationLoading(false);
    }
  };

  useEffect(() => {
    // tenta capturar localização assim que a página carrega (se permitido)
    getCurrentLocation();
  }, []);

  // Upload da imagem - mantém a mesma função mas com indicador de carregamento e prevenção de reflows
  const handleImagePicker = async (setFieldValue) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Permissão negada',
          text2: 'Permissão para acessar a galeria é necessária!',
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;

        // Mostra pré-visualização imediatamente (não muda layout pois espaço já está reservado)
        setImage(uri);

        // Indica que estamos a enviar
        setImageUploading(true);
        const uploadedImage = await uploadImage(uri);
        setImageUploading(false);

        if (uploadedImage) {
          // atualiza o campo do formik com a URL retornada do servidor
          setFieldValue('seller.logo', uploadedImage);
          Toast.show({
            type: 'success',
            text1: 'Logo enviada',
            text2: 'Logo carregada com sucesso.',
          });
        } else {
          // Em caso de falha no upload, remove pré-visualização para evitar inconsistências
          setImage(null);
        }
      }
    } catch (err) {
      setImageUploading(false);
      console.error('Erro no image picker:', err);
      Toast.show({
        type: 'error',
        text1: 'Erro no upload',
        text2: 'Ocorreu um erro ao selecionar a imagem.',
      });
    }
  };

  // uploadImage usando formData; retorna URL ou null
  const uploadImage = async (uri) => {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: `photo_${Date.now()}.jpg`,
        type: 'image/jpeg',
      });

      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      return data?.secure_url || null;
    } catch (error) {
      console.error('Erro ao enviar a imagem:', error);
      Toast.show({
        type: 'error',
        text1: 'Erro ao enviar a imagem',
        text2: 'Tente novamente mais tarde.',
      });
      return null;
    }
  };

  // Submissão do formulário - mantive estrutura original
  const handleSubmit = async (values) => {
    try {
      if (!location?.coords) {
        Toast.show({ type:'error', text1:'Localização indisponível', text2:'Por favor, habilite o GPS.' });
        return;
      }

      // evita submeter enquanto imagem estiver carregando
      if (imageUploading) {
        Toast.show({ type:'info', text1:'Aguarde', text2:'A imagem ainda está a ser enviada.' });
        return;
      }

      setLoading(true);
      values.seller.latitude = location.coords.latitude;
      values.seller.longitude = location.coords.longitude;
      values.isSeller = true;

      const response = await api.post('users/signup', values);

      // solicita permissões de notificação (como antes)
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Toast.show({ type: 'info', text1: 'Permissão de notificações não concedida' });
        // continua, porque não é bloqueante para criar conta (ajusta conforme tua regra)
      }

      Toast.show({
        type: 'success',
        text1: 'Perfil criado com sucesso',
        position: 'top',
      });

      navigation.navigate('Login');
    } catch (error) {
      console.error('Erro na criação do perfil:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Ocorreu um erro inesperado.';
      Toast.show({
        type: 'error',
        text1: errorMessage,
        position: 'top',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: 'white' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} // evita "jump" no Android
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={styles.container}>
          <ScrollView
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 50 }}
            showsVerticalScrollIndicator={false}
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
                  tipoEstabelecimento: ''
                },
              }}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
            >
              {({ handleChange, handleBlur, handleSubmit, setFieldValue, values, errors, touched }) => (
                <>
                  {/* Dados do representante */}
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

                  <Text style={styles.sectionTitle}>Dados de acesso</Text>

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
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeIcon}
                    >
                      <MaterialCommunityIcons
                        name={showPassword ? 'eye-off' : 'eye'}
                        size={24}
                        color="#7F00FF"
                      />
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
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={styles.eyeIcon}
                    >
                      <MaterialCommunityIcons
                        name={showConfirmPassword ? 'eye-off' : 'eye'}
                        size={24}
                        color="#7F00FF"
                      />
                    </TouchableOpacity>
                  </View>
                  {touched.confirmPassword && errors.confirmPassword && (
                    <Text style={styles.error}>{errors.confirmPassword}</Text>
                  )}

                  <Text style={styles.sectionTitle}>Detalhes do estabelecimento</Text>

                  <Text style={styles.label}>Logo do estabelecimento</Text>

                  {/* ---------- Espaço reservado fixo para evitar 'jump' ---------- */}
<View style={styles.logoContainer}>
  <Animated.View
    style={[
      styles.logoWrapper,
      { opacity: imageUploading ? 0.6 : 1 },
    ]}
  >
    {image ? (
      <Image
        source={{ uri: image }}
        style={styles.logo}
        onLoadStart={() => setImageUploading(true)}
        onLoadEnd={() => setImageUploading(false)}
      />
    ) : (
      <View style={styles.logoPlaceholder}>
        <MaterialCommunityIcons name="image-outline" size={50} color="#bbb" />
        <Text style={{ color: '#999' }}>Logo do estabelecimento</Text>
      </View>
    )}

    {imageUploading && (
      <View style={styles.logoOverlay}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    )}
  </Animated.View>
</View>

<TouchableOpacity
  style={[styles.button, imageUploading && styles.buttonDisabled]}
  onPress={() => handleImagePicker(setFieldValue)}
  disabled={imageUploading}
>
  <Text style={styles.buttonText}>
    {imageUploading ? 'Enviando logo...' : 'Adicionar Logo'}
  </Text>
</TouchableOpacity>

                  {touched.seller?.logo && errors.seller?.logo && (
                    <Text style={styles.error}>{errors.seller.logo}</Text>
                  )}

                  <Text style={styles.label}>Nome da empresa</Text>
                  <View style={styles.inputWrapper(touched.seller?.name ? '#7F00FF' : '#7F00FF')}>
                    <TextInput
                      style={styles.input}
                      value={values.seller.name}
                      onChangeText={handleChange('seller.name')}
                      onBlur={handleBlur('seller.name')}
                    />
                  </View>
                  {touched.seller?.name && errors.seller?.name && (
                    <Text style={styles.error}>{errors.seller?.name}</Text>
                  )}

                  <Text style={styles.label}>Descrição do estabelecimento [Especialidade]</Text>
                  <View style={styles.inputWrapper(touched.seller?.description ? '#7F00FF' : '#7F00FF')}>
                    <TextInput
                      style={styles.input}
                      value={values.seller.description}
                      onChangeText={handleChange('seller.description')}
                      onBlur={handleBlur('seller.description')}
                    />
                  </View>
                  {touched.seller?.description && errors.seller?.description && (
                    <Text style={styles.error}>{errors.seller?.description}</Text>
                  )}

                  <Text style={styles.label}>Localização do estabelecimento</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={values.seller.province}
                      onValueChange={(itemValue) => setFieldValue('seller.province', itemValue)}
                      style={styles.picker}
                    >
                      <Picker.Item label="Selecione a localização" value="" />
                      {provinces.map((province) => (
                        <Picker.Item key={province._id} label={province.name} value={province._id} />
                      ))}
                    </Picker>
                  </View>
                  {touched.seller?.province && errors.seller?.province && (
                    <Text style={styles.error}>{errors.seller?.province}</Text>
                  )}

                  <Text style={styles.label}>Endereço do estabelecimento [Rua/Av.]</Text>
                  <View style={styles.inputWrapper(touched.seller?.address ? '#7F00FF' : '#7F00FF')}>
                    <TextInput
                      style={styles.input}
                      value={values.seller.address}
                      onChangeText={handleChange('seller.address')}
                      onBlur={handleBlur('seller.address')}
                    />
                  </View>
                  {touched.seller?.address && errors.seller?.address && (
                    <Text style={styles.error}>{errors.seller?.address}</Text>
                  )}

                  <Text style={styles.label}>Tipo de Estabelecimento</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={values.seller.tipoEstabelecimento}
                      onValueChange={(itemValue) => setFieldValue('seller.tipoEstabelecimento', itemValue)}
                      style={styles.picker}
                    >
                      <Picker.Item label="Selecione o tipo de estabelecimento" value="" />
                      {tiposEstabelecimentos.map((tipo) => (
                        <Picker.Item key={tipo._id} label={tipo.nome} value={tipo._id} />
                      ))}
                    </Picker>
                  </View>
                  {touched.seller?.tipoEstabelecimento && errors.seller?.tipoEstabelecimento && (
                    <Text style={styles.error}>{errors.seller?.tipoEstabelecimento}</Text>
                  )}

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
                  {touched.seller?.phoneNumberAccount && errors.seller?.phoneNumberAccount && (
                    <Text style={styles.error}>{errors.seller?.phoneNumberAccount}</Text>
                  )}

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
                  {touched.seller?.alternativePhoneNumberAccount && errors.seller?.alternativePhoneNumberAccount && (
                    <Text style={styles.error}>{errors.seller?.alternativePhoneNumberAccount}</Text>
                  )}

                  <Text style={styles.label}>Localização GPS</Text>
                  <TouchableOpacity
                    style={[styles.button, locationLoading && styles.buttonDisabled]}
                    onPress={getCurrentLocation}
                    disabled={locationLoading}
                  >
                    <Text style={styles.buttonText}>
                      {locationLoading ? 'Obtendo localização...' : 'Atualizar Localização'}
                    </Text>
                  </TouchableOpacity>
                  {location?.coords ? (
                    <Text style={styles.locationText}>
                      Latitude: {location.coords.latitude.toFixed(6)}, Longitude: {location.coords.longitude.toFixed(6)}
                    </Text>
                  ) : (
                    <Text style={styles.error}>Localização não disponível</Text>
                  )}

                  <TouchableOpacity
                    style={[styles.button, (loading || imageUploading) && styles.buttonDisabled]}
                    onPress={handleSubmit}
                    disabled={loading || imageUploading}
                  >
                    <Text style={styles.buttonText}>
                      {loading ? 'Aguarde...' : 'Registar'}
                    </Text>
                  </TouchableOpacity>

                  {/* espaço para evitar que content seja encoberto pela TabBar (se houver) */}
                  <View style={{ height: 120 }} />
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
    padding: 20,
  },
  cover: {
    height: 120,
    width: '100%',
    resizeMode: 'contain',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#7F00FF',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 15,
    marginBottom: 10,
    color: '#7F00FF',
  },
  label: {
    fontSize: 14,
    color: '#7F00FF',
    marginBottom: 5,
  },
  inputWrapper: (borderColor) => ({
    borderColor: borderColor,
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
    color: '#333',
  },
  error: {
    color: 'red',
    fontSize: 12,
    marginBottom: 10,
    marginLeft: 5,
  },
  logoContainer: {
  alignSelf: 'center',
  marginVertical: 15,
  minHeight: 130, // altura mínima fixa
  maxHeight: 130, // altura máxima fixa
  justifyContent: 'center',
  alignItems: 'center',
  width: '100%',
},

logoWrapper: {
  width: 120,
  height: 120,
  borderRadius: 15,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#FAFAFA',
  borderWidth: 1,
  borderColor: '#DDD',
  overflow: 'hidden',
},

logo: {
  width: 120,
  height: 120,
  resizeMode: 'cover',
  borderRadius: 15,
},

logoPlaceholder: {
  justifyContent: 'center',
  alignItems: 'center',
  flex: 1,
},

logoOverlay: {
  position: 'absolute',
  width: 120,
  height: 120,
  borderRadius: 15,
  backgroundColor: 'rgba(0,0,0,0.45)',
  justifyContent: 'center',
  alignItems: 'center',
},

  picker: {
    height: 50,
    width: '100%',
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#7F00FF',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#7F00FF',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 10,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  buttonDisabled: {
    backgroundColor: '#A9A9A9',
  },
  eyeIcon: {
    padding: 10,
  },
  locationText: {
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
    marginBottom: 10,
  },
});

export default SignUp;
