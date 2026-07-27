import { API_BASE_URL, isProductionBuild } from './env';

describe('env config', () => {
  it('exposes the versioned API base path used by every fetch call', () => {
    expect(API_BASE_URL).toBe('/api/v1');
  });

  it('is not a production build under the Jest test environment', () => {
    expect(isProductionBuild()).toBe(false);
  });

  it('reports production when NODE_ENV is production', () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(isProductionBuild()).toBe(true);
    } finally {
      process.env.NODE_ENV = original;
    }
  });
});
