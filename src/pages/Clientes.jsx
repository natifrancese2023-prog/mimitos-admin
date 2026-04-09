// ============================================================
// CLIENTES.JSX - Gestión completa de clientes
// ============================================================
// Funcionalidades:
// - Listar clientes con búsqueda
// - Agregar, editar y eliminar clientes
// - Ver pedidos de cada cliente
// ============================================================

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "./Clientes.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

function getAuthHeader() {
  const token = localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
}

const CLIENTE_VACIO = {
  nombre: "",
  apellido: "",
  dni: "",
  telefono: "",
  email: "",
  contraseña: "",
  rol: "cliente",
};

const ESTADO_ICONO = {
  pendiente:  "🕐",
  confirmado: "✅",
  entregado:  "📦",
  cancelado:  "❌",
};

const ESTADO_CLASE = {
  pendiente:  "estado-pendiente",
  confirmado: "estado-confirmado",
  entregado:  "estado-entregado",
  cancelado:  "estado-cancelado",
};

export default function Clientes() {
  // ── Datos ────────────────────────────────────────────────
  const [clientes, setClientes]   = useState([]);
  const [cargando, setCargando]   = useState(true);
  const [error, setError]         = useState("");
  const [busqueda, setBusqueda]   = useState("");

  // ── Modal cliente ────────────────────────────────────────
  const [modalCliente,   setModalCliente]   = useState(false);
  const [modoEdicion,    setModoEdicion]    = useState(false);
  const [clienteActual,  setClienteActual]  = useState(CLIENTE_VACIO);
  const [erroresForm,    setErroresForm]    = useState({});
  const [guardando,      setGuardando]      = useState(false);
  const [mensajeExito,   setMensajeExito]   = useState("");

  // ── Modal pedidos ────────────────────────────────────────
  const [clientePedidos,   setClientePedidos]   = useState(null);
  const [pedidos,          setPedidos]          = useState([]);
  const [cargandoPedidos,  setCargandoPedidos]  = useState(false);

  // ── Confirmar eliminar ───────────────────────────────────
  const [confirmarEliminar, setConfirmarEliminar] = useState(null);

  // ============================================================
  // CARGA DE DATOS
  // ============================================================
  const cargarClientes = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const res = await axios.get(`${API_URL}/usuarios`, { headers: getAuthHeader() });
      setClientes(res.data.filter(u => u.rol === "cliente"));
    } catch (err) {
      setError("No se pudieron cargar los clientes.");
      console.error(err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarClientes(); }, [cargarClientes]);

  // ============================================================
  // BÚSQUEDA
  // ============================================================
  const clientesFiltrados = clientes.filter(c => {
    const q = busqueda.toLowerCase();
    return (
      c.nombre?.toLowerCase().includes(q) ||
      c.apellido?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.dni?.includes(q) ||
      c.telefono?.includes(q)
    );
  });
// ============================================================
  // VALIDACIÓN (Solo para Creación de Clientes)
  // ============================================================
  function validarCliente(c, esEdicion) {
    const err = {};

    // Validaciones básicas de datos personales
    if (!c.nombre?.trim()) err.nombre = "El nombre es obligatorio";
    if (!c.apellido?.trim()) err.apellido = "El apellido es obligatorio";
    
    if (!c.dni?.trim()) {
      err.dni = "El DNI es obligatorio";
    } else if (!/^\d{7,8}$/.test(c.dni)) {
      err.dni = "El DNI debe tener 7 u 8 dígitos";
    }

    if (!c.telefono?.trim()) {
      err.telefono = "El teléfono es obligatorio";
    } else if (!/^\d{8,}$/.test(c.telefono)) {
      err.telefono = "Mínimo 8 dígitos";
    }

    if (!c.email?.trim()) {
      err.email = "El email es obligatorio";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) {
      err.email = "Email inválido";
    }


    
    return err;
  }
  // ============================================================
  // MODAL CLIENTE
  // ============================================================
  const abrirCrear = () => {
    setClienteActual(CLIENTE_VACIO);
    setErroresForm({});
    setMensajeExito("");
    setModoEdicion(false);
    setModalCliente(true);
  };

  const abrirEditar = (cliente) => {
    setClienteActual({
      id_usuario: cliente.id_usuario,
      nombre:     cliente.nombre,
      apellido:   cliente.apellido,
      dni:        cliente.dni,
      telefono:   cliente.telefono,
      email:      cliente.email,
      contraseña: "",
      rol:        cliente.rol,
    });
    setErroresForm({});
    setMensajeExito("");
    setModoEdicion(true);
    setModalCliente(true);
  };

  const cerrarModal = () => {
    setModalCliente(false);
    setErroresForm({});
    setMensajeExito("");
  };

  // ============================================================
  // GUARDAR CLIENTE
  // ============================================================
  const handleGuardar = async () => {
    const errores = validarCliente(clienteActual, modoEdicion);
    setErroresForm(errores);
    if (Object.keys(errores).length > 0) return;

    setGuardando(true);
    try {
      if (modoEdicion) {
        await axios.put(
          `${API_URL}/usuarios/${clienteActual.id_usuario}`,
          {
            nombre:   clienteActual.nombre.trim(),
            apellido: clienteActual.apellido.trim(),
            dni:      clienteActual.dni.trim(),
            telefono: clienteActual.telefono.trim(),
            email:    clienteActual.email.trim(),
            rol:      clienteActual.rol,
          },
          { headers: getAuthHeader() }
        );
        setMensajeExito("Cliente actualizado correctamente");
      } else {
        await axios.post(
          `${API_URL}/usuarios/registro`,
          {
            nombre:    clienteActual.nombre.trim(),
            apellido:  clienteActual.apellido.trim(),
            dni:       clienteActual.dni.trim(),
            telefono:  clienteActual.telefono.trim(),
            email:     clienteActual.email.trim(),
            contraseña: clienteActual.contraseña,
            rol:       "cliente",
          },
          { headers: getAuthHeader() }
        );
        setMensajeExito("Cliente creado correctamente");
      }

      await cargarClientes();
      setTimeout(() => cerrarModal(), 1200);
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.errores?.[0]?.msg ||
        "Error al guardar el cliente";
      setErroresForm({ general: msg });
    } finally {
      setGuardando(false);
    }
  };

  // ============================================================
  // ELIMINAR CLIENTE
  // ============================================================
  const handleEliminar = async () => {
    if (!confirmarEliminar) return;
    try {
      await axios.delete(`${API_URL}/usuarios/${confirmarEliminar.id_usuario}`, {
        headers: getAuthHeader(),
      });
      setConfirmarEliminar(null);
      await cargarClientes();
    } catch (err) {
      console.error("Error al eliminar:", err);
    }
  };

  // ============================================================
  // VER PEDIDOS DEL CLIENTE
  // ============================================================
  const abrirPedidos = async (cliente) => {
    setClientePedidos(cliente);
    setCargandoPedidos(true);
    setPedidos([]);
    try {
      const res = await axios.get(`${API_URL}/usuarios/${cliente.id_usuario}/pedidos`, {
        headers: getAuthHeader(),
      });
      setPedidos(res.data);
    } catch (err) {
      console.error("Error cargando pedidos:", err);
    } finally {
      setCargandoPedidos(false);
    }
  };

  const cerrarPedidos = () => {
    setClientePedidos(null);
    setPedidos([]);
  };

  // ============================================================
  // HELPERS
  // ============================================================
  const formatFecha = (fecha) => {
    if (!fecha) return "—";
    return new Date(fecha).toLocaleDateString("es-AR", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  };

  const totalGastado = (pedidos) =>
    pedidos
      .filter(p => p.estado === "entregado")
      .reduce((acc, p) => acc + Number(p.total || 0), 0);

  // ============================================================
  // RENDERS DE ESTADO
  // ============================================================
  if (cargando) return (
    <div className="cli-estado">
      <div className="spinner" /><p>Cargando clientes...</p>
    </div>
  );

  if (error) return (
    <div className="cli-estado cli-error">
      <span>⚠️</span><p>{error}</p>
      <button onClick={cargarClientes}>Reintentar</button>
    </div>
  );

  // ============================================================
  // RENDER PRINCIPAL
  // ============================================================
  return (
    <div className="clientes-page">

      {/* ── ENCABEZADO ───────────────────────────────────── */}
      <div className="cli-header">
        <div>
          <h1>Clientes</h1>
          <p>{clientes.length} clientes registrados</p>
        </div>
        <button className="btn-primario" onClick={abrirCrear}>
          + Nuevo cliente
        </button>
      </div>

      {/* ── BÚSQUEDA ─────────────────────────────────────── */}
      <div className="cli-busqueda">
        <span className="busqueda-icono">🔍</span>
        <input
          type="text"
          placeholder="Buscar por nombre, apellido, email, DNI o teléfono..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
        {busqueda && (
          <button className="busqueda-limpiar" onClick={() => setBusqueda("")}>✕</button>
        )}
      </div>

      {busqueda && (
        <p className="cli-resultado">
          {clientesFiltrados.length} resultado{clientesFiltrados.length !== 1 ? "s" : ""} para "{busqueda}"
        </p>
      )}

      {/* ── TABLA ────────────────────────────────────────── */}
      {clientesFiltrados.length === 0 ? (
        <div className="cli-vacio">
          <span>👥</span>
          <p>{busqueda ? "No hay clientes que coincidan con la búsqueda" : "No hay clientes registrados"}</p>
        </div>
      ) : (
        <div className="cli-tabla-wrapper">
          <table className="cli-tabla">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>DNI</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.map(c => (
                <tr key={c.id_usuario}>
                  <td>
                    <div className="cli-avatar-nombre">
                      <div className="cli-avatar">
                        {c.nombre?.[0]?.toUpperCase()}{c.apellido?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <span className="cli-nombre">{c.nombre} {c.apellido}</span>
                      </div>
                    </div>
                  </td>
                  <td>{c.dni}</td>
                  <td>{c.telefono}</td>
                  <td>{c.email}</td>
                  <td>
                    <div className="acciones">
                      <button className="btn-ver" onClick={() => abrirPedidos(c)}>
                        🛒 Pedidos
                      </button>
                      <button className="btn-editar" onClick={() => abrirEditar(c)}>✏️</button>
                      <button className="btn-eliminar" onClick={() => setConfirmarEliminar(c)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODAL: CREAR / EDITAR CLIENTE ────────────────── */}
      {modalCliente && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modoEdicion ? "Editar cliente" : "Nuevo cliente"}</h2>
              <button className="modal-cerrar" onClick={cerrarModal}>✕</button>
            </div>

            <div className="modal-body">
              {mensajeExito && <div className="alerta-exito">✅ {mensajeExito}</div>}
              {erroresForm.general && <div className="alerta-error">⚠️ {erroresForm.general}</div>}

              <div className="form-grid">
                <div className="field-group">
                  <label>Nombre *</label>
                  <input
                    type="text"
                    value={clienteActual.nombre}
                    onChange={e => setClienteActual({ ...clienteActual, nombre: e.target.value })}
                    className={erroresForm.nombre ? "input-error" : ""}
                  />
                  {erroresForm.nombre && <span className="campo-error">{erroresForm.nombre}</span>}
                </div>

                <div className="field-group">
                  <label>Apellido *</label>
                  <input
                    type="text"
                    value={clienteActual.apellido}
                    onChange={e => setClienteActual({ ...clienteActual, apellido: e.target.value })}
                    className={erroresForm.apellido ? "input-error" : ""}
                  />
                  {erroresForm.apellido && <span className="campo-error">{erroresForm.apellido}</span>}
                </div>

                <div className="field-group">
                  <label>DNI *</label>
                  <input
                    type="text"
                    value={clienteActual.dni}
                    onChange={e => setClienteActual({ ...clienteActual, dni: e.target.value })}
                    className={erroresForm.dni ? "input-error" : ""}
                  />
                  {erroresForm.dni && <span className="campo-error">{erroresForm.dni}</span>}
                </div>

                <div className="field-group">
                  <label>Teléfono *</label>
                  <input
                    type="text"
                    value={clienteActual.telefono}
                    onChange={e => setClienteActual({ ...clienteActual, telefono: e.target.value })}
                    className={erroresForm.telefono ? "input-error" : ""}
                  />
                  {erroresForm.telefono && <span className="campo-error">{erroresForm.telefono}</span>}
                </div>

                <div className="field-group full-width">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={clienteActual.email}
                    onChange={e => setClienteActual({ ...clienteActual, email: e.target.value })}
                    className={erroresForm.email ? "input-error" : ""}
                  />
                  {erroresForm.email && <span className="campo-error">{erroresForm.email}</span>}
                </div>

                
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secundario" onClick={cerrarModal}>Cancelar</button>
              <button className="btn-primario" onClick={handleGuardar} disabled={guardando}>
                {guardando ? "Guardando..." : modoEdicion ? "Guardar cambios" : "Crear cliente"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: PEDIDOS DEL CLIENTE ────────────────────── */}
      {clientePedidos && (
        <div className="modal-overlay" onClick={cerrarPedidos}>
          <div className="modal modal-grande" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Pedidos de {clientePedidos.nombre} {clientePedidos.apellido}</h2>
                <p className="modal-subtitulo">{clientePedidos.email}</p>
              </div>
              <button className="modal-cerrar" onClick={cerrarPedidos}>✕</button>
            </div>

            <div className="modal-body">
              {cargandoPedidos ? (
                <div className="cli-estado"><div className="spinner" /><p>Cargando...</p></div>
              ) : pedidos.length === 0 ? (
                <div className="cli-vacio">
                  <span>🛒</span>
                  <p>Este cliente no tiene pedidos todavía</p>
                </div>
              ) : (
                <>
                  {/* Resumen del cliente */}
                  <div className="cli-resumen-pedidos">
                    <div className="resumen-item">
                      <span className="resumen-valor">{pedidos.length}</span>
                      <span className="resumen-label">Pedidos totales</span>
                    </div>
                    <div className="resumen-item">
                      <span className="resumen-valor">
                        {pedidos.filter(p => p.estado === "entregado").length}
                      </span>
                      <span className="resumen-label">Entregados</span>
                    </div>
                    <div className="resumen-item">
                      <span className="resumen-valor">
                        ${totalGastado(pedidos).toLocaleString("es-AR")}
                      </span>
                      <span className="resumen-label">Total gastado</span>
                    </div>
                  </div>

                  {/* Tabla de pedidos */}
                  <table className="cli-pedidos-tabla">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Fecha</th>
                        <th>Total</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pedidos.map(p => (
                        <tr key={p.id_pedido}>
                          <td className="ped-id">#{p.id_pedido}</td>
                          <td>{formatFecha(p.fecha)}</td>
                          <td>${Number(p.total).toLocaleString("es-AR")}</td>
                          <td>
                            <span className={`badge-estado ${ESTADO_CLASE[p.estado]}`}>
                              {ESTADO_ICONO[p.estado]} {p.estado}
                            </span>
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

      {/* ── MODAL: CONFIRMAR ELIMINACIÓN ─────────────────── */}
      {confirmarEliminar && (
        <div className="modal-overlay" onClick={() => setConfirmarEliminar(null)}>
          <div className="modal modal-chico" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Eliminar cliente</h2>
            </div>
            <div className="modal-body">
              <p>
                ¿Estás seguro que querés eliminar a{" "}
                <strong>{confirmarEliminar.nombre} {confirmarEliminar.apellido}</strong>?
                Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-secundario" onClick={() => setConfirmarEliminar(null)}>
                Cancelar
              </button>
              <button className="btn-danger" onClick={handleEliminar}>
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
