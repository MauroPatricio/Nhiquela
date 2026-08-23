import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../hooks/createConnectionApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';

const COLORS = {
  primary: '#7F00FF',
  background: '#F3F4F6',
  surface: '#FFFFFF',
  surface2: '#F9FAFB',
  surfaceCard: '#FFFFFF',
  text: '#1F2937',
  textSecondary: '#4B5563',
  borderLight: '#E5E7EB',
};

const OrderChat = ({ route, navigation }) => {
  const { orderId } = route.params;
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const flatListRef = useRef();
  const socketRef = useRef(null);

  useEffect(() => {
    loadUserAndMessages();

    // Initialize socket
    socketRef.current = io(api.defaults.baseURL.replace('/api', ''));
    socketRef.current.emit('joinOrderRoom', orderId);

    socketRef.current.on('newOrderMessage', (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  const loadUserAndMessages = async () => {
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        const parsedUser = JSON.parse(storedUserData);
        setUserData(parsedUser);
        
        const response = await api.get(`/order-chats/${orderId}`, {
          headers: { Authorization: `Bearer ${parsedUser.token}` }
        });
        setMessages(response.data.messages || []);
      }
    } catch (error) {
      console.error('Error loading chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !userData) return;
    const textToSend = inputText.trim();
    setInputText('');

    try {
      await api.post(`/order-chats/${orderId}/messages`, {
        message: textToSend,
        senderType: 'client'
      }, {
        headers: { Authorization: `Bearer ${userData.token}` }
      });
      // The socket event will append the message to the list
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUploadingImage(true);
        const asset = result.assets[0];
        
        const formData = new FormData();
        formData.append('file', {
          uri: asset.uri,
          name: asset.fileName || 'chat_img.jpg',
          type: asset.mimeType || 'image/jpeg',
        });

        const uploadRes = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (uploadRes.data && uploadRes.data.secure_url) {
          await api.post(`/order-chats/${orderId}/messages`, {
            message: '',
            fileUrl: uploadRes.data.secure_url,
            fileType: 'image',
            senderType: 'client'
          }, {
            headers: { Authorization: `Bearer ${userData.token}` }
          });
        }
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setUploadingImage(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isMyMessage = item.senderId?._id === userData?._id;
    const isAdmin = item.senderType === 'admin';
    const isSeller = item.senderType === 'seller';

    let senderRole = 'Cliente';
    if (isAdmin) senderRole = 'Suporte';
    else if (isSeller) senderRole = 'Vendedor';

    return (
      <View style={[styles.messageBubble, isMyMessage ? styles.myMessage : styles.otherMessage]}>
        {!isMyMessage && (
          <Text style={styles.senderName}>{item.senderId?.name || 'Sistema'} ({senderRole})</Text>
        )}
        {item.fileUrl && item.fileType === 'image' && (
          <Image 
            source={{ uri: item.fileUrl }} 
            style={{ width: 200, height: 200, borderRadius: 8, marginBottom: 5 }} 
            contentFit="cover" 
          />
        )}
        {item.message ? (
          <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>
            {item.message}
          </Text>
        ) : null}
        <Text style={styles.timestamp}>
          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat do Pedido</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Chat Area */}
      <KeyboardAvoidingView 
        style={styles.chatArea} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item._id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TouchableOpacity onPress={pickImage} disabled={uploadingImage} style={{ marginRight: 10 }}>
            {uploadingImage ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Ionicons name="image-outline" size={24} color={COLORS.primary} />
            )}
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Digite uma mensagem..."
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  chatArea: { flex: 1 },
  messageList: { padding: 16 },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 0,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surfaceCard,
    borderBottomLeftRadius: 0,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  senderName: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 4 },
  messageText: { fontSize: 14 },
  myMessageText: { color: '#fff' },
  otherMessageText: { color: COLORS.text },
  timestamp: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surface2,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    maxHeight: 100,
    minHeight: 45,
  },
  sendBtn: {
    backgroundColor: COLORS.primary,
    width: 45,
    height: 45,
    borderRadius: 22.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
});

export default OrderChat;
