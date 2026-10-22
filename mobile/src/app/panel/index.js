// Dashboard del personal: indicadores, gráficas, reporte PDF y reportes recientes.
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { api, formatoFecha } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useSocketEvent } from '../../context/SocketContext';
import { Barras, EstatusBadge, Kpi, PrioridadBadge, Tarjeta, Titulo } from '../../components/UI';
import ReportePdf from '../../components/ReportePdf';
import { ROLES } from '../../roles';
import { COLORES } from '../../config';

export default function Dashboard() {
  const { usuario } = useAuth();
  const [resumen, setResumen] = useState(null);
  const [recientes, setRecientes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [r, i] = await Promise.all([api('/reportes/resumen'), api('/incidencias?limite=6')]);
      setResumen(r);
      setRecientes(i.datos);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));
  // Cuando llega o cambia una incidencia, refrescamos los indicadores
  useSocketEvent('incidencia:nueva', cargar);
  useSocketEvent('incidencia:actualizada', cargar);

  const t = resumen?.totales;

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} />}
    >
      <Text style={styles.saludo}>Hola, {usuario.Nombre} 👋</Text>
      <Text style={styles.rol}>{usuario.Rol}{usuario.Area ? ` · ${usuario.Area}` : ''}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {t && (
        <View style={styles.kpis}>
          <Kpi etiqueta="Total (12 meses)" valor={t.Total} />
          <Kpi etiqueta="Pendientes" valor={t.Pendientes} />
          <Kpi etiqueta="En atención" valor={t.EnAtencion} />
          <Kpi etiqueta="Resueltas" valor={t.Resueltas} />
          <Kpi etiqueta="Urgentes abiertas" valor={t.UrgentesAbiertas} alerta />
          <Kpi etiqueta="Prom. resolución" valor={t.HorasPromedioResolucion == null ? '—' : `${Number(t.HorasPromedioResolucion).toFixed(1)} h`} />
        </View>
      )}

      {usuario.Rol !== ROLES.OPERATIVO && <ReportePdf />}

      {resumen && (
        <>
          <Tarjeta>
            <Titulo>Incidencias por área</Titulo>
            <Barras filas={resumen.porArea} etiqueta={(f) => f.Nombre} valor={(f) => f.Total} color={(f) => f.Color} />
          </Tarjeta>
          <Tarjeta>
            <Titulo>Incidencias por estatus</Titulo>
            <Barras filas={resumen.porEstatus} etiqueta={(f) => f.Nombre} valor={(f) => f.Total} color={(f) => f.Color} />
          </Tarjeta>
        </>
      )}

      <Tarjeta>
        <View style={styles.filaTitulo}>
          <Titulo>Reportes recientes</Titulo>
          <Pressable onPress={() => router.push('/panel/incidencias')} hitSlop={8}>
            <Text style={styles.link}>Ver todos</Text>
          </Pressable>
        </View>
        {recientes.length === 0 && <Text style={styles.vacio}>Aún no hay reportes</Text>}
        {recientes.map((i) => (
          <Pressable key={i.IdIncidencia} style={styles.reciente} onPress={() => router.push(`/gestion/${i.IdIncidencia}`)}>
            <Text style={styles.recienteTitulo} numberOfLines={1}><Text style={{ color: COLORES.guinda }}>{i.Folio}</Text> {i.Titulo}</Text>
            <View style={styles.badges}>
              <EstatusBadge nombre={i.Estatus} color={i.ColorEstatus} />
              <PrioridadBadge prioridad={i.Prioridad} />
            </View>
            <Text style={styles.meta}>{i.Area} · {formatoFecha(i.FechaCreacion)}</Text>
          </Pressable>
        ))}
      </Tarjeta>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  saludo: { fontSize: 20, fontWeight: '700', color: COLORES.texto },
  rol: { color: COLORES.muted, marginBottom: 14 },
  error: { color: COLORES.rojo, backgroundColor: '#FEF2F2', padding: 10, borderRadius: 8, marginBottom: 12 },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  filaTitulo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  link: { color: COLORES.guindaClaro, fontWeight: '600' },
  vacio: { color: COLORES.muted, textAlign: 'center', padding: 12 },
  reciente: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORES.fondo },
  recienteTitulo: { fontWeight: '700', color: COLORES.texto, fontSize: 15 },
  badges: { flexDirection: 'row', gap: 6, marginVertical: 6 },
  meta: { color: COLORES.muted, fontSize: 12 },
});
