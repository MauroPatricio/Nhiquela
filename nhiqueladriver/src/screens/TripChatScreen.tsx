import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Image, ActivityIndicator, Alert, LayoutAnimation, UIManager } from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import api, { SOCKET_URL, API_BASE_URL } from '../api/apiConfig';
import io from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http') || path.startsWith('data:image')) return path;
  const baseUrl = API_BASE_URL.replace('/api', '');
  return path.startsWith('/') ? `${baseUrl}${path}` : `${baseUrl}/${path}`;
};

export default function TripChatScreen({ route, navigation }) {
  const { tripId, passenger, passengerImage, serviceMotive } = route.params;
  const { token, user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isChatActive, setIsChatActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const socketRef = useRef(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {passengerImage ? (
            <Image 
              source={{ uri: getImageUrl(passengerImage) || passengerImage }} 
              style={{ width: 36, height: 36, borderRadius: 18, marginRight: 10, backgroundColor: '#eee' }} 
            />
          ) : (
            <Ionicons name="person-circle" size={36} color="#ccc" style={{ marginRight: 10 }} />
          )}
          <View>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}>{passenger || 'Cliente'}</Text>
            <Text style={{ fontSize: 12, color: '#666' }}>{serviceMotive || 'Serviço Padrão'}</Text>
          </View>
        </View>
      ),
      headerTitleAlign: 'left',
    });
  }, [navigation, passenger, passengerImage, serviceMotive]);

  useEffect(() => {
    fetchChat();

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.emit('join_trip_chat', { tripId });

    socket.on('receive_trip_message', (message) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setMessages((prev) => [...prev, message]);
      if (user && user._id && message.senderId !== user._id) {
         socket.emit('mark_read_trip_chat', { tripId, userId: user._id });
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
          if (m.senderId === data.readBy || m.senderId?._id === data.readBy) return m;
          return { ...m, status: 'read' };
       }));
    });

    socketRef.current = socket;
    
    if (user && user._id) {
       socket.emit('mark_read_trip_chat', { tripId, userId: user._id });
    }

    return () => {
      socket.disconnect();
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
      console.log('Error fetching chat:', error);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    try {
      if (socketRef.current && user?._id) {
        socketRef.current.emit('stop_typing_trip_chat', { tripId, senderId: user._id });
      }
      await api.post(`/trip-chat/${tripId}/message`, { message: newMessage.trim() });
      setNewMessage('');
    } catch (error) {
      console.log('Error sending message:', error);
      Alert.alert('Erro', 'Não foi possível enviar a mensagem.');
    }
  };

  const handleTyping = (text) => {
    setNewMessage(text);
    if (!socketRef.current || !user?._id) return;
    
    socketRef.current.emit('typing_trip_chat', { tripId, senderId: user._id });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
       socketRef.current.emit('stop_typing_trip_chat', { tripId, senderId: user._id });
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
      formData.append('type', 'driver');

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

  const renderMessage = ({ item }) => {
    const isMe = item.senderId === user._id || item.senderId._id === user._id;
    const isSystem = item.senderType === 'admin';
    
    return (
      <View style={[styles.messageBubble, isMe ? styles.myMessage : isSystem ? styles.adminMessage : styles.theirMessage]}>
        {!isMe && (
          <Text style={[styles.senderName, isSystem && {color: '#8a2be2'}]}>
            {isSystem ? 'Admin Suporte' : item.senderType === 'client' ? 'Cliente' : 'Motorista'}
          </Text>
        )}
        {item.fileUrl && item.fileType === 'image' && (
          <Image source={{ uri: item.fileUrl }} style={{ width: 180, height: 180, borderRadius: 8, marginBottom: 5 }} resizeMode="cover" />
        )}
        {!!item.message && <Text style={[styles.messageText, isMe && styles.myMessageText]}>{item.message}</Text>}
        <View style={styles.timeRow}>
          <Text style={[styles.timeText, isMe && {color: 'rgba(255,255,255,0.7)'}]}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {isMe && (
            <Ionicons 
              name={item.status === 'read' ? 'checkmark-done' : 'checkmark'} 
              size={14} 
              color={item.status === 'read' ? '#60A5FA' : 'rgba(255,255,255,0.7)'} 
              style={{ marginLeft: 4 }}
            />
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(_, index) => index.toString()}
        renderItem={renderMessage}
        contentContainerStyle={styles.chatContainer}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={() => (
           isTyping ? (
             <View style={styles.typingIndicator}>
                <ActivityIndicator size="small" color="#8a2be2" />
                <Text style={styles.typingText}>Cliente a escrever...</Text>
             </View>
           ) : null
        )}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />
      {loading && <ActivityIndicator size="small" color="#8a2be2" style={{ padding: 10 }} />}
      {isChatActive ? (
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachBtn} onPress={handlePickImage} disabled={loading}>
            <Ionicons name="camera-outline" size={26} color="#666" />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Escrever mensagem..."
            value={newMessage}
            onChangeText={handleTyping}
            multiline
            maxLength={500}
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleSend} disabled={!newMessage.trim() && !loading}>
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.closedBanner}>
          <Ionicons name="lock-closed" size={16} color="#6B7280" />
          <Text style={styles.closedText}>A viagem terminou. Chat encerrado.</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f0f0' },
  chatContainer: { padding: 15, paddingBottom: 30 },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 20, marginBottom: 10 },
  myMessage: { backgroundColor: '#8a2be2', alignSelf: 'flex-end', borderBottomRightRadius: 5 },
  theirMessage: { backgroundColor: '#fff', alignSelf: 'flex-start', borderBottomLeftRadius: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1, elevation: 1 },
  adminMessage: { backgroundColor: '#e6e6fa', alignSelf: 'flex-start', borderBottomLeftRadius: 5, borderWidth: 1, borderColor: '#8a2be2' },
  myMessageText: { color: '#fff', fontSize: 16 },
  messageText: { color: '#333', fontSize: 16 },
  senderName: { fontSize: 12, fontWeight: 'bold', color: '#555', marginBottom: 2 },
  timeRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4 },
  timeText: { fontSize: 10, color: '#999' },
  typingIndicator: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 8, marginBottom: 10 },
  typingText: { fontSize: 12, color: '#6B7280', fontStyle: 'italic' },
  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee', alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 25, paddingHorizontal: 15, paddingVertical: 10, fontSize: 16, marginRight: 10, maxHeight: 120 },
  sendButton: { backgroundColor: '#8a2be2', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  attachBtn: { padding: 10, justifyContent: 'center', alignItems: 'center' },
  closedBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6', padding: 16, gap: 8, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  closedText: { fontSize: 13, color: '#6B7280', flex: 1 },
});
