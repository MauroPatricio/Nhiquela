import { Image } from 'expo-image';
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback, Keyboard, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../hooks/createConnectionApi';
import { useNavigation } from '@react-navigation/native';
import registerDeviceToken from '../utils/registerDeviceToken';
import BackBtn from '../components/BackBtn';
import { useToast } from 'react-native-toast-notifications';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoginPage() {
  const navigation = useNavigation();
  const toast = useToast();
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  innerContainer: {
    alignItems: 'center',
    width: '100%',
    position: 'relative',
  },
  backBtnWrapper: {
    position: 'absolute',
    left: 0,
    top: Platform.OS === 'ios' ? 0 : 10,
    zIndex: 999,
  },
  cover: {
    height: 120,
    width: '100%',
    contentFit: 'contain',
    marginTop: 40,
    marginBottom: 30,
    transform: [{ scale: 1.5 }],
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: '500',
  },
  wrapper: {
    marginBottom: 20,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1F2937',
  },
  inputWrapper: (isFocused, hasError) => ({
    borderColor: hasError ? '#EF4444' : (isFocused ? '#9333EA' : '#F3F4F6'),
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    paddingHorizontal: 16,
    alignItems: 'center',
  }),
  iconStyle: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  eyeBtn: {
    padding: 4,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: 2,
    marginBottom: 20,
  },
  forgotText: {
    color: '#9333EA',
    fontWeight: '700',
    fontSize: 14,
  },
  loginButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: 0.5,
  },
  errorText: {
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback, Keyboard, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../hooks/createConnectionApi';
import { useNavigation } from '@react-navigation/native';
import registerDeviceToken from '../utils/registerDeviceToken';
import BackBtn from '../components/BackBtn';
import { useToast } from 'react-native-toast-notifications';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoginPage() {
  const navigation = useNavigation();
  const toast = useToast();
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  innerContainer: {
    alignItems: 'center',
    width: '100%',
    position: 'relative',
  },
  backBtnWrapper: {
    position: 'absolute',
    left: 0,
    top: Platform.OS === 'ios' ? 0 : 10,
    zIndex: 999,
  },
  cover: {
    height: 120,
    width: '100%',
    contentFit: 'contain',
    marginTop: 40,
    marginBottom: 30,
    transform: [{ scale: 1.5 }],
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: '500',
  },
  wrapper: {
    marginBottom: 20,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1F2937',
  },
  inputWrapper: (isFocused, hasError) => ({
    borderColor: hasError ? '#EF4444' : (isFocused ? '#9333EA' : '#F3F4F6'),
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    paddingHorizontal: 16,
    alignItems: 'center',
  }),
  iconStyle: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  eyeBtn: {
    padding: 4,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: 2,
    marginBottom: 20,
  },
  forgotText: {
    color: '#9333EA',
    fontWeight: '700',
    fontSize: 14,
  },
  loginButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: 0.5,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 6,
    fontWeight: '500',
  },
  registerText: {
    fontSize: 15,
    color: '#6B7280',
  },
  link: {
    color: '#9333EA',
    fontWeight: '700',
  },
  premiumModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumPasswordModalContainer: {
    backgroundColor: '#FFF',
    width: '90%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.15)',
  },
  premiumModalHeader: {
    alignItems: 'center',
    marginBottom: 10,
  },
  premiumPasswordModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#9333EA',
    marginTop: 10,
    textAlign: 'center',
  },
  premiumModalText: {
    fontSize: 15,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  passwordInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    width: '100%',
  },
  modalInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  premiumPasswordModalBtn: {
    backgroundColor: '#9333EA',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  premiumModalCloseBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
