// Generar el reporte de incidencias en PDF por semana, mes o rango de fechas (igual que en el panel web).
import { useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { descargarYCompartir } from '../api';
import { useAuth } from '../context/AuthContext';
import useCatalogos from '../hooks/useCatalogos';
import { eligeArea } from '../roles';
import { Boton, Campo, Chip, Selector, Tarjeta, Titulo } from './UI';
import { COLORES } from '../config';

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const corta = (d) => d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });

// Últimas n semanas (lunes a domingo), empezando por la actual
function semanas(n = 26) {
  const hoy = new Date();
  const lunes = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - ((hoy.getDay() + 6) % 7));
  return Array.from({ length: n }, (_, i) => {
    const ini = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() - 7 * i);
    const fin = new Date(ini.getFullYear(), ini.getMonth(), ini.getDate() + 6);
    return { valor: i, desde: iso(ini), hasta: iso(fin), texto: `${i === 0 ? 'Semana actual: ' : ''}${corta(ini)} – ${corta(fin)}` };
  });
}

// Últimos n meses, empezando por el actual
function meses(n = 24) {
  const hoy = new Date();
  return Array.from({ length: n }, (_, i) => {
    const ini = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const fin = new Date(ini.getFullYear(), ini.getMonth() + 1, 0);
    const nombre = ini.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    return { valor: i, desde: iso(ini), hasta: iso(fin), texto: nombre.charAt(0).toUpperCase() + nombre.slice(1) };
  });
}

// Valida una fecha escrita a mano en formato AAAA-MM-DD
const fechaValida = (f) => /^\d{4}-\d{2}-\d{2}$/.test(f) && !Number.isNaN(Date.parse(f)) && new Date(`${f}T00:00:00Z`).toISOString().slice(0, 10) === f;

export default function ReportePdf() {
  const { usuario } = useAuth();
  const catalogos = useCatalogos();
  const listaSemanas = useMemo(() => semanas(), []);
  const listaMeses = useMemo(() => meses(), []);

  const [tipo, setTipo] = useState('semana');
  const [semana, setSemana] = useState(0);
  const [mes, setMes] = useState(0);
  const [rango, setRango] = useState({ desde: '', hasta: '' });
  const [area, setArea] = useState('');
  const [generando, setGenerando] = useState(false);

  const periodo = tipo === 'semana' ? listaSemanas[semana] : tipo === 'mes' ? listaMeses[mes] : rango;
  const conArea = eligeArea(usuario);

  async function generar() {
    if (!fechaValida(periodo.desde) || !fechaValida(periodo.hasta)) {
      return Alert.alert('Periodo', 'Escribe las fechas con el formato AAAA-MM-DD, por ejemplo 2026-10-01');
    }
    if (periodo.desde > periodo.hasta) return Alert.alert('Periodo', 'La fecha inicial no puede ser posterior a la final');

    setGenerando(true);
    try {
      const params = new URLSearchParams({ desde: periodo.desde, hasta: periodo.hasta });
      if (conArea && area) params.set('area', String(area));
      await descargarYCompartir(`/reportes/pdf?${params}`, `reporte-incidencias_${periodo.desde}_${periodo.hasta}.pdf`);
    } catch (e) {
      Alert.alert('No se pudo generar el reporte', e.message);
    } finally {
      setGenerando(false);
    }
  }

  return (
    <Tarjeta>
      <Titulo>Generar reporte en PDF</Titulo>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        <Chip texto="Por semana" activo={tipo === 'semana'} onPress={() => setTipo('semana')} />
        <Chip texto="Por mes" activo={tipo === 'mes'} onPress={() => setTipo('mes')} />
        <Chip texto="Rango" activo={tipo === 'rango'} onPress={() => setTipo('rango')} />
      </View>

      {tipo === 'semana' && <Selector etiqueta="Semana" valor={semana} opciones={listaSemanas} onCambiar={setSemana} />}
      {tipo === 'mes' && <Selector etiqueta="Mes" valor={mes} opciones={listaMeses} onCambiar={setMes} />}
      {tipo === 'rango' && (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Campo etiqueta="Desde" value={rango.desde} onChangeText={(v) => setRango({ ...rango, desde: v.trim() })}
              placeholder="AAAA-MM-DD" keyboardType="numbers-and-punctuation" maxLength={10} />
          </View>
          <View style={{ flex: 1 }}>
            <Campo etiqueta="Hasta" value={rango.hasta} onChangeText={(v) => setRango({ ...rango, hasta: v.trim() })}
              placeholder="AAAA-MM-DD" keyboardType="numbers-and-punctuation" maxLength={10} />
          </View>
        </View>
      )}
      {conArea && (
        <Selector
          etiqueta="Área"
          valor={area}
          onCambiar={setArea}
          opciones={[{ valor: '', texto: 'Todas las áreas' }, ...(catalogos?.areas || []).map((a) => ({ valor: a.IdArea, texto: a.Nombre }))]}
        />
      )}
      <Boton titulo="⬇ Generar y compartir PDF" onPress={generar} cargando={generando} />
      <Text style={{ color: COLORES.muted, fontSize: 12, marginTop: 10, lineHeight: 17 }}>
        Podrás guardarlo, enviarlo por WhatsApp o correo. Por protección de datos solo incluye nombres (sin correos ni teléfonos).
      </Text>
    </Tarjeta>
  );
}
