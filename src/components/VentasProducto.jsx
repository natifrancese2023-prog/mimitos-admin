import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8080";

export default function VentasProducto({
  idProducto,
  idVariante,
}) {
  const navigate = useNavigate();

  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const abrirVenta = (idPedido) => {
    navigate("/panel/pedidos", {
      state: {
        abrirPedido: idPedido,
      },
    });
  };

  useEffect(() => {
    cargarVentas();
  }, [idProducto, idVariante]);

  async function cargarVentas() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const { data } = await axios.get(
        `${API_URL}/productos/${idProducto}/ventas`,
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

      setVentas(registros);

    } catch (err) {

      console.error(err);

      setError(
        "No fue posible cargar el historial de ventas."
      );

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
        <p>Cargando historial de ventas...</p>
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
              🛍️ Historial de Ventas
            </h4>

            <small className="text-muted">
              Ventas registradas para esta variante
            </small>

          </div>

          <span className="badge bg-primary fs-6">
            {ventas.length} ventas
          </span>

        </div>

      </div>

      <div className="card-body p-0">

        {ventas.length === 0 ? (

          <div className="alert alert-info m-3">
            No existen ventas registradas para esta variante.
          </div>

        ) : (

          <div className="table-responsive">

            <table className="table table-hover table-striped align-middle mb-0">

              <thead className="table-light">

                <tr>

                  <th>Fecha</th>

                  <th>Venta</th>

                  <th>Cliente</th>

                  <th>Cantidad</th>

                  <th>Precio Unitario</th>

                  <th>Subtotal</th>

                  <th>Estado</th>

                </tr>

              </thead>

              <tbody>

                {ventas.map((item) => (

                  <tr
                    key={`${item.id_pedido}-${item.id_variante}`}
                  >

                    <td>
                      {new Date(item.fecha).toLocaleString("es-AR")}
                    </td>

                    <td>

                      <button
                        className="btn btn-outline-primary btn-sm"
                        onClick={() =>
                          abrirVenta(item.id_pedido)
                        }
                      >
                        🔍 Ver venta
                      </button>

                    </td>

                    <td>

                      {item.cliente || "Consumidor Final"}

                    </td>

                    <td>

                      <strong>

                        {item.cantidad}

                      </strong>

                    </td>

                    <td>

                      $

                      {Number(
                        item.precio_unitario
                      ).toLocaleString("es-AR", {
                        minimumFractionDigits: 2,
                      })}

                    </td>

                    <td>

                      <strong className="text-success">

                        $

                        {Number(
                          item.subtotal
                        ).toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                        })}

                      </strong>

                    </td>

                    <td>

                      <span
                        className={`badge
                          ${
                            item.estado === "FACTURADO"
                              ? "bg-success"
                              : item.estado === "PENDIENTE"
                              ? "bg-warning text-dark"
                              : item.estado === "CANCELADO"
                              ? "bg-danger"
                              : "bg-secondary"
                          }`}
                      >

                        {item.estado}

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