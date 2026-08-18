// ============================================================
// VENTA DIRECTA.JSX - Venta rápida a consumidor final (mostrador)
// ============================================================
// ACTUALIZACIÓN (Fase 1): selección de cliente -- Consumidor Final
// o cliente registrado. Reutiliza GET /usuarios existente (no hay
// endpoint de búsqueda de clientes separado; se filtra en frontend
// por rol === 'cliente', mismo patrón que ya usa ModalProductoProveedor
// con el catálogo de productos).
// ============================================================
import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import "./VentaDirecta.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
function getAuthHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

const FORMAS_PAGO = ["efectivo", "transferencia", "debito", "credito"];
const FORMA_PAGO_ICONO = { efectivo: "💵", transferencia: "🏦", debito: "💳", credito: "💳" };
const ID_CONSUMIDOR_FINAL = 2;

export default function VentaDirecta() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // Búsqueda de productos
  const [busqueda, setBusqueda] = useState("");

  // Carrito: cada línea = { id_producto, id_variante, nombre, nombre_variante, cantidad, precio_unitario, stockDisponible }
  const [carrito, setCarrito] = useState([]);

  // ── Cliente ──────────────────────────────────────────────
  const [clientes, setClientes] = useState([]);
  const [modoCliente, setModoCliente] = useState("consumidor_final"); // "consumidor_final" | "registrado"
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [buscadorClienteAbierto, setBuscadorClienteAbierto] = useState(false);

  // Datos de la venta
  const [formaPago, setFormaPago] = useState("");
  const [observaciones, setObservaciones] = useState("");

  // FASE 2 -- Cuenta corriente. Solo aplica con cliente registrado
  // (Consumidor Final siempre es contado, se valida también en el
  // backend). "entrega" es cuánto paga en el momento; el resto queda
  // como deuda en cuenta corriente.
  const [tipoCobro, setTipoCobro] = useState("contado"); // "contado" | "cuenta_corriente"
  const [entrega, setEntrega] = useState("");

  const [registrando, setRegistrando] = useState(false);
  const [errorVenta, setErrorVenta] = useState("");
  const [exitoVenta, setExitoVenta] = useState("");

  // ── Carga de productos y clientes ──────────────────────
  const cargarProductos = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const [resProd, resUsuarios] = await Promise.all([
        axios.get(`${API_URL}/productos`, { headers: getAuthHeader() }),
        axios.get(`${API_URL}/usuarios`, { headers: getAuthHeader() }),
      ]);
      setProductos(resProd.data);
      // GET /usuarios trae todos los roles -- nos quedamos solo con
      // los clientes, el buscador nunca debería listar dueños.
      setClientes(resUsuarios.data.filter((u) => u.rol === "cliente"));
    } catch (err) {
      setError("No se pudieron cargar los productos.");
      console.error(err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarProductos(); }, [cargarProductos]);

  // ── Filtro de búsqueda de productos ────────────────────
  const productosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return productos;
    const q = busqueda.trim().toLowerCase();
    return productos.filter((p) => p.nombre.toLowerCase().includes(q));
  }, [productos, busqueda]);

  // ── Filtro de búsqueda de clientes ─────────────────────
  const clientesFiltrados = useMemo(() => {
    if (!busquedaCliente.trim()) return clientes.slice(0, 20);
    const q = busquedaCliente.trim().toLowerCase();
    return clientes
      .filter(
        (c) =>
          `${c.nombre} ${c.apellido}`.toLowerCase().includes(q) ||
          c.dni?.toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [clientes, busquedaCliente]);

  const elegirModoConsumidorFinal = () => {
    setModoCliente("consumidor_final");
    setClienteSeleccionado(null);
    setBuscadorClienteAbierto(false);
    setBusquedaCliente("");
    setTipoCobro("contado");
    setEntrega("");
  };

  const elegirCliente = (cliente) => {
    setModoCliente("registrado");
    setClienteSeleccionado(cliente);
    setBuscadorClienteAbierto(false);
    setBusquedaCliente("");
  };

  // ── Agregar al carrito ──────────────────────────────────
  // Si el producto tiene variantes, cada variante se agrega por separado.
  // Si no tiene variantes, se agrega el producto "simple".
  const agregarAlCarrito = useCallback((producto, variante = null) => {
    const idVariante = variante ? variante.id_variante : null;
    const precio = variante ? variante.precio_venta : producto.precio_min;
    const stockDisponible = variante ? variante.stock : producto.stock_total;

    if (!stockDisponible || stockDisponible <= 0) return;

    setCarrito((prev) => {
      const idx = prev.findIndex(
        (l) => l.id_producto === producto.id_producto && l.id_variante === idVariante
      );
      if (idx >= 0) {
        // Ya está en el carrito: sumar 1 si hay stock suficiente
        const linea = prev[idx];
        if (linea.cantidad + 1 > stockDisponible) return prev;
        const copia = [...prev];
        copia[idx] = { ...linea, cantidad: linea.cantidad + 1 };
        return copia;
      }
      return [
        ...prev,
        {
          id_producto: producto.id_producto,
          id_variante: idVariante,
          nombre: producto.nombre,
          nombre_variante: variante ? variante.nombre_variante : null,
          cantidad: 1,
          precio_unitario: precio || 0,
          stockDisponible,
        },
      ];
    });
  }, []);

  const cambiarCantidad = useCallback((idx, delta) => {
    setCarrito((prev) =>
      prev.map((l, i) => {
        if (i !== idx) return l;
        const nuevaCantidad = l.cantidad + delta;
        if (nuevaCantidad < 1) return l;
        if (nuevaCantidad > l.stockDisponible) return l;
        return { ...l, cantidad: nuevaCantidad };
      })
    );
  }, []);

  const cambiarPrecio = useCallback((idx, valor) => {
    setCarrito((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, precio_unitario: valor } : l))
    );
  }, []);

  const quitarLinea = useCallback((idx) => {
    setCarrito((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const limpiarCarrito = useCallback(() => {
    setCarrito([]);
    setFormaPago("");
    setObservaciones("");
    setErrorVenta("");
    setExitoVenta("");
  }, []);

  // ── Total ────────────────────────────────────────────────
  const total = useMemo(
    () =>
      carrito.reduce((acc, l) => acc + Number(l.cantidad || 0) * Number(l.precio_unitario || 0), 0),
    [carrito]
  );

  // ── Registrar venta ──────────────────────────────────────
  const handleRegistrarVenta = useCallback(async () => {
    setErrorVenta("");
    setExitoVenta("");

    if (carrito.length === 0) {
      setErrorVenta("Agregá al menos un producto al carrito");
      return;
    }
    if (!formaPago) {
      setErrorVenta("Seleccioná la forma de pago");
      return;
    }
    if (modoCliente === "registrado" && !clienteSeleccionado) {
      setErrorVenta("Seleccioná un cliente o cambiá a Consumidor Final");
      return;
    }

    let montoPagado = total;
    if (tipoCobro === "cuenta_corriente") {
      montoPagado = entrega === "" ? 0 : Number(entrega);
      if (montoPagado < 0 || montoPagado > total) {
        setErrorVenta("La entrega no puede ser negativa ni mayor al total.");
        return;
      }
    }

    for (const l of carrito) {
      if (!l.precio_unitario || Number(l.precio_unitario) <= 0) {
        setErrorVenta("Todos los productos deben tener un precio válido");
        return;
      }
    }

    setRegistrando(true);
    try {
      await axios.post(
        `${API_URL}/ventas/directa`,
        {
          forma_pago: formaPago,
          observaciones: observaciones || null,
          id_cliente:
            modoCliente === "registrado" ? clienteSeleccionado.id_usuario : ID_CONSUMIDOR_FINAL,
          monto_pagado: montoPagado,
          productos: carrito.map((l) => ({
            id_producto: l.id_producto,
            id_variante: l.id_variante,
            cantidad: Number(l.cantidad),
            precio_unitario: Number(l.precio_unitario),
          })),
        },
        { headers: getAuthHeader() }
      );
      setExitoVenta("Venta registrada correctamente");
      setCarrito([]);
      setFormaPago("");
      setObservaciones("");
      setTipoCobro("contado");
      setEntrega("");
      elegirModoConsumidorFinal();
      await cargarProductos(); // refresca stock
    } catch (err) {
      if (err.response?.status === 409) {
        setErrorVenta(err.response.data?.error || "Stock insuficiente");
      } else {
        setErrorVenta(err.response?.data?.error || "Error al registrar la venta");
      }
    } finally {
      setRegistrando(false);
    }
  }, [carrito, formaPago, observaciones, modoCliente, clienteSeleccionado, tipoCobro, entrega, total, cargarProductos]);

  // ── Renders estado ───────────────────────────────────────
  if (cargando)
    return (
      <div className="vd-estado">
        <div className="spinner" />
        <p>Cargando productos...</p>
      </div>
    );
  if (error)
    return (
      <div className="vd-estado vd-error">
        <span>⚠️</span>
        <p>{error}</p>
        <button onClick={cargarProductos}>Reintentar</button>
      </div>
    );

  return (
    <div className="vd-page">
      {/* ── ENCABEZADO ── */}
      <div className="vd-header">
        <div>
          <h1>Venta directa</h1>
          <p>Venta rápida a consumidor final o cliente registrado</p>
        </div>
      </div>

      <div className="vd-layout">
        {/* ── PANEL IZQUIERDO: catálogo ── */}
        <div className="vd-panel-productos">
          <div className="vd-busqueda">
            <span className="busqueda-icono">🔍</span>
            <input
              type="text"
              placeholder="Buscar producto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button className="busqueda-limpiar" onClick={() => setBusqueda("")}>✕</button>
            )}
          </div>

          <div className="vd-grid-productos">
            {productosFiltrados.length === 0 ? (
              <div className="vd-vacio">
                <span>📦</span>
                <p>No se encontraron productos</p>
              </div>
            ) : (
              productosFiltrados.map((p) => {
                const sinVariantes = !p.variantes || p.variantes.length === 0;
                return (
                  <div className="vd-card-producto" key={p.id_producto}>
                    <div className="vd-card-nombre">{p.nombre}</div>

                    {sinVariantes ? (
                      <button
                        className="vd-card-agregar"
                        disabled={!p.stock_total || p.stock_total <= 0}
                        onClick={() => agregarAlCarrito(p)}
                      >
                        <span>${Number(p.precio_min || 0).toLocaleString("es-AR")}</span>
                        <span className="vd-card-stock">
                          {p.stock_total > 0 ? `Stock: ${p.stock_total}` : "Sin stock"}
                        </span>
                      </button>
                    ) : (
                      <div className="vd-card-variantes">
                        {p.variantes.map((v) => (
                          <button
                            key={v.id_variante}
                            className="vd-card-agregar vd-card-agregar--chico"
                            disabled={!v.stock || v.stock <= 0}
                            onClick={() => agregarAlCarrito(p, v)}
                          >
                            <span className="vd-variante-nombre">{v.nombre_variante}</span>
                            <span>${Number(v.precio_venta || 0).toLocaleString("es-AR")}</span>
                            <span className="vd-card-stock">
                              {v.stock > 0 ? `Stock: ${v.stock}` : "Sin stock"}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── PANEL DERECHO: carrito ── */}
        <div className="vd-panel-carrito">
          <div className="vd-carrito-header">
            <h2>🛒 Carrito</h2>
            {carrito.length > 0 && (
              <button className="btn-limpiar" onClick={limpiarCarrito}>✕ Vaciar</button>
            )}
          </div>

          {/* ── SELECTOR DE CLIENTE ── */}
          <div className="vd-cliente-selector">
            <div className="vd-cliente-toggle">
              <button
                className={modoCliente === "consumidor_final" ? "vd-toggle-activo" : ""}
                onClick={elegirModoConsumidorFinal}
              >
                Consumidor Final
              </button>
              <button
                className={modoCliente === "registrado" ? "vd-toggle-activo" : ""}
                onClick={() => setBuscadorClienteAbierto(true)}
              >
                Cliente registrado
              </button>
            </div>

            {modoCliente === "registrado" && clienteSeleccionado && (
              <div className="vd-cliente-elegido">
                👤 {clienteSeleccionado.nombre} {clienteSeleccionado.apellido}
                {clienteSeleccionado.dni ? ` — DNI ${clienteSeleccionado.dni}` : ""}
                <button onClick={() => setBuscadorClienteAbierto(true)}>Cambiar</button>
              </div>
            )}

            {modoCliente === "registrado" && clienteSeleccionado && (
              <div className="vd-cobro-selector">
                <div className="vd-cliente-toggle">
                  <button
                    className={tipoCobro === "contado" ? "vd-toggle-activo" : ""}
                    onClick={() => { setTipoCobro("contado"); setEntrega(""); }}
                  >
                    Contado
                  </button>
                  <button
                    className={tipoCobro === "cuenta_corriente" ? "vd-toggle-activo" : ""}
                    onClick={() => setTipoCobro("cuenta_corriente")}
                  >
                    Cuenta corriente
                  </button>
                </div>

                {tipoCobro === "cuenta_corriente" && (
                  <div className="field-group vd-entrega">
                    <label>Entrega ahora (0 = todo a cuenta corriente)</label>
                    <input
                      type="number"
                      min="0"
                      max={total}
                      step="0.01"
                      value={entrega}
                      onChange={(e) => setEntrega(e.target.value)}
                      placeholder="0"
                    />
                    <span className="vd-entrega-resto">
                      Queda a cuenta: $
                      {Math.max(0, total - Number(entrega || 0)).toLocaleString("es-AR")}
                    </span>
                  </div>
                )}
              </div>
            )}

            {buscadorClienteAbierto && (
              <div className="vd-cliente-buscador">
                <input
                  type="text"
                  autoFocus
                  placeholder="Buscar por nombre o DNI..."
                  value={busquedaCliente}
                  onChange={(e) => setBusquedaCliente(e.target.value)}
                />
                <ul>
                  {clientesFiltrados.length === 0 ? (
                    <li className="vd-cliente-sin-resultados">Sin resultados</li>
                  ) : (
                    clientesFiltrados.map((c) => (
                      <li key={c.id_usuario}>
                        <button onClick={() => elegirCliente(c)}>
                          {c.nombre} {c.apellido}
                          {c.dni ? ` — DNI ${c.dni}` : ""}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
                <button
                  className="vd-cliente-cerrar"
                  onClick={() => setBuscadorClienteAbierto(false)}
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>

          {exitoVenta && <div className="alerta-exito">✅ {exitoVenta}</div>}
          {errorVenta && <div className="alerta-error">⚠️ {errorVenta}</div>}

          {carrito.length === 0 ? (
            <div className="vd-carrito-vacio">
              <span>🛒</span>
              <p>Agregá productos desde el catálogo</p>
            </div>
          ) : (
            <div className="vd-lineas-carrito">
              {carrito.map((l, idx) => (
                <div className="vd-linea-carrito" key={`${l.id_producto}-${l.id_variante}`}>
                  <div className="vd-linea-info">
                    <span className="vd-linea-nombre">
                      {l.nombre}
                      {l.nombre_variante ? ` (${l.nombre_variante})` : ""}
                    </span>
                    <div className="vd-linea-precio-wrap">
                      <span>$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={l.precio_unitario}
                        onChange={(e) => cambiarPrecio(idx, e.target.value)}
                        className="vd-linea-precio"
                      />
                      <span className="vd-linea-subtotal">
                        = ${(Number(l.cantidad) * Number(l.precio_unitario || 0)).toLocaleString("es-AR")}
                      </span>
                    </div>
                  </div>
                  <div className="vd-linea-cantidad">
                    <button onClick={() => cambiarCantidad(idx, -1)}>−</button>
                    <span>{l.cantidad}</span>
                    <button onClick={() => cambiarCantidad(idx, 1)}>+</button>
                  </div>
                  <button className="btn-eliminar-linea" onClick={() => quitarLinea(idx)}>🗑️</button>
                </div>
              ))}
            </div>
          )}

          <div className="vd-carrito-footer">
            <div className="field-group">
              <label>Forma de pago *</label>
              <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)}>
                <option value="">Seleccioná...</option>
                {FORMAS_PAGO.map((f) => (
                  <option key={f} value={f}>{FORMA_PAGO_ICONO[f]} {f}</option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label>Observaciones</label>
              <input
                type="text"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Opcional"
              />
            </div>

            <div className="vd-total">
              Total: <strong>${total.toLocaleString("es-AR")}</strong>
            </div>

            <button
              className="btn-primario vd-btn-confirmar"
              onClick={handleRegistrarVenta}
              disabled={registrando || carrito.length === 0}
            >
              {registrando ? "Registrando..." : "Confirmar venta"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}