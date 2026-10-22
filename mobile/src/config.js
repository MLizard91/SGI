// URL del backend. Se toma de la variable EXPO_PUBLIC_API_URL (archivo .env).
// Importante: en el teléfono "localhost" es el propio teléfono, usa la IP de tu PC.
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.50:4000';

// Centro aproximado de la cabecera municipal de Mexticacán, Jalisco
export const CENTRO_MEXTICACAN = { latitude: 21.2667, longitude: -102.7833 };

export const COLORES = {
  guinda: '#7A1F2B',
  guindaClaro: '#A83A43',
  beige: '#EEE4D2',
  fondo: '#F7F3EB',
  texto: '#302A27',
  muted: '#71675E',
  borde: '#E4D9C8',
  rojo: '#A32632',
  blanco: '#FFFFFF',
};
