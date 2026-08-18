import { useEffect, useState } from "react";
import axios from "axios";

import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export default function ComprasProducto({ idProducto, idVariante }) {
  const navigate = useNavigate();

  const [compras, setCompras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const abrirCompra = (idCompra) => {
    navigate("/panel/compras", {
      state: {
        abrirCompra: idCompra,
      },
    });
  };

  useEffect(() => {
    cargarCompras();
  }, [idProducto, idVariante]);

  async function cargarCompras() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const { data } = await axios.get(
        `${API_URL}/productos/${idProducto}/compras`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const registros = idVariante
        ? data.datos.filter(
            (item) => Number(item.id_variante) === Number(idVariante)
          )
        : data.datos;

      setCompras(registros);
    } catch (err) {
      console.error(err);
      setError("No fue posible cargar el historial de compras.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary mb-3" role="status" />

        <p>Cargando historial de compras...</p>
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
            <h4 className="mb-1">🛒 Historial de Compras</h4>

            <small className="text-muted">
              Compras registradas para esta variante
            </small>
          </div>

          <span className="badge bg-primary fs-6">
            {compras.length} compras
          </span>
        </div>
      </div>

      <div className="card-body p-0">
        {compras.length === 0 ? (
          <div className="alert alert-info m-3">
            No existen compras registradas para esta variante.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover table-striped align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Fecha</th>

                  <th>Compra</th>

                  <th>Proveedor</th>

                  <th>Cantidad</th>

                  <th>Precio Unitario</th>

                  <th>Subtotal</th>

                  <th>Estado</th>

                  <th>Forma de Pago</th>
                </tr>
              </thead>

              <tbody>
                {compras.map((item) => (
                  <tr key={`${item.id_compra}-${item.id_variante}`}>
                    <td>{new Date(item.fecha).toLocaleString("es-AR")}</td>

                    <td>
                      <td>

  <button
    className="btn btn-outline-primary btn-sm"
    onClick={() => abrirCompra(item.id_compra)}
  >
    🔍 Ver compra
  </button>

</td>
                    </td>

                    <td>{item.proveedor || "-"}</td>

                    <td>
                      <strong>{item.cantidad}</strong>
                    </td>

                    <td>
                      $
                      {Number(item.precio_unitario).toLocaleString("es-AR", {
                        minimumFractionDigits: 2,
                      })}
                    </td>

                    <td>
                      <strong className="text-success">
                        $
                        {Number(item.subtotal).toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                        })}
                      </strong>
                    </td>

                    <td>
                      <span
                        className={`badge ${
                          item.estado_pago === "PAGADA"
                            ? "bg-success"
                            : item.estado_pago === "PENDIENTE"
                              ? "bg-warning text-dark"
                              : "bg-secondary"
                        }`}
                      >
                        {item.estado_pago}
                      </span>
                    </td>

                    <td>{item.forma_pago || "-"}</td>
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
