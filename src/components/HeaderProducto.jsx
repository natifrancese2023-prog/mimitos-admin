import "./HeaderProducto.css";

export default function HeaderProducto({ producto }) {
  return (
    <div className="header-producto">

      <div className="header-imagen">

        {producto?.imagen_url ? (
          <img
            src={producto.imagen_url}
            alt={producto.nombre}
          />
        ) : (
          <div className="sin-imagen">
            📦
          </div>
        )}

      </div>

      <div className="header-info">

        <h2>{producto?.nombre || "Producto"}</h2>

        <div className="info-grid">

          <div>

            <strong>Categoría</strong>

            <span>{producto?.nombre_categoria || "-"}</span>

          </div>

          <div>

            <strong>Stock Total</strong>

            <span>{producto?.stock_total ?? "-"}</span>

          </div>

          <div>

            <strong>Variantes</strong>

            <span>{producto?.cantidad_variantes ?? "-"}</span>

          </div>

          <div>

            <strong>Código Principal</strong>

            <span>{producto?.codigo_principal || "-"}</span>

          </div>

        </div>

      </div>

    </div>
  );
}