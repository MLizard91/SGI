// URL del backend. Se toma de la variable EXPO_PUBLIC_API_URL (archivo .env).
// Importante: en el teléfono "localhost" es el propio teléfono, usa la IP de tu PC.
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.50:4000';

// Centro aproximado de la cabecera municipal de Mexticacán, Jalisco
export const CENTRO_MEXTICACAN = { latitude: 21.2667, longitude: -102.7833 };

export const COLORES = {
  azul: '#1E3A8A',
  azulClaro: '#2563EB',
  fondo: '#F1F5F9',
  texto: '#0F172A',
  muted: '#64748B',
  borde: '#E2E8F0',
  rojo: '#DC2626',
  blanco: '#FFFFFF',
};
