import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import "./Dashboard.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

function getAuthHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

function nombreConVariante(nombre, nombreVariante, separador = " - ") {
  if (!nombreVariante) return nombre;
  return `${nombre}${separador}${nombreVariante}`;
}

export default function Dashboard() {
  // ---------------------------------------------------------
  // 1. ESTADOS
  // ---------------------------------------------------------
  const [inputInicio, setInputInicio] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString().split("T")[0]
  );
  const [inputFin, setInputFin] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [tipoExport, setTipoExport] = useState("todo");

  // ---------------------------------------------------------
  // 2. LÓGICA DE CARGA (API)
  // ---------------------------------------------------------
  const cargarDashboard = useCallback(
    async (fInicio = inputInicio, fFin = inputFin) => {
      if (fInicio.length < 10 || fFin.length < 10) return;

      setCargando(true);
      setError(null);
      try {
        const res = await axios.get(`${API_URL}/api/stats/dashboard`, {
          params: { inicio: fInicio, fin: fFin },
          headers: getAuthHeader(),
        });

        console.log("Datos recibidos:", res.data);

        // El back ahora envía exactamente esta estructura — la usamos directo
        if (!res.data?.totales) {
          setError("Respuesta inválida del servidor");
          return;
        }

        setDatos(res.data);
      } catch (err) {
        console.error("Error al cargar dashboard:", err);
        setError("No se pudo cargar el dashboard");
      } finally {
        setCargando(false);
      }
    },
    [inputInicio, inputFin]
  );

  // Carga inicial al montar
  useEffect(() => {
    cargarDashboard();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------
  // 3. HANDLERS
  // ---------------------------------------------------------
  const aplicarRangoRapido = (dias) => {
    const fin = new Date().toISOString().split("T")[0];
    const inicio = dias === 0
      ? fin
      : new Date(new Date().setDate(new Date().getDate() - dias))
          .toISOString().split("T")[0];

    setInputInicio(inicio);
    setInputFin(fin);
    cargarDashboard(inicio, fin);
  };

  const exportarExcel = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/export`, {
        params: { inicio: inputInicio, fin: inputFin, tipo: tipoExport },
        headers: getAuthHeader(),
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Reporte_${tipoExport}_${new Date().toLocaleDateString()}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Error al exportar:", err);
      alert("No se pudo generar el reporte.");
    }
  };

  // ---------------------------------------------------------
  // 4. RENDER
  // ---------------------------------------------------------
  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="dash-titulo">
          <h1>Panel de Control</h1>
          <p>Análisis de rendimiento de Mimitos</p>
        </div>

        <div className="dash-controles">
          <div className="dash-filtro-pildora">
            <div className="botones-acceso-rapido">
              <button onClick={() => aplicarRangoRapido(0)}>Hoy</button>
              <button onClick={() => aplicarRangoRapido(7)}>7d</button>
              <button onClick={() => aplicarRangoRapido(30)}>Mes</button>
            </div>
            <div className="divisor-vertical"></div>
            <div className="inputs-manuales">
              <input
                type="date"
                value={inputInicio}
                onChange={(e) => setInputInicio(e.target.value)}
              />
              <span>al</span>
              <input
                type="date"
                value={inputFin}
                onChange={(e) => setInputFin(e.target.value)}
              />
              <button
                className="btn-recargar-dashboard"
                onClick={() => cargarDashboard()}
                disabled={cargando}
              >
                {cargando ? "..." : "Actualizar"}
              </button>
            </div>
          </div>

          <div className="export-section">
            <select
              value={tipoExport}
              onChange={(e) => setTipoExport(e.target.value)}
            >
              <option value="todo">Todo</option>
              <option value="resumen">Ingresos/Egresos</option>
              <option value="productos">Productos</option>
            </select>
            <button className="btn-exportar" onClick={exportarExcel}>
              📥 Exportar Excel
            </button>
          </div>
        </div>
      </header>

      {/* --- SECCIÓN DE CONTENIDO DINÁMICO --- */}
      <div className="dash-content">
        {cargando ? (
          <div className="dash-mensaje">
            <div className="spinner"></div>
            <p>Cargando estadísticas...</p>
          </div>
        ) : error ? (
          <div className="dash-mensaje error">{error}</div>
        ) : !datos?.totales ? (
          <div className="dash-mensaje">
            <p>No hay movimientos registrados para este período.</p>
            <small>Probá seleccionando otro rango de fechas arriba.</small>
          </div>
        ) : (
          <>
            {/* ── Fila 1: Tarjetas de Resumen ── */}
            <div className="dash-grid-4">
              <div className="tarjeta tarjeta-ingreso">
                <div className="tarjeta-icono">💰</div>
                <div className="tarjeta-info">
                  <span className="tarjeta-label">Ingresos</span>
                  <span className="tarjeta-valor">
                    ${datos.totales.ingresos.toLocaleString()}
                  </span>
                  <span className="tarjeta-sub">
                    {datos.totales.cantidadFacturas} ventas
                  </span>
                </div>
              </div>

              <div className="tarjeta tarjeta-egreso">
                <div className="tarjeta-icono">💸</div>
                <div className="tarjeta-info">
                  <span className="tarjeta-label">Egresos</span>
                  <span className="tarjeta-valor">
                    ${datos.totales.egresos.toLocaleString()}
                  </span>
                  <span className="tarjeta-sub">
                    Ticket: ${datos.totales.ticketPromedio}
                  </span>
                </div>
              </div>

              <div
                className={`tarjeta ${
                  datos.totales.gananciaNeta >= 0
                    ? "tarjeta-ingreso"
                    : "tarjeta-perdida"
                }`}
              >
                <div className="tarjeta-icono">📈</div>
                <div className="tarjeta-info">
                  <span className="tarjeta-label">Balance</span>
                  <span className="tarjeta-valor">
                    ${datos.totales.gananciaNeta.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="tarjeta tarjeta-hoy">
                <div className="tarjeta-icono">⚠️</div>
                <div className="tarjeta-info">
                  <span className="tarjeta-label">Stock Crítico</span>
                  <span className="tarjeta-valor">
                    {datos.alertas.stockCritico?.length || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Fila 2: Gráfico y Alertas ── */}
            <div className="dash-grid-2" style={{ marginTop: "1.5rem" }}>
              <div className="dash-card">
                <h2>Evolución de Caja</h2>
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={datos.grafico}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#EDE8DF"
                      />
                      <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        axisLine={false}
                        tickFormatter={(v) => `$${v}`}
                      />
                      <Tooltip />
                      <Area
                        name="Ventas"
                        type="monotone"
                        dataKey="ventas"
                        stroke="#5AB88A"
                        fill="#E8F7EF"
                        strokeWidth={3}
                      />
                      <Area
                        name="Egresos"
                        type="monotone"
                        dataKey="egresos"
                        stroke="#E85A5A"
                        fill="#FFE8E8"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="dash-card">
                <h2>Reposición Urgente</h2>
                <div className="estado-lista estado-lista--scroll">
                  {datos.alertas.stockCritico?.length > 0 ? (
                    datos.alertas.stockCritico.map((p, i) => (
                      <div key={i} className="estado-item">
                        <span className="estado-item-nombre">
                          {nombreConVariante(p.nombre, p.nombre_variante)}
                        </span>
                        <strong
                          className={
                            Number(p.stock) === 0
                              ? "egreso-color"
                              : "ganancia-color"
                          }
                        >
                          {p.stock} u.
                        </strong>
                      </div>
                    ))
                  ) : (
                    <p className="dash-vacio-texto">Todo al día ✨</p>
                  )}
                </div>
              </div>
            </div>

            {/* ── Fila 3: Top Productos ── */}
            {datos.topProductos?.length > 0 && (
              <div className="dash-card" style={{ marginTop: "1.5rem" }}>
                <h2>Productos más vendidos</h2>
                <div className="estado-lista">
                  {datos.topProductos.map((p, i) => (
                    <div key={i} className="estado-item">
                      <span className="estado-item-nombre">
                        {nombreConVariante(p.nombre, p.nombre_variante)}
                      </span>
                      <strong>{p.total_vendido} u.</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}