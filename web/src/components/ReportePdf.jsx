// Sección del dashboard para generar el reporte de incidencias en PDF por semana, mes o rango de fechas.
import { useMemo, useState } from 'react';
import { descargar } from '../api';
import { useAuth } from '../context/AuthContext';
import useCatalogos from './useCatalogos';

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const corta = (d) => d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });

// Últimas n semanas (lunes a domingo), empezando por la actual
function semanas(n = 26) {
  const hoy = new Date();
  const lunes = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - ((hoy.getDay() + 6) % 7));
  return Array.from({ length: n }, (_, i) => {
    const ini = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() - 7 * i);
    const fin = new Date(ini.getFullYear(), ini.getMonth(), ini.getDate() + 6);
    return { desde: iso(ini), hasta: iso(fin), etiqueta: `${i === 0 ? 'Semana actual: ' : ''}${corta(ini)} – ${corta(fin)}` };
  });
}

// Últimos n meses, empezando por el actual
function meses(n = 24) {
  const hoy = new Date();
  return Array.from({ length: n }, (_, i) => {
    const ini = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const fin = new Date(ini.getFullYear(), ini.getMonth() + 1, 0);
    const nombre = ini.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    return { desde: iso(ini), hasta: iso(fin), etiqueta: nombre.charAt(0).toUpperCase() + nombre.slice(1) };
  });
}

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
  const [error, setError] = useState('');

  const periodo = tipo === 'semana' ? listaSemanas[semana] : tipo === 'mes' ? listaMeses[mes] : rango;
  const rangoValido = periodo.desde && periodo.hasta && periodo.desde <= periodo.hasta;
  // El encargado de área solo puede generar reportes de su propia área (lo fuerza el backend)
  const eligeArea = usuario.Rol !== 'Encargado de Área';

  async function generar() {
    setError('');
    setGenerando(true);
    try {
      const params = new URLSearchParams({ desde: periodo.desde, hasta: periodo.hasta });
      if (eligeArea && area) params.set('area', area);
      await descargar(`/reportes/pdf?${params}`, `reporte-incidencias_${periodo.desde}_${periodo.hasta}.pdf`);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerando(false);
    }
  }

  return (
    <section className="tarjeta reporte-pdf">
      <h3>Generar reporte en PDF</h3>
      <div className="segmentos" role="tablist">
        {[['semana', 'Por semana'], ['mes', 'Por mes'], ['rango', 'Rango de fechas']].map(([valor, texto]) => (
          <button key={valor} type="button" role="tab" aria-selected={tipo === valor}
            className={tipo === valor ? 'activo' : ''} onClick={() => setTipo(valor)}>
            {texto}
          </button>
        ))}
      </div>

      <div className="filtros">
        {tipo === 'semana' && (
          <label>
            Semana
            <select value={semana} onChange={(e) => setSemana(Number(e.target.value))}>
              {listaSemanas.map((s, i) => <option key={s.desde} value={i}>{s.etiqueta}</option>)}
            </select>
          </label>
        )}
        {tipo === 'mes' && (
          <label>
            Mes
            <select value={mes} onChange={(e) => setMes(Number(e.target.value))}>
              {listaMeses.map((m, i) => <option key={m.desde} value={i}>{m.etiqueta}</option>)}
            </select>
          </label>
        )}
        {tipo === 'rango' && (
          <>
            <label>Desde<input type="date" value={rango.desde} max={rango.hasta || undefined} onChange={(e) => setRango({ ...rango, desde: e.target.value })} /></label>
            <label>Hasta<input type="date" value={rango.hasta} min={rango.desde || undefined} onChange={(e) => setRango({ ...rango, hasta: e.target.value })} /></label>
          </>
        )}
        {eligeArea && (
          <label>
            Área
            <select value={area} onChange={(e) => setArea(e.target.value)}>
              <option value="">Todas las áreas</option>
              {catalogos?.areas.map((a) => <option key={a.IdArea} value={a.IdArea}>{a.Nombre}</option>)}
            </select>
          </label>
        )}
        <button className="btn" onClick={generar} disabled={!rangoValido || generando}>
          {generando ? 'Generando…' : '⬇ Generar PDF'}
        </button>
      </div>
      <p className="muted nota">
        Incluye resumen, incidencias por área, estatus y categoría, y el detalle de cada reporte del periodo.
        Por protección de datos personales solo se muestran nombres (sin correos ni teléfonos).
      </p>
      {error && <p className="error">{error}</p>}
    </section>
  );
}
