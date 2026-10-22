import { useEffect, useState } from 'react';
import { api, formatoFecha } from '../api';
import useCatalogos from '../components/useCatalogos';

const VACIO = { nombre: '', apellidos: '', correo: '', telefono: '', password: '', idRol: '', idArea: '', activo: true };

export default function Usuarios() {
  const catalogos = useCatalogos();
  const [usuarios, setUsuarios] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [form, setForm] = useState(null); // null = cerrado; objeto = creando/editando
  const [error, setError] = useState('');

  const cargar = () => api(`/usuarios?buscar=${encodeURIComponent(buscar)}`).then(setUsuarios);
  useEffect(() => {
    cargar();
  }, [buscar]);

  function editar(u) {
    setError('');
    setForm({
      id: u.IdUsuario, nombre: u.Nombre, apellidos: u.Apellidos || '', correo: '', telefono: '',
      password: '', idRol: u.IdRol, idArea: u.IdArea || '', activo: u.Activo,
    });
  }

  async function guardar(e) {
    e.preventDefault();
    setError('');
    try {
      const body = { ...form, idRol: Number(form.idRol), idArea: form.idArea ? Number(form.idArea) : null };
      // Al editar, el teléfono vacío significa "sin cambios" (no se muestra el actual por privacidad)
      if (form.id && !form.telefono) delete body.telefono;
      if (form.id) await api(`/usuarios/${form.id}`, { method: 'PUT', body });
      else await api('/usuarios', { method: 'POST', body });
      setForm(null);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  const campo = (k) => ({ value: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }) });
  const rolSeleccionado = catalogos?.roles.find((r) => r.IdRol === Number(form?.idRol))?.Nombre;
  const requiereArea = ['Encargado de Área', 'Operativo'].includes(rolSeleccionado);

  return (
    <>
      <div className="encabezado">
        <h2>Usuarios</h2>
        <button className="btn" onClick={() => { setError(''); setForm(VACIO); }}>+ Nuevo usuario</button>
      </div>

      <div className="tarjeta filtros">
        <input placeholder="Buscar por nombre…" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
      </div>

      <div className="tarjeta tabla-contenedor">
        <table>
          <thead>
            <tr><th>Nombre</th><th>Rol</th><th>Área</th><th>Estado</th><th>Último acceso</th><th></th></tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.IdUsuario}>
                <td>{u.Nombre} {u.Apellidos}</td>
                <td>{u.Rol}</td>
                <td>{u.Area || '—'}</td>
                <td>{u.Activo ? '✅ Activo' : '⛔ Inactivo'}</td>
                <td><small>{formatoFecha(u.UltimoAcceso)}</small></td>
                <td><button className="link" onClick={() => editar(u)}>Editar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <div className="modal" onClick={() => setForm(null)}>
          <form className="tarjeta formulario" onClick={(e) => e.stopPropagation()} onSubmit={guardar}>
            <h3>{form.id ? 'Editar usuario' : 'Nuevo usuario'}</h3>
            <div className="grid-2">
              <label>Nombre<input {...campo('nombre')} required /></label>
              <label>Apellidos<input {...campo('apellidos')} /></label>
              {!form.id && <label>Correo<input type="email" {...campo('correo')} required /></label>}
              <label>
                {form.id ? 'Nuevo teléfono (opcional)' : 'Teléfono'}
                <input type="tel" {...campo('telefono')} placeholder={form.id ? 'Oculto por privacidad · vacío = sin cambios' : ''} />
              </label>
              <label>
                Rol
                <select {...campo('idRol')} required>
                  <option value="">Selecciona…</option>
                  {catalogos?.roles.map((r) => <option key={r.IdRol} value={r.IdRol}>{r.Nombre}</option>)}
                </select>
              </label>
              <label>
                Área {requiereArea && '*'}
                <select {...campo('idArea')} required={requiereArea}>
                  <option value="">Ninguna</option>
                  {catalogos?.areas.map((a) => <option key={a.IdArea} value={a.IdArea}>{a.Nombre}</option>)}
                </select>
              </label>
              <label>
                {form.id ? 'Nueva contraseña (opcional)' : 'Contraseña'}
                <input type="password" {...campo('password')} required={!form.id} minLength={8} />
              </label>
              {form.id && (
                <label className="check">
                  <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} /> Cuenta activa
                </label>
              )}
            </div>
            {error && <p className="error">{error}</p>}
            <div className="acciones">
              <button type="button" className="btn secundario" onClick={() => setForm(null)}>Cancelar</button>
              <button className="btn">Guardar</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
