import { useEffect, useState } from "react";
import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8080";

export default function KardexProducto({
  idProducto,
  idVariante,
}) {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const movimientosTexto = {
    COMPRA: "🟢 Compra",
    VENTA: "🔴 Venta",
    AJUSTE: "🟡 Ajuste",
    DEVOLUCION: "🔵 Devolución",
    ANULACION: "⚫ Anulación",
  };

  useEffect(() => {
    cargarKardex();
  }, [idProducto, idVariante]);

  async function cargarKardex() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const { data } = await axios.get(
        `${API_URL}/productos/${idProducto}/kardex`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const registros = idVariante
        ? data.datos.filter(
            (item) =>
              Number(item.id_variante) === Number(idVariante)
          )
        : data.datos;

      setMovimientos(registros);

    } catch (err) {

      console.error(err);

      setError("No fue posible cargar el Kardex.");

    } finally {

      setLoading(false);

    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">

        <div
          className="spinner-border text-primary mb-3"
          role="status"
        />

        <p>Cargando Kardex...</p>

      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">

        {error}

      </div>
    );
  }

  return (

    <div className="card shadow-sm">

      <div className="card-header bg-white">

        <div className="d-flex justify-content-between align-items-center">

          <div>

            <h4 className="mb-1">

              📦 Kardex

            </h4>

            <small className="text-muted">

              Historial completo de movimientos de stock

            </small>

          </div>

          <span className="badge bg-primary fs-6">

            {movimientos.length} movimientos

          </span>

        </div>

      </div>

      <div className="card-body p-0">
                {movimientos.length === 0 ? (

          <div className="alert alert-info m-3">

            No existen movimientos de stock para esta variante.

          </div>

        ) : (

          <div className="table-responsive">

            <table className="table table-hover table-striped align-middle mb-0">

              <thead className="table-light">

                <tr>

                  <th>Fecha</th>

                  <th>Movimiento</th>

                  <th>Cantidad</th>

                  <th>Stock Anterior</th>

                  <th>Stock Nuevo</th>

                  <th>Origen</th>

                  <th>Referencia</th>

                  <th>Observación</th>

                </tr>

              </thead>

              <tbody>

                {movimientos.map((item) => (

                  <tr key={item.id_kardex}>

                    <td>

                      {new Date(item.fecha_registro).toLocaleString("es-AR")}

                    </td>

                    <td>

                      <span
                        className={`badge ${
                          item.tipo_movimiento === "COMPRA"
                            ? "bg-success"
                            : item.tipo_movimiento === "VENTA"
                            ? "bg-danger"
                            : item.tipo_movimiento === "AJUSTE"
                            ? "bg-warning text-dark"
                            : item.tipo_movimiento === "DEVOLUCION"
                            ? "bg-info text-dark"
                            : "bg-secondary"
                        }`}
                      >
                       {movimientosTexto[item.tipo_movimiento] || item.tipo_movimiento}
                      </span>

                    </td>

                    <td>

                      <strong
                        className={
                          Number(item.cantidad) >= 0
                            ? "text-success"
                            : "text-danger"
                        }
                      >
                        {Number(item.cantidad) > 0 ? "+" : ""}
                        {item.cantidad}
                      </strong>

                    </td>

                    <td>

                      {item.stock_anterior}

                    </td>

                    <td>

                      <strong>

                        {item.stock_nuevo}

                      </strong>

                    </td>

                    <td>

                      {item.origen_tipo}

                    </td>

                    <td>

                      #{item.origen_id}

                    </td>

                    <td>

                      {item.motivo_observacion || "-"}

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </div>

  );

}