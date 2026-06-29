import api from '../hooks/createConnectionApi';

describe('API Configuration', () => {
  it('should have a base URL configured', () => {
    expect(api.defaults.baseURL).toBeDefined();
    expect(typeof api.defaults.baseURL).toBe('string');
    expect(api.defaults.baseURL.length).toBeGreaterThan(0);
  });

  it('should fallback to correct URLs based on NODE_ENV', () => {
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) {
      expect(api.defaults.baseURL).toContain('192.168');
    } else {
      expect(api.defaults.baseURL).toContain('api.nhiquelaservicos.com');
    }
  });
});
