import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8080";

function getAuthHeader() {
  return {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };
}

const MODELO = {
  id_producto: "",
  id_variante: "",
  codigo_producto_proveedor: "",
  costo_referencial: "",
  compra_minima: 1,
  tiempo_entrega_dias: 1,
  prioridad: 1,
  es_principal: false,
  activo: true,
};

export default function ModalProductoProveedor({
  idProveedor,
  producto,
  onClose,
  onGuardado,
}) {
  const [form, setForm] = useState(MODELO);

  const [productos, setProductos] = useState([]);

  const [guardando, setGuardando] = useState(false);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  //===========================================
  // CARGAR PRODUCTOS
  //===========================================

  const cargarProductos = useCallback(async () => {
    try {
      setLoading(true);

      const { data } = await axios.get(
        `${API_URL}/productos`,
        {
          headers: getAuthHeader(),
        }
      );

      setProductos(data);
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar los productos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  //===========================================
  // EDITAR
  //===========================================

  useEffect(() => {
    if (!producto) {
      setForm(MODELO);
      return;
    }

    setForm({
      id_producto: producto.id_producto,
      id_variante: producto.id_variante ?? "",
      codigo_producto_proveedor:
        producto.codigo_producto_proveedor ?? "",
      costo_referencial:
        producto.costo_referencial ?? "",
      compra_minima:
        producto.compra_minima ?? 1,
      tiempo_entrega_dias:
        producto.tiempo_entrega_dias ?? 1,
      prioridad:
        producto.prioridad ?? 1,
      es_principal:
        producto.es_principal ?? false,
      activo:
        producto.activo ?? true,
    });
  }, [producto]);

  //===========================================
  // VARIANTES
  //===========================================

  const variantes = useMemo(() => {
    if (!form.id_producto) return [];

    const prod = productos.find(
      (p) =>
        Number(p.id_producto) === Number(form.id_producto)
    );

    return prod?.variantes ?? [];
  }, [productos, form.id_producto]);

  // FIX: al cambiar de producto (alta nueva), si el producto elegido
  // tiene variantes, no debería arrastrarse una selección de variante
  // que pertenecía al producto anterior.
  useEffect(() => {
    if (!producto) {
      setForm((prev) => ({ ...prev, id_variante: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.id_producto]);

  //===========================================
  // CAMBIOS
  //===========================================

  const cambiar = (campo, valor) => {
    setForm((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  //===========================================
  // GUARDAR
  //===========================================

  const guardar = async () => {
    // FIX: si el producto tiene variantes reales, no se puede guardar
    // la asociación sin elegir cuál -- antes esto se guardaba como
    // id_variante = null silenciosamente, indistinguible de un
    // producto que realmente no tiene variantes.
    if (variantes.length > 0 && form.id_variante === "") {
      setError("Este producto tiene variantes: seleccioná una antes de guardar.");
      return;
    }

    try {
      setGuardando(true);
      setError("");

      const body = {
        id_proveedor: idProveedor,
        id_producto: Number(form.id_producto),
        id_variante:
          form.id_variante === ""
            ? null
            : Number(form.id_variante),
        codigo_producto_proveedor:
          form.codigo_producto_proveedor || null,
        costo_referencial:
          Number(form.costo_referencial),
        compra_minima:
          Number(form.compra_minima),
        tiempo_entrega_dias:
          Number(form.tiempo_entrega_dias),
        prioridad:
          Number(form.prioridad),
        es_principal:
          form.es_principal,
        activo:
          form.activo,
      };

      if (producto) {
        await axios.put(
          `${API_URL}/proveedores/productos`,
          body,
          {
            headers: getAuthHeader(),
          }
        );
      } else {
        await axios.post(
          `${API_URL}/proveedores/productos`,
          body,
          {
            headers: getAuthHeader(),
          }
        );
      }

      onGuardado();

    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.error ||
          "No se pudo guardar."
      );

    } finally {
      setGuardando(false);
    }
  };
    if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal">
          <div className="modal-body">
            <h3>Cargando...</h3>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">

      <div className="modal modal-mediano">

        <div className="modal-header">

          <div>

            <h2>
              {producto
                ? "Editar Asociación"
                : "Asociar Producto"}
            </h2>

            <p className="modal-subtitulo">
              Configuración comercial del proveedor
            </p>

          </div>

          <button
            className="modal-cerrar"
            onClick={onClose}
          >
            ✕
          </button>

        </div>

        <div className="modal-body">

          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          {/* PRODUCTO */}

          <div className="form-group">

            <label>Producto</label>

            <select
              value={form.id_producto}
              disabled={!!producto}
              onChange={(e) =>
                cambiar("id_producto", e.target.value)
              }
            >
              <option value="">
                Seleccionar producto
              </option>

              {productos.map((p) => (
                <option
                  key={p.id_producto}
                  value={p.id_producto}
                >
                  {p.nombre}
                </option>
              ))}

            </select>

          </div>

          {/* VARIANTE */}

          {variantes.length > 0 && (

            <div className="form-group">

              <label>
                Variante *
              </label>

              <select
                value={form.id_variante}
                disabled={!!producto}
                onChange={(e) =>
                  cambiar(
                    "id_variante",
                    e.target.value
                  )
                }
                className={
                  form.id_variante === "" ? "input-error" : ""
                }
              >

                <option value="">
                  Seleccionar variante
                </option>

                {variantes.map((v) => (

                  <option
                    key={v.id_variante}
                    value={v.id_variante}
                  >
                    {v.nombre_variante}
                  </option>

                ))}

              </select>

              {form.id_variante === "" && (
                <span className="campo-error">
                  Este producto tiene variantes: elegí una.
                </span>
              )}

            </div>

          )}

          <div className="grid-2">

            <div className="form-group">

              <label>
                Código proveedor
              </label>

              <input
                type="text"
                value={
                  form.codigo_producto_proveedor
                }
                onChange={(e) =>
                  cambiar(
                    "codigo_producto_proveedor",
                    e.target.value
                  )
                }
              />

            </div>

            <div className="form-group">

              <label>
                Costo referencial
              </label>

              <input
                type="number"
                min="0"
                value={form.costo_referencial}
                onChange={(e) =>
                  cambiar(
                    "costo_referencial",
                    e.target.value
                  )
                }
              />

            </div>

          </div>

          <div className="grid-3">

            <div className="form-group">

              <label>
                Compra mínima
              </label>

              <input
                type="number"
                min="1"
                value={form.compra_minima}
                onChange={(e) =>
                  cambiar(
                    "compra_minima",
                    e.target.value
                  )
                }
              />

            </div>

            <div className="form-group">

              <label>
                Tiempo entrega
              </label>

              <input
                type="number"
                min="0"
                value={
                  form.tiempo_entrega_dias
                }
                onChange={(e) =>
                  cambiar(
                    "tiempo_entrega_dias",
                    e.target.value
                  )
                }
              />

            </div>

            <div className="form-group">

              <label>Prioridad</label>

              <input
                type="number"
                min="1"
                value={form.prioridad}
                onChange={(e) =>
                  cambiar(
                    "prioridad",
                    e.target.value
                  )
                }
              />

            </div>

          </div>

          <div className="checks-modal">

            <label className="check-item">

              <input
                type="checkbox"
                checked={form.es_principal}
                onChange={(e) =>
                  cambiar(
                    "es_principal",
                    e.target.checked
                  )
                }
              />

              Proveedor principal

            </label>

            <label className="check-item">

              <input
                type="checkbox"
                checked={form.activo}
                onChange={(e) =>
                  cambiar(
                    "activo",
                    e.target.checked
                  )
                }
              />

              Activo

            </label>

          </div>

        </div>

        <div className="modal-footer">

          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={guardando}
          >
            Cancelar
          </button>

          <button
            className="btn btn-primary"
            onClick={guardar}
            disabled={guardando}
          >
            {guardando
              ? "Guardando..."
              : producto
                ? "Guardar cambios"
                : "Asociar producto"}
          </button>

        </div>

      </div>

    </div>
  );
}