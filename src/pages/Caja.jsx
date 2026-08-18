// ============================================================
// CAJA.JSX - Apertura, movimientos y cierre de caja
// ============================================================

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import "./Caja.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

function getAuthHeader() {
  return {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };
}

const ETIQUETAS_FORMA_PAGO = {
  efectivo: "💵 Efectivo",
  debito: "💳 Débito",
  credito: "💳 Crédito",
  transferencia: "🏦 Transferencia",
  mercadopago: "📱 Mercado Pago",
};

const ETIQUETAS_ORIGEN = {
  venta: "Venta",
  pago_cc: "Pago cta. cte.",
  gasto: "Gasto",
  retiro: "Retiro",
  otro: "Otro",
};

export default function Caja() {
  const [estado, setEstado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // ============================================================
  // APERTURA
  // ============================================================

  const [modalApertura, setModalApertura] = useState(false);
  const [saldoInicial, setSaldoInicial] = useState("");
  const [abriendo, setAbriendo] = useState(false);
  const [errorApertura, setErrorApertura] = useState("");

  const [ultimaCaja, setUltimaCaja] = useState(null);
  const [saldoContadoApertura, setSaldoContadoApertura] = useState("");
  const [cargandoUltimaCaja, setCargandoUltimaCaja] = useState(false);

  // ============================================================
  // RETIRO
  // ============================================================

  const [modalRetiro, setModalRetiro] = useState(false);
  const [montoRetiro, setMontoRetiro] = useState("");
  const [obsRetiro, setObsRetiro] = useState("");
  const [registrandoRetiro, setRegistrandoRetiro] = useState(false);
  const [errorRetiro, setErrorRetiro] = useState("");

  // ============================================================
  // CIERRE
  // ============================================================

  const [modalCierre, setModalCierre] = useState(false);
  const [saldoContado, setSaldoContado] = useState("");
  const [cerrando, setCerrando] = useState(false);
  const [errorCierre, setErrorCierre] = useState("");
  const [resultadoCierre, setResultadoCierre] = useState(null);

  // ============================================================
  // HISTORIAL
  // ============================================================

  const [modalHistorial, setModalHistorial] = useState(false);
  const [historialCajas, setHistorialCajas] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  // ============================================================
  // DETALLE DE CAJA
  // ============================================================

  const [cajaSeleccionada, setCajaSeleccionada] = useState(null);
  const [detalleCaja, setDetalleCaja] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  // ============================================================
  // CARGAR ESTADO DE CAJA
  // ============================================================

  const cargarEstado = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const { data } = await axios.get(`${API_URL}/caja/abierta`, {
        headers: getAuthHeader(),
      });

      setEstado(data);
    } catch (err) {
      if (err.response?.status === 404) {
        setEstado(null);
      } else {
        console.error(err);
        setError("No se pudo cargar el estado de caja.");
      }
    } finally {
      setCargando(false);
    }
  }, []);

  // ============================================================
  // CARGAR HISTORIAL
  // IMPORTANTE: NO se ejecuta automáticamente.
  // Solo cuando el usuario presiona el botón.
  // ============================================================

  const cargarHistorial = useCallback(async () => {
    setCargandoHistorial(true);

    try {
      const { data } = await axios.get(`${API_URL}/caja/historial`, {
        headers: getAuthHeader(),
      });

      setHistorialCajas(data);
    } catch (err) {
      console.error("Error cargando historial de cajas:", err);
    } finally {
      setCargandoHistorial(false);
    }
  }, []);

  // ============================================================
  // ABRIR HISTORIAL
  // ============================================================

  const abrirHistorial = async () => {
    setModalHistorial(true);
    await cargarHistorial();
  };

  // ============================================================
  // CARGAR ESTADO AL ENTRAR
  // ============================================================

  useEffect(() => {
    cargarEstado();
  }, [cargarEstado]);

  // ============================================================
  // VER DETALLE DE UNA CAJA
  // ============================================================

  const verDetalleCaja = async (idCaja) => {
    setCajaSeleccionada(idCaja);
    setDetalleCaja(null);
    setCargandoDetalle(true);

    try {
      const { data } = await axios.get(`${API_URL}/caja/${idCaja}`, {
        headers: getAuthHeader(),
      });

      setDetalleCaja(data);
    } catch (err) {
      console.error("Error cargando detalle de caja:", err);
    } finally {
      setCargandoDetalle(false);
    }
  };

  // ============================================================
  // APERTURA
  // ============================================================

  const abrirCaja = async () => {
    setErrorApertura("");

    const esPrimeraApertura = !ultimaCaja;

    const monto = esPrimeraApertura
      ? Number(saldoInicial)
      : Number(saldoContadoApertura);

    if (!Number.isFinite(monto) || monto < 0) {
      setErrorApertura(
        esPrimeraApertura
          ? "Ingresá un saldo inicial válido."
          : "Ingresá el efectivo contado.",
      );
      return;
    }

    setAbriendo(true);

    try {
      await axios.post(
        `${API_URL}/caja/abrir`,
        esPrimeraApertura
          ? {
              saldo_inicial: monto,
            }
          : {
              saldo_contado: monto,
            },
        {
          headers: getAuthHeader(),
        },
      );

      setModalApertura(false);
      setSaldoInicial("");
      setSaldoContadoApertura("");
      setUltimaCaja(null);

      await cargarEstado();
    } catch (err) {
      setErrorApertura(
        err.response?.data?.error || "No se pudo abrir la caja.",
      );
    } finally {
      setAbriendo(false);
    }
  };

  const prepararApertura = async () => {
    setErrorApertura("");
    setSaldoInicial("");
    setSaldoContadoApertura("");
    setUltimaCaja(null);

    setCargandoUltimaCaja(true);

    try {
      const { data } = await axios.get(
        `${API_URL}/caja/ultima-cerrada`,
        {
          headers: getAuthHeader(),
        },
      );

      setUltimaCaja(data);
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error(err);
        setErrorApertura("No se pudo consultar el último cierre.");
        return;
      }

      setUltimaCaja(null);
    } finally {
      setCargandoUltimaCaja(false);
      setModalApertura(true);
    }
  };

  // ============================================================
  // RETIRO
  // ============================================================

  const registrarRetiro = async () => {
    setErrorRetiro("");

    if (!montoRetiro || Number(montoRetiro) <= 0) {
      setErrorRetiro("Ingresá un monto válido.");
      return;
    }

    setRegistrandoRetiro(true);

    try {
      await axios.post(
        `${API_URL}/caja/retiro`,
        {
          monto: Number(montoRetiro),
          observaciones: obsRetiro || null,
        },
        {
          headers: getAuthHeader(),
        },
      );

      setModalRetiro(false);
      setMontoRetiro("");
      setObsRetiro("");

      await cargarEstado();
    } catch (err) {
      setErrorRetiro(
        err.response?.data?.error ||
          "No se pudo registrar el retiro.",
      );
    } finally {
      setRegistrandoRetiro(false);
    }
  };

  // ============================================================
  // CIERRE
  // ============================================================

  const cerrarCaja = async () => {
    setErrorCierre("");

    if (!saldoContado || Number(saldoContado) < 0) {
      setErrorCierre("Ingresá el dinero contado.");
      return;
    }

    setCerrando(true);

    try {
      const { data } = await axios.put(
        `${API_URL}/caja/${estado.caja.id_caja}/cerrar`,
        {
          saldo_contado: Number(saldoContado),
        },
        {
          headers: getAuthHeader(),
        },
      );

      setResultadoCierre(data);
    } catch (err) {
      setErrorCierre(
        err.response?.data?.error ||
          "No se pudo cerrar la caja.",
      );
    } finally {
      setCerrando(false);
    }
  };

  const cerrarModalCierreYRefrescar = async () => {
    setModalCierre(false);
    setSaldoContado("");
    setResultadoCierre(null);

    await cargarEstado();
    await cargarHistorial();
  };

  // ============================================================
  // FORMATEAR FECHA
  // ============================================================

  const formatFechaHora = (f) =>
    new Date(f).toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  // ============================================================
  // MODAL HISTORIAL
  // ============================================================

  const modalHistorialComponent = modalHistorial && (
    <div
      className="modal-overlay"
      onClick={() => setModalHistorial(false)}
    >
      <div
        className="modal modal-historial-cajas"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2>Historial de cajas</h2>
            <p>
              Consultá las aperturas y cierres anteriores.
            </p>
          </div>

          <button
            className="modal-cerrar"
            onClick={() => setModalHistorial(false)}
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          {cargandoHistorial ? (
            <p className="caja-sin-movs">
              Cargando historial...
            </p>
          ) : historialCajas.length === 0 ? (
            <p className="caja-sin-movs">
              Todavía no hay cajas registradas.
            </p>
          ) : (
            <div className="caja-tabla-wrapper">
              <table className="caja-tabla">
                <thead>
                  <tr>
                    <th>Caja</th>
                    <th>Fecha</th>
                    <th>Apertura</th>
                    <th>Cierre</th>
                    <th>Inicio</th>
                    <th>Contado</th>
                    <th>Diferencia</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {historialCajas.map((caja) => (
                    <tr key={caja.id_caja}>
                      <td>#{caja.id_caja}</td>

                      <td>
                        {new Date(
                          caja.fecha_apertura,
                        ).toLocaleDateString("es-AR")}
                      </td>

                      <td>
                        {new Date(
                          caja.fecha_apertura,
                        ).toLocaleTimeString("es-AR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      <td>
                        {caja.fecha_cierre
                          ? new Date(
                              caja.fecha_cierre,
                            ).toLocaleTimeString("es-AR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>

                      <td>
                        $
                        {Number(
                          caja.saldo_inicial,
                        ).toLocaleString("es-AR")}
                      </td>

                      <td>
                        {caja.saldo_contado != null
                          ? "$" +
                            Number(
                              caja.saldo_contado,
                            ).toLocaleString("es-AR")
                          : "—"}
                      </td>

                      <td
                        className={
                          Number(caja.diferencia) > 0
                            ? "caja-verde"
                            : Number(caja.diferencia) < 0
                              ? "caja-rojo"
                              : ""
                        }
                      >
                        {caja.diferencia != null
                          ? `${
                              Number(caja.diferencia) >= 0
                                ? "+"
                                : ""
                            }$${Number(
                              caja.diferencia,
                            ).toLocaleString("es-AR")}`
                          : "—"}
                      </td>

                      <td>{caja.estado}</td>

                      <td>
                        <button
                          className="btn-secundario"
                          onClick={() =>
                            verDetalleCaja(caja.id_caja)
                          }
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="btn-secundario"
            onClick={() => setModalHistorial(false)}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );

  // ============================================================
  // ESTADOS DE CARGA / ERROR
  // ============================================================

  if (cargando) {
    return (
      <div className="caja-estado">
        <div className="spinner" />
        <p>Cargando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="caja-estado caja-error">
        <span>⚠️</span>
        <p>{error}</p>
        <button onClick={cargarEstado}>
          Reintentar
        </button>
      </div>
    );
  }
    // ============================================================
  // SIN CAJA ABIERTA
  // ============================================================

  if (!estado) {
    return (
      <div className="caja-page">
        <div className="caja-vacio">
          <span>🗄️</span>

          <h2>No hay ninguna caja abierta</h2>

          <p>
            Abrí la caja del día para empezar a registrar
            movimientos.
          </p>

          <button
            className="btn-primario"
            onClick={prepararApertura}
          >
            + Abrir caja
          </button>

          <button
            className="btn-secundario"
            onClick={abrirHistorial}
          >
            📋 Ver historial de cajas
          </button>
        </div>

        {/* ====================================================
            MODAL APERTURA
        ==================================================== */}

        {modalApertura && (
          <div
            className="modal-overlay"
            onClick={() => setModalApertura(false)}
          >
            <div
              className="modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>Abrir caja</h2>

                <button
                  className="modal-cerrar"
                  onClick={() =>
                    setModalApertura(false)
                  }
                >
                  ✕
                </button>
              </div>

              <div className="modal-body">
                {errorApertura && (
                  <div className="alerta-error">
                    ⚠️ {errorApertura}
                  </div>
                )}

                {cargandoUltimaCaja ? (
                  <p>
                    Consultando el último cierre...
                  </p>
                ) : ultimaCaja ? (
                  <>
                    <div className="caja-control-apertura">
                      <h3>Control de apertura</h3>

                      <p>
                        Último cierre:
                        <strong>
                          {new Date(
                            ultimaCaja.fecha_cierre,
                          ).toLocaleString("es-AR")}
                        </strong>
                      </p>

                      <p>
                        Efectivo dejado según el último
                        cierre:
                        <strong>
                          $
                          {Number(
                            ultimaCaja.saldo_contado,
                          ).toLocaleString("es-AR")}
                        </strong>
                      </p>
                    </div>

                    <div className="field-group">
                      <label>
                        Efectivo contado para iniciar *
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={saldoContadoApertura}
                        onChange={(e) =>
                          setSaldoContadoApertura(
                            e.target.value,
                          )
                        }
                        autoFocus
                      />
                    </div>

                    {saldoContadoApertura !== "" && (
                      <div className="caja-diferencia-apertura">
                        <span>Diferencia:</span>

                        <strong>
                          $
                          {(
                            Number(
                              saldoContadoApertura,
                            ) -
                            Number(
                              ultimaCaja.saldo_contado,
                            )
                          ).toLocaleString("es-AR")}
                        </strong>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="field-group">
                    <label>Saldo inicial *</label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={saldoInicial}
                      onChange={(e) =>
                        setSaldoInicial(e.target.value)
                      }
                      autoFocus
                    />
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  className="btn-secundario"
                  onClick={() =>
                    setModalApertura(false)
                  }
                >
                  Cancelar
                </button>

                <button
                  className="btn-primario"
                  onClick={abrirCaja}
                  disabled={abriendo}
                >
                  {abriendo
                    ? "Abriendo..."
                    : ultimaCaja
                      ? "Confirmar apertura"
                      : "Abrir caja"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================
            HISTORIAL
        ==================================================== */}

        {modalHistorialComponent}
      </div>
    );
  }

  // ============================================================
  // CON CAJA ABIERTA
  // ============================================================

  return (
    <div className="caja-page">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="caja-header">
        <div>
          <h1>Caja</h1>

          <p>
            Abierta el{" "}
            {formatFechaHora(
              estado.caja.fecha_apertura,
            )}
          </p>
        </div>

        <div className="caja-header-acciones">

          <button
            className="btn-secundario"
            onClick={() =>
              setModalRetiro(true)
            }
          >
            − Retiro
          </button>

          <button
            className="btn-primario"
            onClick={() =>
              setModalCierre(true)
            }
          >
            Cerrar caja
          </button>

          <button
            className="btn-secundario"
            onClick={abrirHistorial}
          >
            📋 Historial
          </button>

        </div>
      </div>

      {/* ======================================================
          RESUMEN EFECTIVO
      ====================================================== */}

      <div className="caja-resumen-efectivo">

        <div className="caja-card">
          <span>Saldo inicial</span>

          <strong>
            $
            {estado.saldo_inicial.toLocaleString(
              "es-AR",
            )}
          </strong>
        </div>

        <div className="caja-card">
          <span>Ingresos efectivo</span>

          <strong className="caja-verde">
            +$
            {estado.desglose_por_forma_pago.efectivo.ingresos.toLocaleString(
              "es-AR",
            )}
          </strong>
        </div>

        <div className="caja-card">
          <span>Egresos efectivo</span>

          <strong className="caja-rojo">
            −$
            {estado.desglose_por_forma_pago.efectivo.egresos.toLocaleString(
              "es-AR",
            )}
          </strong>
        </div>

        <div className="caja-card caja-card-destacada">
          <span>
            Saldo esperado (efectivo)
          </span>

          <strong>
            $
            {estado.saldo_esperado_efectivo.toLocaleString(
              "es-AR",
            )}
          </strong>
        </div>

      </div>

      {/* ======================================================
          OTRAS FORMAS DE PAGO
      ====================================================== */}

      <div className="caja-otras-formas">

        <h3>
          Otras formas de pago del día
        </h3>

        <div className="caja-otras-grid">

          {[
            "debito",
            "credito",
            "transferencia",
            "mercadopago",
          ].map((fp) => (

            <div
              key={fp}
              className="caja-otra-card"
            >
              <span>
                {ETIQUETAS_FORMA_PAGO[fp]}
              </span>

              <strong>
                $
                {estado.desglose_por_forma_pago[
                  fp
                ]?.ingresos?.toLocaleString(
                  "es-AR",
                ) || "0"}
              </strong>
            </div>

          ))}

        </div>

      </div>

      {/* ======================================================
          MOVIMIENTOS
      ====================================================== */}

      <h3 className="caja-movs-titulo">
        Movimientos
      </h3>

      {estado.movimientos.length === 0 ? (

        <p className="caja-sin-movs">
          Todavía no hay movimientos en esta caja.
        </p>

      ) : (

        <table className="caja-tabla">

          <thead>
            <tr>
              <th>Hora</th>
              <th>Origen</th>
              <th>Forma de pago</th>
              <th>Monto</th>
              <th>Observaciones</th>
            </tr>
          </thead>

          <tbody>

            {estado.movimientos.map((m) => (

              <tr
                key={m.id_movimiento}
                className={
                  m.tipo === "ingreso"
                    ? "caja-fila-ingreso"
                    : "caja-fila-egreso"
                }
              >

                <td>
                  {formatFechaHora(m.fecha)}
                </td>

                <td>
                  {ETIQUETAS_ORIGEN[m.origen] ||
                    m.origen}
                </td>

                <td>
                  {ETIQUETAS_FORMA_PAGO[
                    m.forma_pago
                  ] ||
                    m.forma_pago ||
                    "—"}
                </td>

                <td>
                  {m.tipo === "ingreso"
                    ? "+"
                    : "−"}
                  $
                  {Number(
                    m.monto,
                  ).toLocaleString("es-AR")}
                </td>

                <td>
                  {m.observaciones || "—"}
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      )}

      {/* ======================================================
          HISTORIAL
      ====================================================== */}

      {modalHistorialComponent}
            {/* ======================================================
          MODAL DETALLE DE CAJA
      ====================================================== */}

      {cajaSeleccionada && (
        <div
          className="modal-overlay"
          onClick={() => {
            setCajaSeleccionada(null);
            setDetalleCaja(null);
          }}
        >
          <div
            className="modal modal-detalle-caja"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="modal-header">

              <div>

                <h2>
                  Detalle de Caja #
                  {cajaSeleccionada}
                </h2>

                {detalleCaja?.caja && (
                  <p>
                    {detalleCaja.caja.estado ===
                    "abierta"
                      ? "Caja abierta"
                      : "Caja cerrada"}
                  </p>
                )}

              </div>

              <button
                className="modal-cerrar"
                onClick={() => {
                  setCajaSeleccionada(null);
                  setDetalleCaja(null);
                }}
              >
                ✕
              </button>

            </div>

            <div className="modal-body">

              {cargandoDetalle ? (

                <p className="caja-sin-movs">
                  Cargando detalle...
                </p>

              ) : !detalleCaja ? (

                <p className="caja-sin-movs">
                  No se pudo cargar el detalle
                  de la caja.
                </p>

              ) : (

                <>

                  {/* ========================================
                      RESUMEN
                  ======================================== */}

                  <div className="caja-detalle-resumen">

                    <div className="caja-card">
                      <span>Apertura</span>

                      <strong>
                        {formatFechaHora(
                          detalleCaja.caja
                            .fecha_apertura,
                        )}
                      </strong>
                    </div>

                    <div className="caja-card">
                      <span>Cierre</span>

                      <strong>
                        {detalleCaja.caja
                          .fecha_cierre
                          ? formatFechaHora(
                              detalleCaja.caja
                                .fecha_cierre,
                            )
                          : "—"}
                      </strong>
                    </div>

                    <div className="caja-card">
                      <span>Saldo inicial</span>

                      <strong>
                        $
                        {Number(
                          detalleCaja.saldo_inicial,
                        ).toLocaleString("es-AR")}
                      </strong>
                    </div>

                    <div className="caja-card caja-card-destacada">
                      <span>
                        Saldo esperado
                      </span>

                      <strong>
                        $
                        {Number(
                          detalleCaja.saldo_esperado_efectivo,
                        ).toLocaleString(
                          "es-AR",
                        )}
                      </strong>
                    </div>

                    <div className="caja-card">
                      <span>Saldo contado</span>

                      <strong>
                        {detalleCaja.caja
                          .saldo_contado !=
                        null
                          ? "$" +
                            Number(
                              detalleCaja.caja
                                .saldo_contado,
                            ).toLocaleString(
                              "es-AR",
                            )
                          : "—"}
                      </strong>
                    </div>

                    <div className="caja-card">
                      <span>Diferencia</span>

                      <strong
                        className={
                          Number(
                            detalleCaja.caja
                              .diferencia,
                          ) > 0
                            ? "caja-verde"
                            : Number(
                                  detalleCaja
                                    .caja
                                    .diferencia,
                                ) < 0
                              ? "caja-rojo"
                              : ""
                        }
                      >
                        {detalleCaja.caja
                          .diferencia !=
                        null
                          ? `${
                              Number(
                                detalleCaja.caja
                                  .diferencia,
                              ) >= 0
                                ? "+"
                                : ""
                            }$${Number(
                              detalleCaja.caja
                                .diferencia,
                            ).toLocaleString(
                              "es-AR",
                            )}`
                          : "—"}
                      </strong>
                    </div>

                  </div>

                  {/* ========================================
                      MOVIMIENTOS
                  ======================================== */}

                  <h3 className="caja-movs-titulo">
                    Movimientos
                  </h3>

                  {detalleCaja.movimientos
                    ?.length === 0 ? (

                    <p className="caja-sin-movs">
                      No hubo movimientos en
                      esta caja.
                    </p>

                  ) : (

                    <div className="caja-tabla-wrapper">

                      <table className="caja-tabla">

                        <thead>
                          <tr>
                            <th>Hora</th>
                            <th>Origen</th>
                            <th>
                              Forma de pago
                            </th>
                            <th>Monto</th>
                            <th>
                              Observaciones
                            </th>
                          </tr>
                        </thead>

                        <tbody>

                          {detalleCaja.movimientos?.map(
                            (m) => (

                              <tr
                                key={
                                  m.id_movimiento
                                }
                                className={
                                  m.tipo ===
                                  "ingreso"
                                    ? "caja-fila-ingreso"
                                    : "caja-fila-egreso"
                                }
                              >

                                <td>
                                  {formatFechaHora(
                                    m.fecha,
                                  )}
                                </td>

                                <td>
                                  {ETIQUETAS_ORIGEN[
                                    m.origen
                                  ] ||
                                    m.origen}
                                </td>

                                <td>
                                  {ETIQUETAS_FORMA_PAGO[
                                    m.forma_pago
                                  ] ||
                                    m.forma_pago ||
                                    "—"}
                                </td>

                                <td>

                                  <strong
                                    className={
                                      m.tipo ===
                                      "ingreso"
                                        ? "caja-verde"
                                        : "caja-rojo"
                                    }
                                  >
                                    {m.tipo ===
                                    "ingreso"
                                      ? "+"
                                      : "−"}
                                    $
                                    {Number(
                                      m.monto,
                                    ).toLocaleString(
                                      "es-AR",
                                    )}
                                  </strong>

                                </td>

                                <td>
                                  {m.observaciones ||
                                    "—"}
                                </td>

                              </tr>

                            ),
                          )}

                        </tbody>

                      </table>

                    </div>

                  )}

                </>

              )}

            </div>

            <div className="modal-footer">

              <button
                className="btn-secundario"
                onClick={() => {
                  setCajaSeleccionada(null);
                  setDetalleCaja(null);
                }}
              >
                Cerrar
              </button>

            </div>

          </div>
        </div>
      )}

      {/* ======================================================
          MODAL RETIRO
      ====================================================== */}

      {modalRetiro && (
        <div
          className="modal-overlay"
          onClick={() =>
            setModalRetiro(false)
          }
        >
          <div
            className="modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="modal-header">

              <h2>
                Retiro de dinero
              </h2>

              <button
                className="modal-cerrar"
                onClick={() =>
                  setModalRetiro(false)
                }
              >
                ✕
              </button>

            </div>

            <div className="modal-body">

              {errorRetiro && (
                <div className="alerta-error">
                  ⚠️ {errorRetiro}
                </div>
              )}

              <div className="field-group">

                <label>
                  Monto *
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  autoFocus
                  value={montoRetiro}
                  onChange={(e) =>
                    setMontoRetiro(
                      e.target.value,
                    )
                  }
                />

              </div>

              <div className="field-group">

                <label>
                  Observaciones
                </label>

                <input
                  type="text"
                  value={obsRetiro}
                  onChange={(e) =>
                    setObsRetiro(
                      e.target.value,
                    )
                  }
                  placeholder="Opcional"
                />

              </div>

            </div>

            <div className="modal-footer">

              <button
                className="btn-secundario"
                onClick={() =>
                  setModalRetiro(false)
                }
              >
                Cancelar
              </button>

              <button
                className="btn-primario"
                onClick={registrarRetiro}
                disabled={
                  registrandoRetiro
                }
              >
                {registrandoRetiro
                  ? "Guardando..."
                  : "Registrar retiro"}
              </button>

            </div>

          </div>
        </div>
      )}

      {/* ======================================================
          MODAL CIERRE
      ====================================================== */}

      {modalCierre && (
        <div
          className="modal-overlay"
          onClick={() =>
            !resultadoCierre &&
            setModalCierre(false)
          }
        >
          <div
            className="modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="modal-header">

              <h2>
                Cierre de caja
              </h2>

              {!resultadoCierre && (
                <button
                  className="modal-cerrar"
                  onClick={() =>
                    setModalCierre(false)
                  }
                >
                  ✕
                </button>
              )}

            </div>

            <div className="modal-body">

              {!resultadoCierre ? (

                <>
                  {errorCierre && (
                    <div className="alerta-error">
                      ⚠️ {errorCierre}
                    </div>
                  )}

                  <p>
                    Saldo esperado (efectivo):{" "}
                    <strong>
                      $
                      {estado.saldo_esperado_efectivo.toLocaleString(
                        "es-AR",
                      )}
                    </strong>
                  </p>

                  <div className="field-group">

                    <label>
                      Dinero contado *
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      autoFocus
                      value={saldoContado}
                      onChange={(e) =>
                        setSaldoContado(
                          e.target.value,
                        )
                      }
                    />

                  </div>
                </>

              ) : (

                <div className="caja-resultado-cierre">

                  <p>
                    Saldo esperado: $
                    {resultadoCierre.saldo_esperado_efectivo.toLocaleString(
                      "es-AR",
                    )}
                  </p>

                  <p>
                    Dinero contado: $
                    {resultadoCierre.saldo_contado.toLocaleString(
                      "es-AR",
                    )}
                  </p>

                  <p
                    className={
                      resultadoCierre.diferencia ===
                      0
                        ? "caja-verde"
                        : "caja-rojo"
                    }
                  >
                    Diferencia:{" "}
                    {resultadoCierre.diferencia >=
                    0
                      ? "+"
                      : ""}
                    $
                    {resultadoCierre.diferencia.toLocaleString(
                      "es-AR",
                    )}
                  </p>

                </div>

              )}

            </div>

            <div className="modal-footer">

              {!resultadoCierre ? (

                <>
                  <button
                    className="btn-secundario"
                    onClick={() =>
                      setModalCierre(false)
                    }
                  >
                    Cancelar
                  </button>

                  <button
                    className="btn-primario"
                    onClick={cerrarCaja}
                    disabled={cerrando}
                  >
                    {cerrando
                      ? "Cerrando..."
                      : "Confirmar cierre"}
                  </button>
                </>

              ) : (

                <button
                  className="btn-primario"
                  onClick={
                    cerrarModalCierreYRefrescar
                  }
                >
                  Listo
                </button>

              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
}