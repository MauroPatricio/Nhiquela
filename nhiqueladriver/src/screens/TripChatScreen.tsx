import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import api, { SOCKET_URL } from '../api/apiConfig';
import io from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

export default function TripChatScreen({ route }) {
  const { tripId } = route.params;
  const { token, user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const socketRef = useRef(null);

  useEffect(() => {
    fetchChat();

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.emit('join_trip_chat', { tripId });

    socket.on('receive_trip_message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [tripId]);

  const fetchChat = async () => {
    try {
      const { data } = await api.get(`/trip-chat/${tripId}`);
      if (data && data.messages) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.log('Error fetching chat:', error);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    try {
      await api.post(`/trip-chat/${tripId}/message`, { message: newMessage });
      setNewMessage('');
    } catch (error) {
      console.log('Error sending message:', error);
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
        <Text style={[styles.messageText, isMe && styles.myMessageText]}>{item.message}</Text>
        <Text style={[styles.timeText, isMe && {color: '#rgba(255,255,255,0.7)'}]}>
          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
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
        data={messages}
        keyExtractor={(_, index) => index.toString()}
        renderItem={renderMessage}
        contentContainerStyle={styles.chatContainer}
        showsVerticalScrollIndicator={false}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Escrever mensagem..."
          value={newMessage}
          onChangeText={setNewMessage}
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Text style={styles.sendButtonText}>Enviar</Text>
        </TouchableOpacity>
      </View>
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
  timeText: { fontSize: 10, color: '#999', alignSelf: 'flex-end', marginTop: 5 },
  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 25, paddingHorizontal: 15, paddingVertical: 10, fontSize: 16, marginRight: 10 },
  sendButton: { backgroundColor: '#8a2be2', borderRadius: 25, paddingVertical: 10, paddingHorizontal: 20 },
  sendButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
