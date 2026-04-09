// ============================================================
// GASTOS.JSX - Gestión de gastos generales
// ============================================================
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "./Gastos.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
function getAuthHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

const CATEGORIAS = ["servicios", "alquiler", "sueldos", "transporte", "insumos", "otros"];
const FORMAS_PAGO = ["efectivo", "transferencia", "debito", "credito"];
const FORMA_PAGO_ICONO = { efectivo: "💵", transferencia: "🏦", debito: "💳", credito: "💳" };

const GASTO_VACIO = {
  descripcion: "", categoria: "", monto: "", forma_pago: "",
  fecha: new Date().toISOString().split("T")[0],
};

export default function Gastos() {
  const [gastos, setGastos]     = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError]       = useState("");

  // Filtros
  const [filtroCategoria,  setFiltroCategoria]  = useState("");
  const [filtroFormaPago,  setFiltroFormaPago]  = useState("");
  const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState("");

  // Modal ABM
  const [modalABM,     setModalABM]     = useState(false);
  const [modoEdicion,  setModoEdicion]  = useState(false);
  const [actual,       setActual]       = useState(GASTO_VACIO);
  const [erroresForm,  setErroresForm]  = useState({});
  const [guardando,    setGuardando]    = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");

  // Confirmar eliminar
  const [confirmar, setConfirmar] = useState(null);

  // ── Carga ──────────────────────────────────────────────
  const cargarGastos = useCallback(async () => {
    setCargando(true); setError("");
    try {
      const res = await axios.get(`${API_URL}/gastos`, { headers: getAuthHeader() });
      setGastos(res.data);
    } catch (err) {
      setError("No se pudieron cargar los gastos.");
    } finally { setCargando(false); }
  }, []);

  useEffect(() => { cargarGastos(); }, [cargarGastos]);

  // ── Filtros ────────────────────────────────────────────
  const gastosFiltrados = gastos.filter(g => {
    if (filtroCategoria && g.categoria !== filtroCategoria) return false;
    if (filtroFormaPago && g.forma_pago !== filtroFormaPago) return false;
    if (filtroFechaDesde) {
      const f = new Date(g.fecha).toISOString().split("T")[0];
      if (f < filtroFechaDesde) return false;
    }
    if (filtroFechaHasta) {
      const f = new Date(g.fecha).toISOString().split("T")[0];
      if (f > filtroFechaHasta) return false;
    }
    return true;
  });

  const hayFiltros = filtroCategoria || filtroFormaPago || filtroFechaDesde || filtroFechaHasta;
  const limpiarFiltros = () => { setFiltroCategoria(""); setFiltroFormaPago(""); setFiltroFechaDesde(""); setFiltroFechaHasta(""); };

  const totalFiltrado = gastosFiltrados.reduce((acc, g) => acc + Number(g.monto || 0), 0);
  const totalGeneral  = gastos.reduce((acc, g) => acc + Number(g.monto || 0), 0);

  // ── Validación ─────────────────────────────────────────
  function validar(g) {
    const err = {};
    if (!g.descripcion.trim()) err.descripcion = "La descripción es obligatoria";
    if (!g.monto || Number(g.monto) <= 0) err.monto = "El monto debe ser mayor a 0";
    if (!g.fecha) err.fecha = "La fecha es obligatoria";
    return err;
  }

  // ── Modal ABM ──────────────────────────────────────────
  const abrirCrear = () => {
    setActual(GASTO_VACIO); setErroresForm({});
    setMensajeExito(""); setModoEdicion(false); setModalABM(true);
  };

  const abrirEditar = (g) => {
    setActual({
      id_gasto:    g.id_gasto,
      descripcion: g.descripcion,
      categoria:   g.categoria || "",
      monto:       g.monto,
      forma_pago:  g.forma_pago || "",
      fecha:       new Date(g.fecha).toISOString().split("T")[0],
    });
    setErroresForm({}); setMensajeExito(""); setModoEdicion(true); setModalABM(true);
  };

  const cerrarABM = () => { setModalABM(false); setErroresForm({}); setMensajeExito(""); };

  const handleGuardar = async () => {
    const errores = validar(actual);
    setErroresForm(errores);
    if (Object.keys(errores).length > 0) return;
    setGuardando(true);
    try {
      const payload = {
        descripcion: actual.descripcion.trim(),
        categoria:   actual.categoria || null,
        monto:       Number(actual.monto),
        forma_pago:  actual.forma_pago || null,
        fecha:       actual.fecha,
      };
      if (modoEdicion) {
        await axios.put(`${API_URL}/gastos/${actual.id_gasto}`, payload, { headers: getAuthHeader() });
        setMensajeExito("Gasto actualizado correctamente");
      } else {
        await axios.post(`${API_URL}/gastos`, payload, { headers: getAuthHeader() });
        setMensajeExito("Gasto registrado correctamente");
      }
      await cargarGastos();
      setTimeout(() => cerrarABM(), 1200);
    } catch (err) {
      setErroresForm({ general: err.response?.data?.error || "Error al guardar" });
    } finally { setGuardando(false); }
  };

  // ── Eliminar ───────────────────────────────────────────
  const handleEliminar = async () => {
    if (!confirmar) return;
    try {
      await axios.delete(`${API_URL}/gastos/${confirmar.id_gasto}`, { headers: getAuthHeader() });
      setConfirmar(null);
      await cargarGastos();
    } catch (err) { console.error(err); }
  };

  // ── Helpers ────────────────────────────────────────────
  const formatFecha = (f) => f ? new Date(f).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

  // ── Renders estado ─────────────────────────────────────
  if (cargando) return <div className="gasto-estado"><div className="spinner"/><p>Cargando gastos...</p></div>;
  if (error)    return <div className="gasto-estado gasto-error"><span>⚠️</span><p>{error}</p><button onClick={cargarGastos}>Reintentar</button></div>;

  return (
    <div className="gastos-page">

      {/* ENCABEZADO */}
      <div className="gasto-header">
        <div>
          <h1>Gastos</h1>
          <p>{gastos.length} gastos registrados · Total: ${totalGeneral.toLocaleString("es-AR")}</p>
        </div>
        <button className="btn-primario" onClick={abrirCrear}>+ Nuevo gasto</button>
      </div>

      {/* FILTROS */}
      <div className="gasto-filtros">
        <div className="filtro-grupo">
          <label>Categoría</label>
          <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}>
            <option value="">Todas</option>
            {CATEGORIAS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
        </div>
        <div className="filtro-grupo">
          <label>Forma de pago</label>
          <select value={filtroFormaPago} onChange={e => setFiltroFormaPago(e.target.value)}>
            <option value="">Todas</option>
            {FORMAS_PAGO.map(f => <option key={f} value={f}>{FORMA_PAGO_ICONO[f]} {f}</option>)}
          </select>
        </div>
        <div className="filtro-grupo">
          <label>Desde</label>
          <input type="date" value={filtroFechaDesde} onChange={e => setFiltroFechaDesde(e.target.value)}/>
        </div>
        <div className="filtro-grupo">
          <label>Hasta</label>
          <input type="date" value={filtroFechaHasta} onChange={e => setFiltroFechaHasta(e.target.value)}/>
        </div>
        {hayFiltros && <button className="btn-limpiar" onClick={limpiarFiltros}>✕ Limpiar</button>}
      </div>

      {hayFiltros && (
        <p className="gasto-resultado">
          {gastosFiltrados.length} gastos · Subtotal: ${totalFiltrado.toLocaleString("es-AR")}
        </p>
      )}

      {/* TABLA */}
      {gastosFiltrados.length === 0 ? (
        <div className="gasto-vacio"><span>💸</span><p>{hayFiltros ? "No hay gastos con esos filtros" : "No hay gastos registrados"}</p></div>
      ) : (
        <div className="gasto-tabla-wrapper">
          <table className="gasto-tabla">
            <thead>
              <tr><th>Fecha</th><th>Descripción</th><th>Categoría</th><th>Forma pago</th><th>Monto</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {gastosFiltrados.map(g => (
                <tr key={g.id_gasto}>
                  <td>{formatFecha(g.fecha)}</td>
                  <td><span className="gasto-desc">{g.descripcion}</span></td>
                  <td>
                    {g.categoria
                      ? <span className="badge-cat">{g.categoria}</span>
                      : <span className="texto-suave">—</span>}
                  </td>
                  <td>{FORMA_PAGO_ICONO[g.forma_pago] || "—"} {g.forma_pago || "—"}</td>
                  <td><strong className="gasto-monto">${Number(g.monto).toLocaleString("es-AR")}</strong></td>
                  <td>
                    <div className="acciones">
                      <button className="btn-editar" onClick={() => abrirEditar(g)}>✏️</button>
                      <button className="btn-eliminar" onClick={() => setConfirmar(g)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="total-label">
                  {hayFiltros ? "Subtotal filtrado" : "Total gastos"}
                </td>
                <td className="total-valor">${totalFiltrado.toLocaleString("es-AR")}</td>
                <td/>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* MODAL ABM */}
      {modalABM && (
        <div className="modal-overlay" onClick={cerrarABM}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modoEdicion ? "Editar gasto" : "Nuevo gasto"}</h2>
              <button className="modal-cerrar" onClick={cerrarABM}>✕</button>
            </div>
            <div className="modal-body">
              {mensajeExito && <div className="alerta-exito">✅ {mensajeExito}</div>}
              {erroresForm.general && <div className="alerta-error">⚠️ {erroresForm.general}</div>}

              <div className="form-grid">
                <div className="field-group full-width">
                  <label>Descripción *</label>
                  <input type="text" value={actual.descripcion}
                    onChange={e => setActual({ ...actual, descripcion: e.target.value })}
                    className={erroresForm.descripcion ? "input-error" : ""}
                    placeholder="Ej: Pago de alquiler enero"/>
                  {erroresForm.descripcion && <span className="campo-error">{erroresForm.descripcion}</span>}
                </div>

                <div className="field-group">
                  <label>Monto *</label>
                  <input type="number" min="0" step="0.01" value={actual.monto}
                    onChange={e => setActual({ ...actual, monto: e.target.value })}
                    className={erroresForm.monto ? "input-error" : ""}
                    placeholder="0.00"/>
                  {erroresForm.monto && <span className="campo-error">{erroresForm.monto}</span>}
                </div>

                <div className="field-group">
                  <label>Fecha *</label>
                  <input type="date" value={actual.fecha}
                    onChange={e => setActual({ ...actual, fecha: e.target.value })}
                    className={erroresForm.fecha ? "input-error" : ""}/>
                  {erroresForm.fecha && <span className="campo-error">{erroresForm.fecha}</span>}
                </div>

                <div className="field-group">
                  <label>Categoría</label>
                  <select value={actual.categoria} onChange={e => setActual({ ...actual, categoria: e.target.value })}>
                    <option value="">Sin categoría</option>
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>

                <div className="field-group">
                  <label>Forma de pago</label>
                  <select value={actual.forma_pago} onChange={e => setActual({ ...actual, forma_pago: e.target.value })}>
                    <option value="">Sin especificar</option>
                    {FORMAS_PAGO.map(f => <option key={f} value={f}>{FORMA_PAGO_ICONO[f]} {f}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secundario" onClick={cerrarABM}>Cancelar</button>
              <button className="btn-primario" onClick={handleGuardar} disabled={guardando}>
                {guardando ? "Guardando..." : modoEdicion ? "Guardar cambios" : "Registrar gasto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR ELIMINAR */}
      {confirmar && (
        <div className="modal-overlay" onClick={() => setConfirmar(null)}>
          <div className="modal modal-chico" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Eliminar gasto</h2></div>
            <div className="modal-body">
              <p>¿Eliminás el gasto <strong>{confirmar.descripcion}</strong> por <strong>${Number(confirmar.monto).toLocaleString("es-AR")}</strong>?</p>
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
