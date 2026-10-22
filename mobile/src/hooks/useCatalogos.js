// Carga una sola vez los catálogos (áreas, categorías, estatus, roles, prioridades) y los comparte.
import { useEffect, useState } from 'react';
import { api } from '../api';

let cache = null;

export default function useCatalogos() {
  const [catalogos, setCatalogos] = useState(cache);
  useEffect(() => {
    if (cache) return;
    api('/catalogos')
      .then((c) => {
        cache = c;
        setCatalogos(c);
      })
      .catch(() => {});
  }, []);
  return catalogos;
}
