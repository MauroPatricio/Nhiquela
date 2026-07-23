/**
 * Mock para react-native-encrypted-storage
 *
 * O módulo nativo RNEncryptedStorage não está compilado no dev client.
 * Usa AsyncStorage como backend (disponível no Expo) para manter
 * a persistência real durante os testes — apenas sem criptografia.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '__enc_storage__:';

const EncryptedStorage = {
  async setItem(key, value) {
    await AsyncStorage.setItem(PREFIX + key, value);
  },

  async getItem(key) {
    return await AsyncStorage.getItem(PREFIX + key);
  },

  async removeItem(key) {
    await AsyncStorage.removeItem(PREFIX + key);
  },

  async clear() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const encKeys = keys.filter(k => k.startsWith(PREFIX));
      if (encKeys.length > 0) {
        await AsyncStorage.multiRemove(encKeys);
      }
    } catch (e) {
      // silently fail
    }
  },
};

export default EncryptedStorage;
