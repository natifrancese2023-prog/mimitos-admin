import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import ModalProductoProveedor from "./ModalProductoProveedor";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8080";

function getAuthHeader() {
  return {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };
}

const FILTROS_ESTADO = [
  { valor: "todos", etiqueta: "Todos" },
  { valor: "activos", etiqueta: "Activos" },
  { valor: "inactivos", etiqueta: "Inactivos" },
];

export default function ProductosProveedor({ idProveedor, soloLectura = false }) {
  const navigate = useNavigate();

  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalAbierto, setModalAbierto] = useState(false);
  const [productoEditar, setProductoEditar] = useState(null);

  const [filtroEstado, setFiltroEstado] = useState("todos");

  const cargarProductos = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const { data } = await axios.get(
        `${API_URL}/proveedores/${idProveedor}/productos`,
        { headers: getAuthHeader() }
      );

      setProductos(data.datos ?? data);
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar los productos.");
    } finally {
      setLoading(false);
    }
  }, [idProveedor]);

  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  const nuevoProducto = () => {
    setProductoEditar(null);
    setModalAbierto(true);
  };

  const editarProducto = (producto) => {
    setProductoEditar(producto);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setProductoEditar(null);
  };

  const cambiarEstado = async (producto) => {
    try {
      await axios.patch(
        `${API_URL}/proveedores/productos/${producto.id_proveedor}/${producto.id_producto}/${producto.id_variante ?? "null"}/estado`,
        { activo: !producto.activo },
        { headers: getAuthHeader() }
      );

      cargarProductos();
    } catch (err) {
      console.error(err);
      setError("No se pudo actualizar el estado.");
    }
  };

  // Precio a mostrar: si hay una compra real registrada, esa manda.
  // Si nunca se le compró, cae al costo referencial cargado a mano.
  const precioMostrar = (item) => {
    const precio = item.ultimo_precio_compra ?? item.costo_referencial;
    return precio != null ? Number(precio) : null;
  };

  const listado = useMemo(() => {
    const filtrados = productos.filter((item) => {
      if (filtroEstado === "activos") return item.activo;
      if (filtroEstado === "inactivos") return !item.activo;
      return true;
    });

    return [...filtrados].sort((a, b) => {
      if (a.activo !== b.activo) return a.activo ? -1 : 1;
      if (a.es_principal && !b.es_principal) return -1;
      if (!a.es_principal && b.es_principal) return 1;
      return (a.producto ?? "").localeCompare(b.producto ?? "");
    });
  }, [productos, filtroEstado]);

  const cantidadActivos = useMemo(
    () => productos.filter((p) => p.activo).length,
    [productos]
  );
  const cantidadInactivos = productos.length - cantidadActivos;

  if (loading) {
    return (
      <div className="detalle-loading">
        <h3>Cargando productos...</h3>
      </div>
    );
  }

  if (error) {
    return (
      <div className="detalle-vacio">
        <span>⚠️</span>
        <h3>{error}</h3>
      </div>
    );
  }

  return (
    <>
      <div className="detalle-toolbar">
        <div>
          <h3>Productos Asociados</h3>
          <p>Administrá los productos que abastece este proveedor.</p>
        </div>

        {!soloLectura && (
          <button className="btn btn-primary" onClick={nuevoProducto}>
            + Asociar producto
          </button>
        )}
      </div>

      {productos.length > 0 && (
        <div className="filtro-estado-tabs">
          {FILTROS_ESTADO.map((f) => (
            <button
              key={f.valor}
              className={filtroEstado === f.valor ? "filtro-activo" : ""}
              onClick={() => setFiltroEstado(f.valor)}
            >
              {f.etiqueta}
              {f.valor === "activos" && ` (${cantidadActivos})`}
              {f.valor === "inactivos" && ` (${cantidadInactivos})`}
            </button>
          ))}
        </div>
      )}

      {listado.length === 0 ? (
        <div className="detalle-vacio">
          <span>📦</span>
          <h3>
            {productos.length === 0
              ? "No hay productos asociados"
              : "No hay productos que coincidan con el filtro"}
          </h3>
          {productos.length === 0 && (
            <p>Este proveedor todavía no tiene productos vinculados.</p>
          )}

          {!soloLectura && productos.length === 0 && (
            <button className="btn btn-primary" onClick={nuevoProducto}>
              Asociar primer producto
            </button>
          )}
        </div>
      ) : (
        <div className="tabla-responsive">
          <table className="tabla-detalle">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Variante</th>
                <th>Costo</th>
                <th>Compra mínima</th>
                <th>Entrega</th>
                <th>Principal</th>
                <th>Estado</th>
                {!soloLectura && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {listado.map((item) => {
                const precio = precioMostrar(item);
                const esUltimoPagado = item.ultimo_precio_compra != null;

                return (
                  <tr
                    key={`${item.id_producto}-${item.id_variante ?? 0}`}
                    className={!item.activo ? "fila-inactiva" : ""}
                  >
                    <td>
                      <button
                        className="link-detalle"
                        onClick={() =>
                          navigate(`/panel/productos/${item.id_producto}`)
                        }
                      >
                        {item.producto}
                      </button>
                    </td>
                    <td>{item.nombre_variante || "—"}</td>
                    <td>
                      {precio != null ? (
                        <>
                          ${precio.toLocaleString("es-AR")}
                          <span className="costo-origen">
                            {esUltimoPagado ? " · última compra" : " · referencial"}
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{item.compra_minima}</td>
                    <td>{item.tiempo_entrega_dias} días</td>
                    <td>
                      {item.es_principal ? (
                        <span className="badge badge-principal">⭐ Principal</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <span
                        className={
                          item.activo ? "badge badge-activo" : "badge badge-inactivo"
                        }
                      >
                        {item.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    {!soloLectura && (
                      <td>
                        <div className="acciones-tabla">
                          <button
                            className="btn-tabla btn-editar"
                            onClick={() => editarProducto(item)}
                          >
                            Editar
                          </button>
                          <button
                            className={
                              item.activo ? "btn-tabla btn-danger" : "btn-tabla btn-success"
                            }
                            onClick={() => cambiarEstado(item)}
                          >
                            {item.activo ? "Desactivar" : "Activar"}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!soloLectura && modalAbierto && (
        <ModalProductoProveedor
          idProveedor={idProveedor}
          producto={productoEditar}
          onClose={cerrarModal}
          onGuardado={() => {
            cerrarModal();
            cargarProductos();
          }}
        />
      )}
    </>
  );
}