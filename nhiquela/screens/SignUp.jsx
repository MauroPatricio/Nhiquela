import { Image } from 'expo-image';
import React, { useState, useReducer } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackBtn from '../components/BackBtn';
import Button from '../components/Button';
import { Formik } from 'formik';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Yup from 'yup';
import * as ImagePicker from 'expo-image-picker';
import api from '../hooks/createConnectionApi';
import { useToast } from 'react-native-toast-notifications';

// --- Validação ---
const validationSchema = Yup.object().shape({
  name: Yup.string()
    .trim()
    .required('O nome não deve estar vazio'),

  phoneNumber: Yup.string()
    .trim()
    .required('O número de telefone é obrigatório')
    .matches(
      /^(82|83|84|85|86|87)\d{7}$/,
      'Número inválido. Deve conter 9 dígitos e começar por 8x'
    ),

  email: Yup.string()
    .trim()
    .email('Email inválido')
    .required('O email é obrigatório'),

  password: Yup.string()
    .trim()
    .min(6, 'A senha deve conter pelo menos 6 dígitos')
    .required('A senha é obrigatória'),
    
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'As senhas devem coincidir')
    .required('A confirmação da senha é obrigatória'),
});

// --- Reducer para loading e erro ---
const formReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
};

const PURPLE = '#7F00FF';

const SignUp = ({ navigation }) => {
  const [hideText, setHideText] = useState(true);
  const [hideConfirmText, setHideConfirmText] = useState(true);
  const [state, dispatch] = useReducer(formReducer, { loading: false, error: null });
  const [profileImage, setProfileImage] = useState(null);
  const [pickingImage, setPickingImage] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const toast = useToast();

  const pickProfileImage = async () => {
    try {
      setPickingImage(true);
      const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permResult.granted) {
        toast.show('Permissão negada para aceder às fotos.', { type: 'warning', placement: 'top', duration: 3000 });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });
      if (!result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0];
        const base64 = `data:image/jpeg;base64,${asset.base64}`;
        setProfileImage(base64);
      }
    } catch (e) {
      toast.show('Erro ao seleccionar imagem.', { type: 'danger', placement: 'top', duration: 3000 });
    } finally {
      setPickingImage(false);
    }
  };

  const submitRegistration = async (values) => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const payload = { ...values };
      if (profileImage) {
        payload.profileImage = profileImage;
      }
      const response = await api.post('/users/signup', payload);

      if (response.status === 200) {
        toast.show('Número registrado com sucesso!', {
          type: 'success',
          placement: 'top',
          duration: 4000,
          animationType: 'slide-in',
        });

        navigation.replace('Login');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Erro ao cadastrar';

      toast.show(errorMessage, {
        type: 'danger',
        placement: 'top',
        duration: 4000,
        animationType: 'slide-in',
      });

      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: 'white' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 80 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <SafeAreaView>
          <View>
            <BackBtn onPress={() => navigation.replace('Login')} />

            <Image source={require('../assets/nhiquela2.png')} style={styles.cover} />

            <Text style={styles.title}>Criar Conta</Text>
            <Text style={styles.subtitle}>Junte-se a nós e comece a enviar hoje mesmo.</Text>

            {/* Foto de Perfil */}
            <View style={styles.avatarSection}>
              <TouchableOpacity style={styles.avatarContainer} onPress={pickProfileImage} disabled={pickingImage}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    {pickingImage
                      ? <ActivityIndicator color={PURPLE} />
                      : <MaterialCommunityIcons name="camera-plus" size={32} color={PURPLE} />
                    }
                  </View>
                )}
                <View style={styles.avatarBadge}>
                  <MaterialCommunityIcons name="pencil" size={14} color="white" />
                </View>
              </TouchableOpacity>
              <Text style={styles.avatarLabel}>
                {profileImage ? 'Toque para alterar a foto' : 'Adicionar foto de perfil'}
              </Text>
              <Text style={styles.avatarHint}>Opcional — ajuda a identificar a sua conta</Text>
            </View>

            <Formik
              initialValues={{ phoneNumber: '', password: '', confirmPassword: '', name: '', email: '' }}
              validationSchema={validationSchema}
              onSubmit={(values) => submitRegistration(values)}
            >
              {({ handleChange, handleBlur, touched, handleSubmit, values, errors, isValid, setFieldTouched }) => (
                <View>

                  {/* Nome */}
                  <View style={styles.wrapper}>
                    <Text style={styles.label}>Nome e apelido</Text>
                    <View style={styles.inputWrapper(touched.name ? PURPLE : '#ccc')}>
                      <MaterialCommunityIcons name="face-man" size={20} color={touched.name ? PURPLE : '#9CA3AF'} style={styles.iconStyle} />
                      <TextInput
                        placeholder="Nome e apelido"
                        onFocus={() => setFieldTouched('name')}
                        style={styles.input}
                        value={values.name}
                        onChangeText={handleChange('name')}
                      />
                    </View>
                    {touched.name && errors.name && <Text style={styles.errorMessage}>{errors.name}</Text>}
                  </View>

                  {/* Telefone */}
                  <View style={styles.wrapper}>
                    <Text style={styles.label}>Número de telefone</Text>
                    <View style={styles.inputWrapper(touched.phoneNumber ? PURPLE : '#ccc')}>
                      <MaterialCommunityIcons name="phone" size={20} color={touched.phoneNumber ? PURPLE : '#9CA3AF'} style={styles.iconStyle} />
                      <TextInput
                        placeholder="Insira o número de telefone"
                        onFocus={() => setFieldTouched('phoneNumber')}
                        style={styles.input}
                        value={values.phoneNumber}
                        onChangeText={(text) => handleChange('phoneNumber')(text.replace(/\D/g, ''))}
                        maxLength={9}
                        keyboardType="numeric"
                      />
                    </View>
                    {touched.phoneNumber && errors.phoneNumber && <Text style={styles.errorMessage}>{errors.phoneNumber}</Text>}
                  </View>

                  {/* Email */}
                  <View style={styles.wrapper}>
                    <Text style={styles.label}>Email</Text>
                    <View style={styles.inputWrapper(touched.email ? PURPLE : '#ccc')}>
                      <MaterialCommunityIcons name="email" size={20} color={touched.email ? PURPLE : '#9CA3AF'} style={styles.iconStyle} />
                      <TextInput
                        placeholder="Seu email"
                        onFocus={() => setFieldTouched('email')}
                        style={styles.input}
                        value={values.email}
                        onChangeText={(text) => handleChange('email')(text.trim())}
                        autoCapitalize="none"
                        keyboardType="email-address"
                      />
                    </View>
                    {touched.email && errors.email && <Text style={styles.errorMessage}>{errors.email}</Text>}
                  </View>

                  {/* Senha */}
                  <View style={styles.wrapper}>
                    <Text style={styles.label}>Senha</Text>
                    <View style={styles.inputWrapper(touched.password ? PURPLE : '#ccc')}>
                      <MaterialCommunityIcons name="lock" size={20} color={touched.password ? PURPLE : '#9CA3AF'} style={styles.iconStyle} />
                      <TextInput
                        placeholder="Sua senha"
                        secureTextEntry={hideText}
                        onFocus={() => setFieldTouched('password')}
                        style={styles.input}
                        value={values.password}
                        onChangeText={handleChange('password')}
                      />
                      <TouchableOpacity onPress={() => setHideText(!hideText)} style={styles.eyeButton}>
                        <MaterialCommunityIcons name={hideText ? 'eye-outline' : 'eye-off-outline'} size={22} color="#666" />
                      </TouchableOpacity>
                    </View>
                    {touched.password && errors.password && <Text style={styles.errorMessage}>{errors.password}</Text>}
                  </View>

                  {/* Confirmar Senha */}
                  <View style={styles.wrapper}>
                    <Text style={styles.label}>Confirme a Senha</Text>
                    <View style={styles.inputWrapper(touched.confirmPassword ? PURPLE : '#ccc')}>
                      <MaterialCommunityIcons name="lock-check" size={20} color={touched.confirmPassword ? PURPLE : '#9CA3AF'} style={styles.iconStyle} />
                      <TextInput
                        placeholder="Sua senha novamente"
                        secureTextEntry={hideConfirmText}
                        onFocus={() => setFieldTouched('confirmPassword')}
                        style={styles.input}
                        value={values.confirmPassword}
                        onChangeText={handleChange('confirmPassword')}
                      />
                      <TouchableOpacity onPress={() => setHideConfirmText(!hideConfirmText)} style={styles.eyeButton}>
                        <MaterialCommunityIcons name={hideConfirmText ? 'eye-outline' : 'eye-off-outline'} size={22} color="#666" />
                      </TouchableOpacity>
                    </View>
                    {touched.confirmPassword && errors.confirmPassword && <Text style={styles.errorMessage}>{errors.confirmPassword}</Text>}
                  </View>

                  {/* Checkbox Termos */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                    <TouchableOpacity 
                      onPress={() => setAcceptedTerms(!acceptedTerms)}
                      style={{
                        width: 24, height: 24, borderRadius: 6, borderWidth: 2, 
                        borderColor: acceptedTerms ? '#7F00FF' : '#D1D5DB', 
                        backgroundColor: acceptedTerms ? '#7F00FF' : 'transparent', 
                        justifyContent: 'center', alignItems: 'center', marginRight: 12 
                      }}
                    >
                      {acceptedTerms && <MaterialCommunityIcons name="check" size={16} color="#FFF" />}
                    </TouchableOpacity>
                    <Text style={{ flex: 1, fontSize: 13, color: '#4B5563' }}>
                        Li e aceito os <Text style={{ color: '#7F00FF', fontWeight: 'bold' }} onPress={() => Linking.openURL('https://marketplace.nhiquelaservicos.com/terms')}>Termos e Condições</Text> e a <Text style={{ color: '#7F00FF', fontWeight: 'bold' }} onPress={() => Linking.openURL('https://marketplace.nhiquelaservicos.com/privacy-policy')}>Política de Privacidade</Text>.
                    </Text>
                  </View>

                  {/* Botão */}
                  <Button
                    title="Registar"
                    onPress={handleSubmit}
                    isValid={(isValid && acceptedTerms) ? PURPLE : 'red'}
                    loader={state.loading}
                    disabled={state.loading || !isValid || !acceptedTerms}
                  />
                </View>
              )}
            </Formik>
          </View>
        </SafeAreaView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default SignUp;

const styles = StyleSheet.create({
  cover: {
    height: 120,
    width: '100%',
    contentFit: 'contain',
    marginBottom: 5,
    backgroundColor: 'white',
    marginTop: -20,
  },
  title: {
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 28,
    marginBottom: 6,
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 18,
    lineHeight: 22,
  },
  // --- Avatar ---
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: PURPLE,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3E8FF',
    borderWidth: 2,
    borderColor: PURPLE,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PURPLE,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  avatarLabel: {
    fontSize: 14,
    color: PURPLE,
    fontWeight: '600',
    marginBottom: 2,
  },
  avatarHint: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  // --- Form ---
  wrapper: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    color: '#4B5563',
    fontWeight: '600',
  },
  inputWrapper: (borderColor) => ({
    borderColor: borderColor === '#ccc' ? '#E5E7EB' : borderColor,
    backgroundColor: borderColor === '#ccc' ? '#F9FAFB' : '#F3E8FF',
    borderWidth: 1.5,
    height: 56,
    borderRadius: 14,
    flexDirection: 'row',
    paddingHorizontal: 16,
    alignItems: 'center',
  }),
  input: {
    flex: 1,
    color: '#111827',
    fontSize: 16,
    fontWeight: '500',
  },
  iconStyle: {
    marginRight: 10,
  },
  errorMessage: {
    color: 'red',
    marginTop: 5,
    marginLeft: 5,
    fontSize: 12,
  },
  eyeButton: {
    padding: 5,
  },
});

