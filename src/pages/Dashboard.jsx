import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";
import "./Dashboard.css";

const API_URL = "http://localhost:8080";

// Helper: construye el nombre completo de un item con variante opcional
function nombreConVariante(nombre, nombreVariante, separador = " - ") {
  if (!nombreVariante) return nombre;
  return `${nombre}${separador}${nombreVariante}`;
}

export default function Dashboard() {
  // ---------------------------------------------------------
  // 1. ESTADOS
  // ---------------------------------------------------------
  const [inputInicio, setInputInicio] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split("T")[0]
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
  const cargarDashboard = useCallback(async (fInicio = inputInicio, fFin = inputFin) => {
    if (fInicio.length < 10 || fFin.length < 10) return;

    setCargando(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/api/stats/dashboard`, {
        params: { inicio: fInicio, fin: fFin },
        headers: { Authorization: `Bearer ${token}` },
      });
      setDatos(res.data);
    } catch (err) {
      console.error("Error al cargar dashboard:", err);
      setError("Error al conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  }, [inputInicio, inputFin]);

  // Carga inicial
  useEffect(() => {
    cargarDashboard();
  }, []);

  // ---------------------------------------------------------
  // 3. HANDLERS
  // ---------------------------------------------------------
  const aplicarRangoRapido = (dias) => {
    const fin = new Date().toISOString().split("T")[0];
    const inicio = new Date(
      new Date().setDate(new Date().getDate() - dias)
    ).toISOString().split("T")[0];

    setInputInicio(inicio);
    setInputFin(fin);
    cargarDashboard(inicio, fin);
  };

  const exportarExcel = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/api/export`, {
        params: { inicio: inputInicio, fin: inputFin, tipo: tipoExport },
        headers: { Authorization: `Bearer ${token}` },
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
  // 4. RENDERIZADO
  // ---------------------------------------------------------
  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="dash-titulo">
          <h1>Panel de Control</h1>
          <p>Análisis de rendimiento de Mimitos</p>
        </div>

        <div className="dash-controles">
          {/* Filtros de Fecha */}
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

          {/* Sección Exportación — sin cambios */}
          <div className="export-section">
            <select value={tipoExport} onChange={(e) => setTipoExport(e.target.value)}>
              <option value="todo">Todo</option>
              <option value="productos">Productos</option>
              <option value="compras">Compras</option>
              <option value="pedidos">Pedidos</option>
              <option value="facturas">Facturas</option>
              <option value="proveedores">Proveedores</option>
              <option value="gastos">Gastos</option>
              <option value="categorias">Categorías</option>
              <option value="resumen">Ingresos/Egresos</option>
              <option value="clientes">Clientes</option>
            </select>
            <button className="btn-exportar" onClick={exportarExcel}>
              📥 Exportar Excel
            </button>
          </div>
        </div>
      </header>

      {/* Estados de Carga y Error */}
      {cargando && !datos && (
        <div className="dash-estado"><div className="spinner"></div></div>
      )}
      {error && (
        <div className="dash-estado dash-error"><p>{error}</p></div>
      )}

      {!cargando && datos && (
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

            <div className={`tarjeta ${datos.totales.gananciaNeta >= 0 ? "tarjeta-ingreso" : "tarjeta-perdida"}`}>
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
                {/* Contar items únicos: variantes sueltas + productos sin variantes */}
                <span className="tarjeta-valor">
                  {datos.alertas.stockCritico?.length || 0}
                </span>
              </div>
            </div>
          </div>

          {/* ── Fila 2: Gráfico y Alertas ── */}
          <div className="dash-grid-2">
            {/* Gráfico sin cambios */}
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
                    <XAxis
                      dataKey="dia"
                      tick={{ fontSize: 11 }}
                      hide={datos.grafico.length > 15}
                    />
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

            {/* Reposición Urgente — con soporte de variantes */}
            <div className="dash-card">
              <h2>Reposición Urgente</h2>

              {/* Contador de items con scroll si son muchos */}
              {datos.alertas.stockCritico && datos.alertas.stockCritico.length > 0 && (
                <p className="dash-alerta-contador">
                  {datos.alertas.stockCritico.length} item
                  {datos.alertas.stockCritico.length !== 1 ? "s" : ""} con stock bajo
                </p>
              )}

              <div className="estado-lista estado-lista--scroll">
                {datos.alertas.stockCritico && datos.alertas.stockCritico.length > 0 ? (
                  datos.alertas.stockCritico.map((p, i) => (
                    <div key={i} className="estado-item">
                      <span className="estado-item-nombre">
                        {/* Mostrar variante si existe: "Remera Lisa - Talle L" */}
                        {nombreConVariante(p.nombre, p.nombre_variante)}
                        {/* Badge visual si es sin stock */}
                        {Number(p.stock) === 0 && (
                          <span className="badge-sin-stock">sin stock</span>
                        )}
                      </span>
                      <strong
                        className={
                          Number(p.stock) === 0 ? "egreso-color" : "ganancia-color"
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

          {/* ── Fila 3: Rankings ── */}
          <div className="dash-grid-2" style={{ marginTop: "1.5rem" }}>

            {/* Productos Más Vendidos — con soporte de variantes */}
            <div className="dash-card">
              <h2>Productos Más Vendidos</h2>
              <div className="estado-lista estado-lista--scroll">
                {datos.topProductos?.length > 0 ? (
                  datos.topProductos.map((p, i) => (
                    <div key={i} className="estado-item">
                      <span className="estado-item-nombre">
                        {/* Mostrar "Producto - Variante" si el backend lo desglosó */}
                        {nombreConVariante(p.nombre, p.nombre_variante)}
                      </span>
                      <span className="badge-cantidad">{p.total_vendido} u.</span>
                    </div>
                  ))
                ) : (
                  <p className="dash-vacio-texto">Sin ventas en el período</p>
                )}
              </div>
            </div>

            {/* Medios de Pago — sin cambios */}
            <div className="dash-card">
              <h2>Ingresos por Medio de Pago</h2>
              <div className="estado-lista">
                {datos.mediosPago?.length > 0 ? (
                  datos.mediosPago.map((m, i) => (
                    <div key={i} className="estado-item">
                      <span style={{ textTransform: "capitalize" }}>
                        {m.medio_pago}
                      </span>
                      <strong>${parseFloat(m.monto).toLocaleString()}</strong>
                    </div>
                  ))
                ) : (
                  <p className="dash-vacio-texto">Sin datos</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
