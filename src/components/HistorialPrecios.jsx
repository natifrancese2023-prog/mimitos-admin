import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export default function HistorialPrecios({ idProducto, idVariante }) {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    cargarHistorial();
  }, [idProducto, idVariante]);

  async function cargarHistorial() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");
      const { data } = await axios.get(
        `${API_URL}/productos/${idProducto}/historial-precios`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const registros = idVariante
        ? data.datos.filter(
            (item) => Number(item.id_variante) === Number(idVariante),
          )
        : data.datos;

      setHistorial(registros);
    } catch (err) {
      console.error("ERROR HISTORIAL PRECIOS");

      console.error(err);

      console.error(err.response);

      console.error(err.response?.data);

      console.error(err.response?.status);

      setError("No fue posible cargar el historial de precios.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary mb-3" role="status" />

        <p>Cargando historial...</p>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  return (
    <div className="card shadow-sm">
      <div className="card-header bg-white">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h4 className="mb-1">📈 Historial de Precios</h4>

            <small className="text-muted">
              Cambios registrados para esta variante
            </small>
          </div>

          <span className="badge bg-primary fs-6">
            {historial.length} registros
          </span>
        </div>
      </div>

      <div className="card-body p-0">
        {historial.length === 0 ? (
          <div className="alert alert-info m-3">
            No existen cambios de precio registrados para esta variante.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover table-striped align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Fecha</th>

                  <th>Precio Anterior</th>

                  <th>Precio Nuevo</th>
                </tr>
              </thead>

              <tbody>
                {historial.map((item) => (
                  <tr key={item.id_historial_precio}>
                    <td>{new Date(item.fecha).toLocaleString("es-AR")}</td>

                    <td>
                      {item.precio_anterior == null ? (
                        <span className="text-muted">Inicial</span>
                      ) : (
                        <>
                          $
                          {Number(item.precio_anterior).toLocaleString(
                            "es-AR",
                            {
                              minimumFractionDigits: 2,
                            },
                          )}
                        </>
                      )}
                    </td>

                    <td>
                      <span className="fw-bold text-success">
                        $
                        {Number(item.precio_nuevo).toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
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
