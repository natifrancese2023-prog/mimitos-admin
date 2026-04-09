// ============================================================
// PROVEEDORES.JSX - Gestión completa de proveedores
// ============================================================
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "./Proveedores.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
function getAuthHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

const PROVEEDOR_VACIO = { nombre: "", telefono: "", direccion: "" };

const FORMA_PAGO_ICONO = {
  efectivo: "💵",
  transferencia: "🏦",
  debito: "💳",
  credito: "💳",
};

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando]       = useState(true);
  const [error, setError]             = useState("");
  const [busqueda, setBusqueda]       = useState("");

  // Modal ABM
  const [modalABM, setModalABM]             = useState(false);
  const [modoEdicion, setModoEdicion]       = useState(false);
  const [actual, setActual]                 = useState(PROVEEDOR_VACIO);
  const [erroresForm, setErroresForm]       = useState({});
  const [guardando, setGuardando]           = useState(false);
  const [mensajeExito, setMensajeExito]     = useState("");

  // Modal historial
  const [modalHistorial, setModalHistorial] = useState(false);
  const [proveedorSel, setProveedorSel]     = useState(null);
  const [historial, setHistorial]           = useState([]);
  const [cargandoHist, setCargandoHist]     = useState(false);

  // Confirmar eliminar
  const [confirmar, setConfirmar] = useState(null);

  // ── Carga ──────────────────────────────────────────────
  const cargarProveedores = useCallback(async () => {
    setCargando(true); setError("");
    try {
      const res = await axios.get(`${API_URL}/proveedores`, { headers: getAuthHeader() });
      setProveedores(res.data);
    } catch (err) {
      setError("No se pudieron cargar los proveedores.");
    } finally { setCargando(false); }
  }, []);

  useEffect(() => { cargarProveedores(); }, [cargarProveedores]);

  // ── Filtro ─────────────────────────────────────────────
  const filtrados = proveedores.filter(p => {
    const q = busqueda.toLowerCase();
    return p.nombre?.toLowerCase().includes(q) ||
            p.telefono?.includes(q) ||
            p.direccion?.toLowerCase().includes(q);
  });

  // ── Validación ─────────────────────────────────────────
  function validar(p) {
    const err = {};
    if (!p.nombre.trim()) err.nombre = "El nombre es obligatorio";
    return err;
  }

  // ── Modal ABM ──────────────────────────────────────────
  const abrirCrear = () => {
    setActual(PROVEEDOR_VACIO); setErroresForm({});
    setMensajeExito(""); setModoEdicion(false); setModalABM(true);
  };

  const abrirEditar = (p) => {
    setActual({ id_proveedor: p.id_proveedor, nombre: p.nombre, telefono: p.telefono || "", direccion: p.direccion || "" });
    setErroresForm({}); setMensajeExito(""); setModoEdicion(true); setModalABM(true);
  };

  const cerrarABM = () => { setModalABM(false); setErroresForm({}); setMensajeExito(""); };

  const handleGuardar = async () => {
    const errores = validar(actual);
    setErroresForm(errores);
    if (Object.keys(errores).length > 0) return;
    setGuardando(true);
    try {
      if (modoEdicion) {
        await axios.put(`${API_URL}/proveedores/${actual.id_proveedor}`, actual, { headers: getAuthHeader() });
        setMensajeExito("Proveedor actualizado correctamente");
      } else {
        await axios.post(`${API_URL}/proveedores`, actual, { headers: getAuthHeader() });
        setMensajeExito("Proveedor creado correctamente");
      }
      await cargarProveedores();
      setTimeout(() => cerrarABM(), 1200);
    } catch (err) {
      setErroresForm({ general: err.response?.data?.error || "Error al guardar" });
    } finally { setGuardando(false); }
  };

  // ── Eliminar ───────────────────────────────────────────
  const handleEliminar = async () => {
    if (!confirmar) return;
    try {
      await axios.delete(`${API_URL}/proveedores/${confirmar.id_proveedor}`, { headers: getAuthHeader() });
      setConfirmar(null);
      await cargarProveedores();
    } catch (err) { console.error(err); }
  };

  // ── Historial ──────────────────────────────────────────
  const abrirHistorial = async (p) => {
    setProveedorSel(p); setModalHistorial(true);
    setCargandoHist(true); setHistorial([]);
    try {
      const res = await axios.get(`${API_URL}/proveedores/${p.id_proveedor}/compras`, { headers: getAuthHeader() });
      setHistorial(res.data);
    } catch (err) { console.error(err); }
    finally { setCargandoHist(false); }
  };

  const cerrarHistorial = () => { setModalHistorial(false); setProveedorSel(null); setHistorial([]); };

  // ── Helpers ────────────────────────────────────────────
  const formatFecha = (f) => f ? new Date(f).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
  const totalCompras = (h) => h.reduce((acc, c) => acc + Number(c.total || 0), 0);

  // ── Renders estado ─────────────────────────────────────
  if (cargando) return <div className="prov-estado"><div className="spinner"/><p>Cargando proveedores...</p></div>;
  if (error)    return <div className="prov-estado prov-error"><span>⚠️</span><p>{error}</p><button onClick={cargarProveedores}>Reintentar</button></div>;

  return (
    <div className="proveedores-page">

      {/* ENCABEZADO */}
      <div className="prov-header">
        <div>
          <h1>Proveedores</h1>
          <p>{proveedores.length} proveedores registrados</p>
        </div>
        <button className="btn-primario" onClick={abrirCrear}>+ Nuevo proveedor</button>
      </div>

      {/* BÚSQUEDA */}
      <div className="prov-busqueda">
        <span>🔍</span>
        <input
          type="text" placeholder="Buscar por nombre, teléfono o dirección..."
          value={busqueda} onChange={e => setBusqueda(e.target.value)}
        />
        {busqueda && <button onClick={() => setBusqueda("")}>✕</button>}
      </div>

      {/* TABLA */}
      {filtrados.length === 0 ? (
        <div className="prov-vacio"><span>🏭</span><p>{busqueda ? "No hay resultados" : "No hay proveedores registrados"}</p></div>
      ) : (
        <div className="prov-tabla-wrapper">
          <table className="prov-tabla">
            <thead>
              <tr><th>Nombre</th><th>Teléfono</th><th>Dirección</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {filtrados.map(p => (
                <tr key={p.id_proveedor}>
                  <td><span className="prov-nombre">{p.nombre}</span></td>
                  <td>{p.telefono || "—"}</td>
                  <td>{p.direccion || "—"}</td>
                  <td>
                    <div className="acciones">
                      <button className="btn-ver" onClick={() => abrirHistorial(p)}>📋 Historial</button>
                      <button className="btn-editar" onClick={() => abrirEditar(p)}>✏️</button>
                      <button className="btn-eliminar" onClick={() => setConfirmar(p)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL ABM */}
      {modalABM && (
        <div className="modal-overlay" onClick={cerrarABM}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modoEdicion ? "Editar proveedor" : "Nuevo proveedor"}</h2>
              <button className="modal-cerrar" onClick={cerrarABM}>✕</button>
            </div>
            <div className="modal-body">
              {mensajeExito && <div className="alerta-exito">✅ {mensajeExito}</div>}
              {erroresForm.general && <div className="alerta-error">⚠️ {erroresForm.general}</div>}
              <div className="form-col">
                <div className="field-group">
                  <label>Nombre *</label>
                  <input type="text" value={actual.nombre}
                    onChange={e => setActual({ ...actual, nombre: e.target.value })}
                    className={erroresForm.nombre ? "input-error" : ""}/>
                  {erroresForm.nombre && <span className="campo-error">{erroresForm.nombre}</span>}
                </div>
                <div className="field-group">
                  <label>Teléfono</label>
                  <input type="text" value={actual.telefono}
                    onChange={e => setActual({ ...actual, telefono: e.target.value })}/>
                </div>
                <div className="field-group">
                  <label>Dirección</label>
                  <input type="text" value={actual.direccion}
                    onChange={e => setActual({ ...actual, direccion: e.target.value })}/>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secundario" onClick={cerrarABM}>Cancelar</button>
              <button className="btn-primario" onClick={handleGuardar} disabled={guardando}>
                {guardando ? "Guardando..." : modoEdicion ? "Guardar cambios" : "Crear proveedor"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HISTORIAL */}
      {modalHistorial && proveedorSel && (
        <div className="modal-overlay" onClick={cerrarHistorial}>
          <div className="modal modal-grande" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Historial de compras</h2>
                <p className="modal-subtitulo">{proveedorSel.nombre}</p>
              </div>
              <button className="modal-cerrar" onClick={cerrarHistorial}>✕</button>
            </div>
            <div className="modal-body">
              {cargandoHist ? (
                <div className="prov-estado"><div className="spinner"/><p>Cargando...</p></div>
              ) : historial.length === 0 ? (
                <div className="prov-vacio"><span>📋</span><p>No hay compras registradas para este proveedor</p></div>
              ) : (
                <>
                  <div className="hist-resumen">
                    <div className="resumen-item">
                      <span className="resumen-valor">{historial.length}</span>
                      <span className="resumen-label">Compras totales</span>
                    </div>
                    <div className="resumen-item">
                      <span className="resumen-valor">${totalCompras(historial).toLocaleString("es-AR")}</span>
                      <span className="resumen-label">Total invertido</span>
                    </div>
                    <div className="resumen-item">
                      <span className="resumen-valor">{historial.filter(c => c.estado_pago === "pendiente").length}</span>
                      <span className="resumen-label">Pagos pendientes</span>
                    </div>
                  </div>

                  <table className="hist-tabla">
                    <thead>
                      <tr><th>Fecha</th><th>Total</th><th>Forma pago</th><th>Estado pago</th><th>Productos</th></tr>
                    </thead>
                    <tbody>
                      {historial.map(c => (
                        <tr key={c.id_compra}>
                          <td>{formatFecha(c.fecha)}</td>
                          <td><strong>${Number(c.total).toLocaleString("es-AR")}</strong></td>
                          <td>{FORMA_PAGO_ICONO[c.forma_pago] || "—"} {c.forma_pago || "—"}</td>
                          <td>
                            <span className={`badge-pago ${c.estado_pago === "pagado" ? "pago-ok" : "pago-pendiente"}`}>
                              {c.estado_pago === "pagado" ? "✅ Pagado" : "🕐 Pendiente"}
                            </span>
                          </td>
                          <td>
                            {Array.isArray(c.detalle) && c.detalle.length > 0 ? (
                              <ul className="detalle-mini">
                                {c.detalle.map((d, i) => (
                                  <li key={i}>{d.nombre} × {d.cantidad}</li>
                                ))}
                              </ul>
                            ) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR ELIMINAR */}
      {confirmar && (
        <div className="modal-overlay" onClick={() => setConfirmar(null)}>
          <div className="modal modal-chico" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Eliminar proveedor</h2></div>
            <div className="modal-body">
              <p>¿Estás seguro que querés eliminar <strong>{confirmar.nombre}</strong>? Esta acción no se puede deshacer.</p>
            </div>
            <div className="modal-footer">
              <button className="btn-secundario" onClick={() => setConfirmar(null)}>Cancelar</button>
              <button className="btn-danger" onClick={handleEliminar}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
