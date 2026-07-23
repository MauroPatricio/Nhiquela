import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
  LayoutAnimation,
  UIManager
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, useNavigation } from '@react-navigation/native';
import io from 'socket.io-client';
import api from '../hooks/createConnectionApi';
import * as ImagePicker from 'expo-image-picker';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL
  ? process.env.EXPO_PUBLIC_API_URL.replace('/api', '')
  : 'http://192.168.0.2:5000';

// Regex de contactos — para bloquear partilha de números/emails
const CONTACT_PATTERN = /(\+?\d[\d\s\-().]{7,}\d)|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

const sanitizeMessage = (text) => {
  if (CONTACT_PATTERN.test(text)) {
    Alert.alert(
      'Não permitido',
      'Por razões de segurança, não é possível partilhar contactos neste chat.'
    );
    return null;
  }
  return text.trim();
};

export default function TripChatScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { tripId, tripRef, isActive } = route.params || {};

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isChatActive, setIsChatActive] = useState(isActive !== false);
  const [userData, setUserData] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const socketRef = useRef(null);
  const flatListRef = useRef(null);

  // Configurar título do header
  useEffect(() => {
    navigation.setOptions({
      title: tripRef ? `Chat — ${tripRef}` : 'Chat da Viagem',
      headerBackTitle: 'Voltar',
    });
  }, [tripRef]);

  // Carregar dados do utilizador
  useEffect(() => {
    const loadUser = async () => {
      const userDataStr = await AsyncStorage.getItem('userData');
      if (userDataStr) setUserData(JSON.parse(userDataStr));
    };
    loadUser();
  }, []);

  // Carregar histórico + conectar socket
  useEffect(() => {
    if (!tripId) return;

    fetchChat();

    const setupSocket = async () => {
      const userDataStr = await AsyncStorage.getItem('userData');
      const token = userDataStr ? JSON.parse(userDataStr)?.token : null;
      if (!token) return;

      const socket = io(BASE_URL, {
        auth: { token },
        transports: ['websocket'],
      });

      socket.emit('join_trip_chat', { tripId });

      socket.on('receive_trip_message', (message) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setMessages((prev) => [...prev, message]);
        // Se a mensagem não é minha, marcar como lida e emitir read
        if (userDataStr) {
           const parsedUser = JSON.parse(userDataStr);
           const myId = parsedUser?._id || parsedUser?.id;
           if (message.senderId !== myId) {
              socket.emit('mark_read_trip_chat', { tripId, userId: myId });
           }
        }
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      });

      socket.on('user_typing_trip_chat', (data) => {
         setIsTyping(true);
      });

      socket.on('user_stop_typing_trip_chat', (data) => {
         setIsTyping(false);
      });

      socket.on('messages_read_trip_chat', (data) => {
         setMessages((prev) => prev.map(m => {
            if (m.senderId === data.readBy || m.senderId?._id === data.readBy) return m; // As deles continuam iguais
            return { ...m, status: 'read' }; // As minhas ficam lidas
         }));
      });

      socketRef.current = socket;
      
      // Quando abrir o chat, marcar tudo como lido
      const parsedUser = userDataStr ? JSON.parse(userDataStr) : null;
      const myId = parsedUser?._id || parsedUser?.id;
      if (myId) {
         socket.emit('mark_read_trip_chat', { tripId, userId: myId });
      }
    };

    setupSocket();

    return () => {
      socketRef.current?.disconnect();
    };
  }, [tripId]);

  const fetchChat = async () => {
    try {
      const { data } = await api.get(`/trip-chat/${tripId}`);
      if (data) {
        if (data.messages) setMessages(data.messages);
        if (data.isActive !== undefined) setIsChatActive(data.isActive);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 200);
      }
    } catch (error) {
      console.error('Erro ao carregar chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    const sanitized = sanitizeMessage(newMessage);
    if (!sanitized) return;

    try {
      if (socketRef.current) {
        socketRef.current.emit('stop_typing_trip_chat', { tripId, senderId: userData?._id || userData?.id });
      }
      await api.post(`/trip-chat/${tripId}/message`, { message: sanitized });
      setNewMessage('');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível enviar a mensagem.');
    }
  };

  const handleTyping = (text) => {
    setNewMessage(text);
    if (!socketRef.current) return;
    
    const myId = userData?._id || userData?.id;
    socketRef.current.emit('typing_trip_chat', { tripId, senderId: myId });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
       socketRef.current.emit('stop_typing_trip_chat', { tripId, senderId: myId });
    }, 2000);
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      uploadAndSendMessage(result.assets[0]);
    }
  };

  const uploadAndSendMessage = async (asset) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        name: `chat_img_${Date.now()}.jpg`,
        type: 'image/jpeg',
      });
      formData.append('type', 'client');

      const uploadRes = await api.post('/upload/local', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const fileUrl = uploadRes.data.secure_url;
      
      await api.post(`/trip-chat/${tripId}/message`, { 
        message: '', 
        fileUrl, 
        fileType: 'image' 
      });
      
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível enviar a imagem.');
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = useCallback(({ item }) => {
    const myId = userData?._id || userData?.id;
    const isMe = item.senderId === myId || item.senderId?._id === myId;
    const isAdmin = item.senderType === 'admin';

    return (
      <View style={[styles.messageRow, isMe ? styles.myRow : styles.theirRow]}>
        {!isMe && (
          <View style={[styles.avatar, isAdmin && styles.adminAvatar]}>
            <Text style={styles.avatarText}>{isAdmin ? 'S' : 'M'}</Text>
          </View>
        )}
        <View style={[styles.bubble, isMe ? styles.myBubble : isAdmin ? styles.adminBubble : styles.theirBubble]}>
          {!isMe && (
            <Text style={[styles.senderLabel, isAdmin && styles.adminLabel]}>
              {isAdmin ? 'Suporte Nhiquela' : 'Motorista'}
            </Text>
          )}
          {item.fileUrl && item.fileType === 'image' && (
            <Image source={{ uri: item.fileUrl }} style={{ width: 180, height: 180, borderRadius: 8, marginBottom: 5 }} resizeMode="cover" />
          )}
          {!!item.message && <Text style={[styles.messageText, isMe && styles.myMessageText]}>{item.message}</Text>}
          <View style={styles.timeRow}>
            <Text style={[styles.timeText, isMe && styles.myTimeText]}>
              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {isMe && (
              <Ionicons 
                name={item.status === 'read' ? 'checkmark-done' : 'checkmark'} 
                size={14} 
                color={item.status === 'read' ? '#60A5FA' : '#E5E7EB'} 
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
        </View>
      </View>
    );
  }, [userData]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80}
      >
      {/* Aviso de segurança */}
      <View style={styles.securityBanner}>
        <Ionicons name="shield-checkmark" size={14} color="#6B7280" />
        <Text style={styles.securityText}>
          Chat seguro — contactos protegidos. Histórico disponível após a viagem.
        </Text>
      </View>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(_, idx) => idx.toString()}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={() => (
           isTyping ? (
             <View style={styles.typingIndicator}>
                <ActivityIndicator size="small" color="#7F00FF" />
                <Text style={styles.typingText}>Motorista a escrever...</Text>
             </View>
           ) : null
        )}
        ListEmptyComponent={
          loading ? (
            <Text style={styles.emptyText}>A carregar...</Text>
          ) : (
            <Text style={styles.emptyText}>Sem mensagens ainda. Inicie a conversa!</Text>
          )
        }
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {loading && <ActivityIndicator size="small" color="#7F00FF" style={{ padding: 10 }} />}
        
        {isChatActive ? (
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.attachBtn} onPress={handlePickImage} disabled={loading}>
              <Ionicons name="camera-outline" size={24} color="#6B7280" />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Escreva uma mensagem..."
              placeholderTextColor="#9CA3AF"
              value={newMessage}
              onChangeText={handleTyping}
              multiline
              maxLength={500}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={!newMessage.trim() && !loading}>
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.closedBanner}>
            <Ionicons name="lock-closed" size={16} color="#6B7280" />
            <Text style={styles.closedText}>A viagem terminou. Pode consultar o histórico acima.</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  securityText: { fontSize: 11, color: '#6B7280', flex: 1 },
  messageList: { padding: 16, paddingBottom: 8 },
  messageRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  myRow: { justifyContent: 'flex-end' },
  theirRow: { justifyContent: 'flex-start' },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  adminAvatar: { backgroundColor: '#7F00FF22' },
  avatarText: { fontSize: 12, fontWeight: 'bold', color: '#374151' },
  bubble: { maxWidth: '75%', padding: 12, borderRadius: 18 },
  myBubble: { backgroundColor: '#7F00FF', borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: '#fff', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 1 },
  adminBubble: { backgroundColor: '#EDE9FE', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#C4B5FD' },
  senderLabel: { fontSize: 11, fontWeight: '700', color: '#7F00FF', marginBottom: 3 },
  adminLabel: { color: '#6D28D9' },
  messageText: { fontSize: 15, color: '#1F2937', lineHeight: 21 },
  myMessageText: { color: '#fff' },
  timeRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4 },
  timeText: { fontSize: 10, color: '#9CA3AF' },
  myTimeText: { color: '#E5E7EB' },
  typingIndicator: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 8, marginBottom: 10 },
  typingText: { fontSize: 12, color: '#6B7280', fontStyle: 'italic' },
  emptyText: { textAlign: 'center', color: '#9CA3AF', marginTop: 60, fontSize: 15 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    padding: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1F2937',
    maxHeight: 120,
  },
  sendBtn: {
    backgroundColor: '#7F00FF',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachBtn: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    padding: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  closedText: { fontSize: 13, color: '#6B7280', flex: 1 },
});
