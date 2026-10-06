export function EstatusBadge({ nombre, color }) {
  return (
    <span className="badge" style={{ background: `${color}22`, color, borderColor: `${color}55` }}>
      {nombre}
    </span>
  );
}

const COLORES_PRIORIDAD = { Baja: '#64748B', Media: '#0284C7', Alta: '#EA580C', Urgente: '#DC2626' };

export function PrioridadBadge({ prioridad }) {
  const color = COLORES_PRIORIDAD[prioridad] || '#64748B';
  return (
    <span className="badge" style={{ background: `${color}18`, color, borderColor: `${color}55` }}>
      {prioridad}
    </span>
  );
}
