export type AppEnvironment = 'production' | 'non-production';

export function getAppEnvironment(): AppEnvironment {
  const env = process.env.REACT_APP_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development';
  return env === 'production' ? 'production' : 'non-production';
}

export function useEnvironment(): AppEnvironment {
  return getAppEnvironment();
}
