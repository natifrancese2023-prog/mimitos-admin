// ============================================================
// COMPRAS SUGERIDAS - Motor de sugerencia de abastecimiento
// ============================================================
// No modifica stock, kardex, costos ni producto_proveedor.
// Al confirmar, solo crea registros "Compra Sugerida Pendiente".
// La compra real se registra desde el módulo Compras existente
// (fase 5, todavía no implementada en este archivo).
// ============================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./ComprasSugeridas.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
function getAuthHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

const OPCIONES_DIAS = [7, 15, 30, 60];

export default function ComprasSugeridas() {
  const navigate = useNavigate();

  const [periodoAnalisisDias, setPeriodoAnalisisDias] = useState(30);
  const [periodoCoberturaDias, setPeriodoCoberturaDias] = useState(15);

  const [calculando, setCalculando] = useState(false);
  const [errorCalculo, setErrorCalculo] = useState("");
  const [generadoEn, setGeneradoEn] = useState(null);

  // Filas de la grilla. Cada fila es una copia editable de lo que
  // devolvió el motor -- nada de esto está guardado hasta confirmar.
  const [filas, setFilas] = useState([]);

  // Alternativas de proveedor por fila, cacheadas por clave
  // "idProducto-idVariante" para no repetir el fetch si el usuario
  // abre el mismo selector varias veces.
  const [alternativasPorClave, setAlternativasPorClave] = useState({});
  const [cargandoAlternativas, setCargandoAlternativas] = useState(null); // clave en curso

  // Agregar producto manualmente
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);
  const [productos, setProductos] = useState([]);
  const [cargandoProductos, setCargandoProductos] = useState(false);

  const [confirmando, setConfirmando] = useState(false);
  const [errorConfirmar, setErrorConfirmar] = useState("");
  const [resultadoConfirmar, setResultadoConfirmar] = useState(null);

  // ── Pendientes ya confirmadas (para descargar el PDF) ──
  const [pendientes, setPendientes] = useState([]);
  const [cargandoPendientes, setCargandoPendientes] = useState(true);
  const [descargando, setDescargando] = useState(null); // id en curso

  const cargarPendientes = useCallback(async () => {
    setCargandoPendientes(true);
    try {
      const { data } = await axios.get(`${API_URL}/compras-sugeridas`, {
        headers: getAuthHeader(),
      });
      setPendientes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setCargandoPendientes(false);
    }
  }, []);

  useEffect(() => {
    cargarPendientes();
  }, [cargarPendientes]);

  const descargarPDF = async (cs) => {
    setDescargando(cs.id_compra_sugerida);
    try {
      const res = await axios.get(
        `${API_URL}/compras-sugeridas/${cs.id_compra_sugerida}/pdf`,
        { headers: getAuthHeader(), responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `pedido-${cs.proveedor_nombre.replace(/\s+/g, "_")}-${cs.id_compra_sugerida}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("No se pudo generar el PDF.");
    } finally {
      setDescargando(null);
    }
  };

  // FASE 5 -- pide los datos de precarga y navega a Compras, que ya
  // sabe interpretarlos (location.state.precargaSugerida). El registro
  // real, y la vinculación de vuelta hacia esta compra sugerida, los
  // termina Compras.jsx cuando el usuario confirme ahí -- acá no se
  // duplica nada de esa lógica.
  const registrarCompra = async (cs) => {
    try {
      const { data } = await axios.get(
        `${API_URL}/compras-sugeridas/${cs.id_compra_sugerida}/preparar-compra`,
        { headers: getAuthHeader() }
      );

      navigate("/panel/compras", {
        state: {
          precargaSugerida: {
            idCompraSugerida: cs.id_compra_sugerida,
            id_proveedor: data.id_proveedor,
            productos: data.productos,
          },
        },
      });
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "No se pudo preparar la compra.");
    }
  };

  const claveFila = (f) => `${f.id_producto}-${f.id_variante ?? 0}`;

  // ── Generar sugerencia ──────────────────────────────────
  const generar = useCallback(async () => {
    setCalculando(true);
    setErrorCalculo("");
    setResultadoConfirmar(null);
    try {
      const { data } = await axios.get(`${API_URL}/compras-sugeridas/calcular`, {
        params: { periodoAnalisisDias, periodoCoberturaDias },
        headers: getAuthHeader(),
      });

      setFilas(
        data.sugerencias.map((s) => ({
          ...s,
          // id_proveedor plano, para poder cambiarlo desde el select
          // sin perder el resto de los datos del proveedor elegido.
          id_proveedor: s.proveedor?.id_proveedor ?? null,
          proveedor_nombre: s.proveedor?.nombre ?? null,
          cantidad_editable_unidades: s.cantidad_sugerida_unidades,
          quitado: false,
        }))
      );
      setGeneradoEn(data.generado_en);
      setAlternativasPorClave({});
    } catch (err) {
      console.error(err);
      setErrorCalculo(err.response?.data?.error || "No se pudo calcular la sugerencia.");
      setFilas([]);
    } finally {
      setCalculando(false);
    }
  }, [periodoAnalisisDias, periodoCoberturaDias]);

  // ── Edición de cantidad ─────────────────────────────────
  const cambiarCantidad = (clave, valor) => {
    setFilas((prev) =>
      prev.map((f) =>
        claveFila(f) === clave ? { ...f, cantidad_editable_unidades: valor } : f
      )
    );
  };

  const quitarFila = (clave) => {
    setFilas((prev) => prev.filter((f) => claveFila(f) !== clave));
  };

  // ── Cambiar proveedor ───────────────────────────────────
  const cargarAlternativas = async (fila) => {
    const clave = claveFila(fila);
    if (alternativasPorClave[clave]) return; // ya cacheado

    setCargandoAlternativas(clave);
    try {
      const { data } = await axios.get(
        `${API_URL}/compras-sugeridas/proveedores-disponibles`,
        {
          params: { idProducto: fila.id_producto, idVariante: fila.id_variante || undefined },
          headers: getAuthHeader(),
        }
      );
      setAlternativasPorClave((prev) => ({ ...prev, [clave]: data }));
    } catch (err) {
      console.error(err);
    } finally {
      setCargandoAlternativas(null);
    }
  };

  const cambiarProveedor = (clave, idProveedorNuevo) => {
    setFilas((prev) =>
      prev.map((f) => {
        if (claveFila(f) !== clave) return f;
        const alternativas = alternativasPorClave[clave] || [];
        const elegido = alternativas.find(
          (a) => String(a.id_proveedor) === String(idProveedorNuevo)
        );
        if (!elegido) return f;

        return {
          ...f,
          id_proveedor: elegido.id_proveedor,
          proveedor_nombre: elegido.proveedor_nombre,
          sin_proveedor: false,
          presentacion_compra: elegido.presentacion_compra,
          costo_unitario_estimado: elegido.costo_efectivo,
        };
      })
    );
  };

  // ── Agregar producto manualmente ────────────────────────
  const abrirBuscador = async () => {
    setBuscadorAbierto(true);
    if (productos.length > 0) return;
    setCargandoProductos(true);
    try {
      const { data } = await axios.get(`${API_URL}/productos`, {
        headers: getAuthHeader(),
      });
      setProductos(data);
    } catch (err) {
      console.error(err);
    } finally {
      setCargandoProductos(false);
    }
  };

  const agregarProductoManual = async (producto, variante) => {
    const idVariante = variante?.id_variante ?? null;
    const clave = `${producto.id_producto}-${idVariante ?? 0}`;

    if (filas.some((f) => claveFila(f) === clave)) {
      setBuscadorAbierto(false);
      return; // ya está en la grilla
    }

    const nuevaFila = {
      id_producto: producto.id_producto,
      id_variante: idVariante,
      producto: producto.nombre,
      variante: variante?.nombre_variante ?? null,
      stock_actual: variante?.stock ?? null,
      promedio_diario: null,
      demanda_proyectada: null,
      cantidad_sugerida_unidades: 0,
      cantidad_editable_unidades: 0,
      presentacion_compra: null,
      id_proveedor: null,
      proveedor_nombre: null,
      sin_proveedor: true,
      costo_unitario_estimado: null,
      tiempo_entrega_dias: null,
      agregado_manual: true,
    };

    setFilas((prev) => [...prev, nuevaFila]);
    setBuscadorAbierto(false);
    // Precargar alternativas de proveedor para esta fila nueva
    await cargarAlternativas(nuevaFila);
  };

  // ── Totales / validaciones ──────────────────────────────
  const filasSinProveedor = useMemo(
    () => filas.filter((f) => !f.id_proveedor),
    [filas]
  );

  const totalEstimado = useMemo(
    () =>
      filas.reduce((acc, f) => {
        if (!f.costo_unitario_estimado) return acc;
        return acc + f.costo_unitario_estimado * Number(f.cantidad_editable_unidades || 0);
      }, 0),
    [filas]
  );

  // ── Confirmar ────────────────────────────────────────────
  const confirmar = async () => {
    setErrorConfirmar("");
    setResultadoConfirmar(null);

    if (filas.length === 0) {
      setErrorConfirmar("No hay productos en la grilla.");
      return;
    }
    if (filasSinProveedor.length > 0) {
      setErrorConfirmar(
        `Hay ${filasSinProveedor.length} producto(s) sin proveedor asignado. Asignales uno antes de confirmar.`
      );
      return;
    }

    setConfirmando(true);
    try {
      const { data } = await axios.post(
        `${API_URL}/compras-sugeridas`,
        {
          periodoAnalisisDias,
          periodoCoberturaDias,
          items: filas.map((f) => ({
            id_producto: f.id_producto,
            id_variante: f.id_variante,
            id_proveedor: f.id_proveedor,
            cantidad_sugerida_unidades: f.cantidad_sugerida_unidades,
            cantidad_confirmada_unidades: Number(f.cantidad_editable_unidades),
            presentacion_compra: f.presentacion_compra,
            cantidad_por_presentacion: f.cantidad_por_presentacion || 1,
            costo_unitario_estimado: f.costo_unitario_estimado,
          })),
        },
        { headers: getAuthHeader() }
      );

      setResultadoConfirmar(data);
      setFilas([]);
      cargarPendientes();
    } catch (err) {
      console.error(err);
      setErrorConfirmar(err.response?.data?.error || "No se pudo confirmar.");
    } finally {
      setConfirmando(false);
    }
  };

  return (
    <div className="cs-page">
      <div className="cs-header">
        <div>
          <h1>Compras Sugeridas</h1>
          <p>Analizá el consumo y generá una propuesta de abastecimiento.</p>
        </div>
      </div>

      {/* ── PARÁMETROS ── */}
      <div className="cs-parametros">
        <div className="filtro-grupo">
          <label>Analizar ventas de los últimos</label>
          <select
            value={periodoAnalisisDias}
            onChange={(e) => setPeriodoAnalisisDias(Number(e.target.value))}
          >
            {OPCIONES_DIAS.map((d) => (
              <option key={d} value={d}>{d} días</option>
            ))}
          </select>
        </div>
        <div className="filtro-grupo">
          <label>Cubrir los próximos</label>
          <select
            value={periodoCoberturaDias}
            onChange={(e) => setPeriodoCoberturaDias(Number(e.target.value))}
          >
            {OPCIONES_DIAS.map((d) => (
              <option key={d} value={d}>{d} días</option>
            ))}
          </select>
        </div>
        <button className="btn-primario" onClick={generar} disabled={calculando}>
          {calculando ? "Calculando..." : "Generar sugerencia"}
        </button>
      </div>

      {errorCalculo && <div className="alerta-error">⚠️ {errorCalculo}</div>}

      {generadoEn && filas.length === 0 && !calculando && !errorCalculo && (
        <div className="cs-vacio">
          <span>✅</span>
          <p>No hay productos que necesiten reposición con estos parámetros.</p>
        </div>
      )}

      {/* ── GRILLA ── */}
      {filas.length > 0 && (
        <>
          <div className="cs-tabla-wrapper">
            <table className="cs-tabla">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Variante</th>
                  <th>Stock</th>
                  <th>Prom. diario</th>
                  <th>Sugerido</th>
                  <th>A comprar</th>
                  <th>Proveedor</th>
                  <th>Costo est.</th>
                  <th>Entrega</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => {
                  const clave = claveFila(f);
                  const alternativas = alternativasPorClave[clave] || [];

                  return (
                    <tr key={clave} className={f.sin_proveedor ? "fila-alerta" : ""}>
                      <td>{f.producto}</td>
                      <td>{f.variante || "—"}</td>
                      <td>{f.stock_actual ?? "—"}</td>
                      <td>{f.promedio_diario ?? "—"}</td>
                      <td>
                        {f.presentacion_compra && f.cantidad_por_presentacion > 1
                          ? `${f.cantidad_sugerida_unidades / f.cantidad_por_presentacion} ${f.presentacion_compra} (${f.cantidad_sugerida_unidades} u.)`
                          : `${f.cantidad_sugerida_unidades} u.`}
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          className="cs-input-cantidad"
                          value={f.cantidad_editable_unidades}
                          onChange={(e) => cambiarCantidad(clave, e.target.value)}
                        />
                      </td>
                      <td>
                        <select
                          value={f.id_proveedor ?? ""}
                          onFocus={() => cargarAlternativas(f)}
                          onChange={(e) => cambiarProveedor(clave, e.target.value)}
                          className={!f.id_proveedor ? "input-error" : ""}
                        >
                          <option value="">
                            {cargandoAlternativas === clave
                              ? "Cargando..."
                              : f.sin_proveedor
                                ? "⚠️ Sin proveedor"
                                : "Seleccionar"}
                          </option>
                          {(alternativas.length > 0
                            ? alternativas
                            : f.id_proveedor
                              ? [{ id_proveedor: f.id_proveedor, proveedor_nombre: f.proveedor_nombre, es_principal: false }]
                              : []
                          ).map((p) => (
                            <option key={p.id_proveedor} value={p.id_proveedor}>
                              {p.proveedor_nombre}
                              {p.es_principal ? " ⭐" : ""}
                              {p.costo_efectivo != null ? ` — $${p.costo_efectivo}` : ""}
                            </option>
                          ))}
                        </select>
                        {f.sin_proveedor && (
                          <span className="campo-error">Asigná un proveedor</span>
                        )}
                      </td>
                      <td>
                        {f.costo_unitario_estimado
                          ? `$${(f.costo_unitario_estimado * f.cantidad_editable_unidades).toLocaleString("es-AR")}`
                          : "—"}
                      </td>
                      <td>{f.tiempo_entrega_dias != null ? `${f.tiempo_entrega_dias}d` : "—"}</td>
                      <td>
                        <button className="btn-eliminar-linea" onClick={() => quitarFila(clave)}>
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="cs-acciones-grilla">
            <div className="cs-buscador-wrapper">
              <button className="btn-agregar-linea" onClick={abrirBuscador}>
                + Agregar producto manualmente
              </button>

              {buscadorAbierto && (
                <div className="cs-buscador-dropdown">
                  {cargandoProductos ? (
                    <p>Cargando productos...</p>
                  ) : (
                    <ul>
                      {productos.map((p) => (
                        <li key={p.id_producto}>
                          {p.variantes?.length > 0 ? (
                            <>
                              <span className="cs-buscador-producto">{p.nombre}</span>
                              {p.variantes.map((v) => (
                                <button
                                  key={v.id_variante}
                                  onClick={() => agregarProductoManual(p, v)}
                                >
                                  {v.nombre_variante}
                                </button>
                              ))}
                            </>
                          ) : (
                            <button onClick={() => agregarProductoManual(p, null)}>
                              {p.nombre}
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  <button className="cs-buscador-cerrar" onClick={() => setBuscadorAbierto(false)}>
                    Cerrar
                  </button>
                </div>
              )}
            </div>

            {totalEstimado > 0 && (
              <div className="total-preview">
                Costo estimado total:{" "}
                <strong>${totalEstimado.toLocaleString("es-AR")}</strong>
              </div>
            )}
          </div>

          {errorConfirmar && <div className="alerta-error">⚠️ {errorConfirmar}</div>}

          <div className="cs-confirmar">
            <button className="btn-primario" onClick={confirmar} disabled={confirmando}>
              {confirmando ? "Guardando..." : "Confirmar como pendiente"}
            </button>
          </div>
        </>
      )}

      {resultadoConfirmar && (
        <div className="alerta-exito">
          ✅ {resultadoConfirmar.mensaje}
          <ul>
            {resultadoConfirmar.compras_sugeridas.map((cs) => (
              <li key={cs.id_compra_sugerida}>
                Compra sugerida #{cs.id_compra_sugerida} — proveedor {cs.id_proveedor}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── PENDIENTES ── */}
      <div className="cs-pendientes">
        <h2>Compras sugeridas pendientes</h2>

        {cargandoPendientes ? (
          <p>Cargando...</p>
        ) : pendientes.length === 0 ? (
          <p className="cs-pendientes-vacio">No hay compras sugeridas pendientes.</p>
        ) : (
          <table className="cs-tabla-pendientes">
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>Generada</th>
                <th>Ítems</th>
                <th>Cobertura</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pendientes.map((cs) => (
                <tr key={cs.id_compra_sugerida}>
                  <td>{cs.proveedor_nombre}</td>
                  <td>
                    {new Date(cs.generado_en).toLocaleDateString("es-AR")}
                  </td>
                  <td>{cs.cantidad_items}</td>
                  <td>{cs.periodo_cobertura_dias} días</td>
                  <td>
                    <button
                      className="btn-ver"
                      onClick={() => descargarPDF(cs)}
                      disabled={descargando === cs.id_compra_sugerida}
                    >
                      {descargando === cs.id_compra_sugerida ? "Generando..." : "📄 Descargar PDF"}
                    </button>
                    <button
                      className="btn-primario"
                      onClick={() => registrarCompra(cs)}
                    >
                      Registrar compra
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}