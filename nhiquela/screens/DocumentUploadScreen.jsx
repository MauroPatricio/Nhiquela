import { StyleSheet, Text, View, TouchableOpacity, Image, Alert, ScrollView, ActivityIndicator } from 'react-native';
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import api from '../hooks/createConnectionApi';
import { useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DocumentUploadScreen = () => {
  const navigation = useNavigation();
  const [serviceType, setServiceType] = useState('prescription'); // 'prescription' or 'shopping_list'
  const [documentUri, setDocumentUri] = useState(null);
  const [documentType, setDocumentType] = useState(null);
  const [documentName, setDocumentName] = useState(null);
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // You can fetch the preferred establishment if they started from a specific seller
  // For now, it will be global auto-assign

  useEffect(() => {
    fetchFees();
  }, [serviceType]);

  const fetchFees = async () => {
    try {
      setLoading(true);
      const storedUserData = await AsyncStorage.getItem('userData');
      let token = '';
      if (storedUserData) {
        const parsed = JSON.parse(storedUserData);
        token = parsed.token;
      }
      const res = await api.get('/processing-fees', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const applicableFees = res.data.filter(f => f.serviceType === serviceType && f.isActive);
      setFees(applicableFees);
    } catch (err) {
      console.log('Erro ao buscar taxas:', err);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão Negada', 'Precisamos de acesso à sua galeria.');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled) {
      setDocumentUri(result.assets[0].uri);
      setDocumentType('image/jpeg');
      setDocumentName('upload.jpg');
    }
  };

  const pickDocument = async () => {
    let result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setDocumentUri(result.assets[0].uri);
      setDocumentType(result.assets[0].mimeType);
      setDocumentName(result.assets[0].name);
    }
  };

  const handleSubmit = async () => {
    if (!documentUri) {
      Alert.alert('Erro', 'Por favor, anexe uma imagem ou PDF do seu documento.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: documentUri,
        type: documentType,
        name: documentName,
      });
      formData.append('serviceType', serviceType);
      formData.append('autoAssignEstablishment', 'true');

      // Exibir aviso de taxa e pedir confirmação? O backend já salva e cria a taxa. 
      // Mas o user tem de aceitar. Apenas mostramos na UI e assumimos que submeter = aceitar.
      
      const storedUserData = await AsyncStorage.getItem('userData');
      let token = '';
      if (storedUserData) {
        const parsed = JSON.parse(storedUserData);
        token = parsed.token;
      }

      const response = await api.post('/document-order', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        },
      });

      if (response.status === 201) {
        Alert.alert('Sucesso', 'O seu documento foi enviado! Iremos analisá-lo e enviar-lhe-emos o orçamento para aprovação.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.log(error);
      Alert.alert('Erro', 'Ocorreu um erro ao enviar o documento.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pedido por Documento</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>O que pretende enviar?</Text>
        <View style={styles.serviceTabs}>
          <TouchableOpacity 
            style={[styles.tab, serviceType === 'prescription' && styles.tabActive]}
            onPress={() => setServiceType('prescription')}
          >
            <Ionicons name="medical" size={20} color={serviceType === 'prescription' ? '#FFF' : '#6B7280'} />
            <Text style={[styles.tabText, serviceType === 'prescription' && styles.tabTextActive]}>Receita Médica</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, serviceType === 'shopping_list' && styles.tabActive]}
            onPress={() => setServiceType('shopping_list')}
          >
            <Ionicons name="list" size={20} color={serviceType === 'shopping_list' ? '#FFF' : '#6B7280'} />
            <Text style={[styles.tabText, serviceType === 'shopping_list' && styles.tabTextActive]}>Lista de Compras</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.uploadSection}>
          {documentUri ? (
            <View style={styles.documentPreview}>
              {documentType?.includes('image') ? (
                <Image source={{ uri: documentUri }} style={styles.previewImage} />
              ) : (
                <View style={styles.pdfPreview}>
                  <Ionicons name="document-text" size={60} color="#9CA3AF" />
                  <Text style={styles.pdfText}>{documentName}</Text>
                </View>
              )}
              <TouchableOpacity style={styles.removeButton} onPress={() => setDocumentUri(null)}>
                <Ionicons name="close-circle" size={30} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.uploadButtons}>
              <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
                <Ionicons name="camera-outline" size={40} color="#9333EA" />
                <Text style={styles.uploadBtnText}>Tirar/Anexar Foto</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.uploadBtn} onPress={pickDocument}>
                <Ionicons name="document-attach-outline" size={40} color="#9333EA" />
                <Text style={styles.uploadBtnText}>Anexar PDF</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#3B82F6" style={{ marginTop: 2 }} />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Como Funciona?</Text>
            <Text style={styles.infoText}>1. Envie a sua receita ou lista.</Text>
            <Text style={styles.infoText}>2. A nossa equipa verifica a disponibilidade e os preços nas lojas parceiras.</Text>
            <Text style={styles.infoText}>3. Recebe um carrinho com os produtos exatos para aprovar e pagar.</Text>
            <Text style={styles.infoText}>4. Um Personal Shopper fará as compras e entregará na sua porta.</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color="#9333EA" style={{ marginTop: 20 }} />
        ) : (
          fees.length > 0 && (
            <View style={styles.feeCard}>
              <Text style={styles.feeTitle}>Taxa de Processamento (Aproximada)</Text>
              {fees.map((f, i) => (
                <Text key={i} style={styles.feeText}>
                  {f.amount > 0 ? `${f.amount.toFixed(2)} MT` : ''}
                  {f.amount > 0 && f.percentage > 0 ? ' + ' : ''}
                  {f.percentage > 0 ? `${f.percentage}% do valor da compra` : ''}
                </Text>
              ))}
              <Text style={styles.feeDisclaimer}>Este valor só será cobrado se aprovar o orçamento final.</Text>
            </View>
          )
        )}

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.submitButton, (!documentUri || submitting) && styles.submitButtonDisabled]} 
          onPress={handleSubmit}
          disabled={!documentUri || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Enviar para Análise</Text>
              <Ionicons name="send" size={20} color="#FFF" style={{ marginLeft: 10 }} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default DocumentUploadScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 12,
  },
  serviceTabs: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#9333EA',
  },
  tabText: {
    marginLeft: 8,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFF',
  },
  uploadSection: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    minHeight: 200,
    justifyContent: 'center',
  },
  uploadButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  uploadBtn: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F3E8FF',
    borderRadius: 16,
    width: '45%',
  },
  uploadBtnText: {
    marginTop: 10,
    color: '#9333EA',
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 13,
  },
  documentPreview: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  pdfPreview: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    width: '100%',
  },
  pdfText: {
    marginTop: 12,
    color: '#4B5563',
    fontWeight: '500',
    textAlign: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: -15,
    right: -15,
    backgroundColor: '#FFF',
    borderRadius: 15,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  infoTitle: {
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 8,
  },
  infoText: {
    color: '#1E3A8A',
    fontSize: 13,
    marginBottom: 4,
    lineHeight: 18,
  },
  feeCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  feeTitle: {
    fontWeight: '700',
    color: '#D97706',
    marginBottom: 4,
  },
  feeText: {
    color: '#4B5563',
    fontWeight: '600',
    fontSize: 16,
  },
  feeDisclaimer: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 6,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  submitButton: {
    backgroundColor: '#9333EA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  submitButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
