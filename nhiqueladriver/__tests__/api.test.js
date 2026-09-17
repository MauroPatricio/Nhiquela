jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
import api from '../src/api/apiConfig';

describe('API Configuration', () => {
  it('should have a base URL configured', () => {
    expect(api.defaults.baseURL).toBeDefined();
    expect(typeof api.defaults.baseURL).toBe('string');
    expect(api.defaults.baseURL.length).toBeGreaterThan(0);
  });

  it('should fallback to correct URLs based on NODE_ENV', () => {
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) {
      expect(api.defaults.baseURL).toMatch(/192\.168|10\.|172\.|localhost/);
    } else {
      expect(api.defaults.baseURL).toContain('api.nhiquelaservicos.com');
    }
  });
});
