// Setup para testes
import '@testing-library/jest-dom';

// Mock do Supabase client se necessário
global.fetch = global.fetch || (() => Promise.resolve({
  json: () => Promise.resolve({}),
  ok: true,
  status: 200,
  statusText: 'OK'
} as Response));