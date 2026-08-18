// ============================================================
// CUENTA CORRIENTE.JSX - Saldo y movimientos de clientes
// ============================================================
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import "./CuentaCorriente.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
function getAuthHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

const FORMAS_PAGO = ["efectivo", "transferencia", "debito", "credito"];

export default function CuentaCorriente() {
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [clienteSel, setClienteSel] = useState(null);
  const [cuenta, setCuenta] = useState(null);
  const [cargandoCuenta, setCargandoCuenta] = useState(false);

  // Modal de pago
  const [modalPago, setModalPago] = useState(false);
  const [montoPago, setMontoPago] = useState("");
  const [formaPagoPago, setFormaPagoPago] = useState("");
  const [obsPago, setObsPago] = useState("");
  const [registrandoPago, setRegistrandoPago] = useState(false);
  const [errorPago, setErrorPago] = useState("");

  const cargarClientes = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const { data } = await axios.get(`${API_URL}/cuenta-corriente`, {
        headers: getAuthHeader(),
      });
      setClientes(data);
    } catch (err) {
      console.error(err);
      setError("No se pudo cargar la lista de clientes con saldo.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarClientes();
  }, [cargarClientes]);

  const abrirCliente = useCallback(async (idCliente) => {
    setClienteSel(idCliente);
    setCargandoCuenta(true);
    setCuenta(null);
    try {
      const { data } = await axios.get(`${API_URL}/cuenta-corriente/${idCliente}`, {
        headers: getAuthHeader(),
      });
      setCuenta(data);
    } catch (err) {
      console.error(err);
    } finally {
      setCargandoCuenta(false);
    }
  }, []);

  const abrirModalPago = () => {
    setMontoPago("");
    setFormaPagoPago("");
    setObsPago("");
    setErrorPago("");
    setModalPago(true);
  };

  const registrarPago = async () => {
    setErrorPago("");
    if (!montoPago || Number(montoPago) <= 0) {
      setErrorPago("Ingresá un monto válido.");
      return;
    }
    if (!formaPagoPago) {
      setErrorPago("Seleccioná la forma de pago.");
      return;
    }
    setRegistrandoPago(true);
    try {
      await axios.post(
        `${API_URL}/cuenta-corriente/${clienteSel}/pagos`,
        {
          monto: Number(montoPago),
          forma_pago: formaPagoPago || null,
          observaciones: obsPago || null,
        },
        { headers: getAuthHeader() }
      );
      setModalPago(false);
      await abrirCliente(clienteSel);
      await cargarClientes();
    } catch (err) {
      setErrorPago(err.response?.data?.error || "No se pudo registrar el pago.");
    } finally {
      setRegistrandoPago(false);
    }
  };

  const formatFecha = (f) =>
    new Date(f).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });

  if (cargando)
    return (
      <div className="cc-estado">
        <div className="spinner" />
        <p>Cargando...</p>
      </div>
    );
  if (error)
    return (
      <div className="cc-estado cc-error">
        <span>⚠️</span>
        <p>{error}</p>
        <button onClick={cargarClientes}>Reintentar</button>
      </div>
    );

  return (
    <div className="cc-page">
      <div className="cc-header">
        <div>
          <h1>Cuenta Corriente</h1>
          <p>Clientes con saldo pendiente</p>
        </div>
      </div>

      <div className="cc-layout">
        {/* ── LISTA DE CLIENTES CON SALDO ── */}
        <div className="cc-lista-clientes">
          {clientes.length === 0 ? (
            <div className="cc-vacio">
              <span>✅</span>
              <p>Ningún cliente tiene saldo pendiente.</p>
            </div>
          ) : (
            clientes.map((c) => (
              <button
                key={c.id_usuario}
                className={`cc-cliente-item ${clienteSel === c.id_usuario ? "cc-cliente-activo" : ""}`}
                onClick={() => abrirCliente(c.id_usuario)}
              >
                <span className="cc-cliente-nombre">{c.nombre} {c.apellido}</span>
                <span className="cc-cliente-saldo">${Number(c.saldo).toLocaleString("es-AR")}</span>
              </button>
            ))
          )}
        </div>

        {/* ── DETALLE ── */}
        <div className="cc-detalle">
          {!clienteSel ? (
            <div className="cc-vacio">
              <span>👤</span>
              <p>Elegí un cliente para ver su cuenta.</p>
            </div>
          ) : cargandoCuenta ? (
            <div className="cc-estado">
              <div className="spinner" />
            </div>
          ) : cuenta ? (
            <>
              <div className="cc-detalle-header">
                <div>
                  <h2>{cuenta.cliente.nombre} {cuenta.cliente.apellido}</h2>
                  {cuenta.cliente.dni && <p>DNI {cuenta.cliente.dni}</p>}
                </div>
                <div className="cc-saldo-card">
                  <span>Saldo</span>
                  <strong>${cuenta.saldo.toLocaleString("es-AR")}</strong>
                </div>
                <button className="btn-primario" onClick={abrirModalPago}>
                  + Registrar pago
                </button>
              </div>

              <table className="cc-tabla-movimientos">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Monto</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cuenta.movimientos.map((m) => (
                    <tr key={m.id_movimiento} className={m.tipo === "venta" ? "cc-fila-venta" : "cc-fila-pago"}>
                      <td>{formatFecha(m.fecha)}</td>
                      <td>{m.tipo === "venta" ? "Venta" : "Pago"}</td>
                      <td>
                        {m.tipo === "venta" ? "+" : "−"}${Number(m.monto).toLocaleString("es-AR")}
                      </td>
                      <td>{m.observaciones || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : null}
        </div>
      </div>

      {/* ── MODAL PAGO ── */}
      {modalPago && (
        <div className="modal-overlay" onClick={() => setModalPago(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Registrar pago</h2>
              <button className="modal-cerrar" onClick={() => setModalPago(false)}>✕</button>
            </div>
            <div className="modal-body">
              {errorPago && <div className="alerta-error">⚠️ {errorPago}</div>}
              <div className="field-group">
                <label>Monto *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={montoPago}
                  onChange={(e) => setMontoPago(e.target.value)}
                />
              </div>
              <div className="field-group">
                <label>Forma de pago *</label>
                <select value={formaPagoPago} onChange={(e) => setFormaPagoPago(e.target.value)}>
                  <option value="">Seleccioná...</option>
                  {FORMAS_PAGO.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div className="field-group">
                <label>Observaciones</label>
                <input
                  type="text"
                  value={obsPago}
                  onChange={(e) => setObsPago(e.target.value)}
                  placeholder="Opcional"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secundario" onClick={() => setModalPago(false)}>Cancelar</button>
              <button className="btn-primario" onClick={registrarPago} disabled={registrandoPago}>
                {registrandoPago ? "Guardando..." : "Registrar pago"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}