import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './Facturas.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

function auth() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` };
}

const FORMAS = {
  efectivo: '💵 Efectivo',
  debito: '💳 Débito',
  credito: '💳 Crédito',
  transferencia: '🏦 Transferencia',
  mercadopago: '📱 Mercado Pago',
};

function dinero(valor) {
  return Number(valor || 0).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
  });
}

function fecha(valor) {
  if (!valor) return '—';
  return new Date(valor).toLocaleString('es-AR');
}

export default function Facturas() {
  const [facturas, setFacturas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const [modalAnular, setModalAnular] = useState(false);
  const [tipoReversion, setTipoReversion] = useState('dinero');
  const [motivo, setMotivo] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [errorAnulacion, setErrorAnulacion] = useState('');
  const [vista, setVista] = useState('facturas');
const [notasCredito, setNotasCredito] = useState([]);
const [cargandoNotas, setCargandoNotas] = useState(false);
const [errorNotas, setErrorNotas] = useState('');

  const cargarFacturas = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const res = await axios.get(`${API_URL}/facturas`, { headers: auth() });
      setFacturas(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'No se pudieron cargar las facturas.');
    } finally {
      setCargando(false);
    }
  }, []);
  const cargarNotasCredito = useCallback(async () => {
  setCargandoNotas(true);
  setErrorNotas('');

  try {
    const res = await axios.get(`${API_URL}/notas-credito`, {
      headers: auth(),
    });

    setNotasCredito(Array.isArray(res.data) ? res.data : []);
  } catch (err) {
    console.error(err);
    setErrorNotas(
      err.response?.data?.error ||
      'No se pudieron cargar las notas de crédito.'
    );
  } finally {
    setCargandoNotas(false);
  }
}, []);

  useEffect(() => {
  cargarFacturas();
  cargarNotasCredito();
}, [cargarFacturas, cargarNotasCredito]);

  const resumen = useMemo(() => ({
    total: facturas.length,
    emitidas: facturas.filter((f) => f.estado === 'emitida').length,
    anuladas: facturas.filter((f) => f.estado === 'anulada').length,
    importe: facturas.reduce((s, f) => s + Number(f.total || 0), 0),
  }), [facturas]);

  async function verFactura(factura) {
    setCargandoDetalle(true);
    setError('');
    try {
      const res = await axios.get(`${API_URL}/facturas/${factura.id_factura}`, {
        headers: auth(),
      });
      setFacturaSeleccionada(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo obtener la factura.');
    } finally {
      setCargandoDetalle(false);
    }
  }

  function abrirAnulacion(factura) {
    setFacturaSeleccionada(factura);
    setTipoReversion('dinero');
    setMotivo('');
    setErrorAnulacion('');
    setModalAnular(true);
  }

  function cerrarAnulacion() {
    if (procesando) return;
    setModalAnular(false);
    setMotivo('');
    setErrorAnulacion('');
  }

  async function confirmarAnulacion() {
    if (!facturaSeleccionada) return;

    if (!motivo.trim()) {
      setErrorAnulacion('Ingresá un motivo para la anulación.');
      return;
    }

    setProcesando(true);
    setErrorAnulacion('');

    try {
      const res = await axios.post(
        `${API_URL}/facturas/${facturaSeleccionada.id_factura}/anular`,
        {
          motivo: motivo.trim(),
          tipo_reversion: tipoReversion,
        },
        { headers: auth() },
      );

      setModalAnular(false);
      await cargarFacturas();
      if (tipoReversion === 'nota_credito') {
  await cargarNotasCredito();
}

      if (res.data?.nota_credito) {
        alert(
          `Factura anulada. Nota de crédito #${res.data.nota_credito.id_nota_credito} por ${dinero(res.data.nota_credito.saldo_disponible)} creada a favor del cliente.`,
        );
      } else {
        alert('Factura anulada y devolución registrada correctamente.');
      }

      if (facturaSeleccionada) {
        const actualizada = await axios.get(
          `${API_URL}/facturas/${facturaSeleccionada.id_factura}`,
          { headers: auth() },
        );
        setFacturaSeleccionada(actualizada.data);
      }
    } catch (err) {
      setErrorAnulacion(err.response?.data?.error || 'No se pudo anular la factura.');
    } finally {
      setProcesando(false);
    }
  }

  function imprimirFactura() {
    window.print();
  }

  return (
    <div className="facturas-page">
      <div className="facturas-header">
        <div>
          <h1>Facturación</h1>
          <p>Facturas emitidas, anulaciones y notas de crédito.</p>
        </div>
        <button className="btn-primario" onClick={() => {
  cargarFacturas();
  cargarNotasCredito();
}} disabled={cargando}>
          {cargando ? 'Actualizando...' : '↻ Actualizar'}
        </button>
      </div>
      <div className="facturacion-tabs">
  <button
    className={vista === 'facturas' ? 'activa' : ''}
    onClick={() => setVista('facturas')}
  >
    🧾 Facturas
  </button>

  <button
    className={vista === 'notas' ? 'activa' : ''}
    onClick={() => {
      setVista('notas');
      cargarNotasCredito();
    }}
  >
    🧾 Notas de crédito
  </button>
</div>
{vista === 'facturas' && (
  <>

      <div className="facturas-resumen">
        <div className="facturas-card"><strong>{resumen.total}</strong><span>Facturas</span></div>
        <div className="facturas-card"><strong>{resumen.emitidas}</strong><span>Emitidas</span></div>
        <div className="facturas-card"><strong>{resumen.anuladas}</strong><span>Anuladas</span></div>
        <div className="facturas-card"><strong>{dinero(resumen.importe)}</strong><span>Importe facturado</span></div>
      </div>

      {error && <div className="facturas-alerta error">⚠️ {error}</div>}

      {cargando ? (
        <div className="facturas-vacio">Cargando facturas...</div>
      ) : facturas.length === 0 ? (
        <div className="facturas-vacio">
          <span>🧾</span>
          <strong>No hay facturas registradas</strong>
          <p>Las facturas aparecerán automáticamente cuando se concrete una venta.</p>
        </div>
      ) : (
        <div className="facturas-tabla-wrap">
          <table className="facturas-tabla">
            <thead>
              <tr>
                <th>Factura</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Forma de pago</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {facturas.map((f) => (
                <tr key={f.id_factura}>
                  <td><strong>#{f.id_factura}</strong></td>
                  <td>{fecha(f.fecha)}</td>
                  <td>{f.cliente_nombre} {f.cliente_apellido}</td>
                  <td>{FORMAS[f.forma_pago] || f.forma_pago || '—'}</td>
                  <td><strong>{dinero(f.total)}</strong></td>
                  <td>
                    <span className={`factura-badge ${f.estado === 'anulada' ? 'anulada' : 'emitida'}`}>
                      {f.estado === 'anulada' ? 'Anulada' : 'Emitida'}
                    </span>
                  </td>
                  <td>
                    <div className="factura-acciones">
                      <button className="btn-ver" onClick={() => verFactura(f)}>Ver</button>
                      {f.estado !== 'anulada' && (
                        <button className="btn-danger" onClick={() => abrirAnulacion(f)}>
                          Anular
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </>
)}

{vista === 'notas' && (
  <div className="notas-credito-seccion">

    <div className="notas-credito-header">
      <div>
        <h2>Notas de crédito</h2>
        <p>
          Créditos generados por anulaciones de facturas.
        </p>
      </div>

      <button
        className="btn-primario"
        onClick={cargarNotasCredito}
        disabled={cargandoNotas}
      >
        {cargandoNotas ? 'Actualizando...' : '↻ Actualizar'}
      </button>
    </div>

    {errorNotas && (
      <div className="facturas-alerta error">
        ⚠️ {errorNotas}
      </div>
    )}

    {cargandoNotas ? (
      <div className="facturas-vacio">
        Cargando notas de crédito...
      </div>
    ) : notasCredito.length === 0 ? (
      <div className="facturas-vacio">
        <span>🧾</span>
        <strong>No hay notas de crédito</strong>
        <p>
          Las notas de crédito aparecerán cuando se anulen
          facturas utilizando esta opción.
        </p>
      </div>
    ) : (
      <div className="facturas-tabla-wrap">
        <table className="facturas-tabla notas-credito-tabla">
          <thead>
            <tr>
              <th>Nota de crédito</th>
              <th>Factura</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Motivo</th>
              <th>Monto</th>
              <th>Saldo disponible</th>
              <th>Estado</th>
            </tr>
          </thead>

          <tbody>
            {notasCredito.map((nc) => (
              <tr key={nc.id_nota_credito}>
                <td>
                  <strong>
                    NC #{nc.id_nota_credito}
                  </strong>
                </td>

                <td>
                  <strong>
                    #{nc.id_factura}
                  </strong>
                </td>

                <td>
                  {fecha(nc.fecha)}
                </td>

                <td>
                  {nc.cliente_nombre || '—'}{' '}
                  {nc.cliente_apellido || ''}
                </td>

                <td>
                  {nc.motivo || '—'}
                </td>

                <td>
                  <strong>
                    {dinero(nc.monto_original)}
                  </strong>
                </td>

                <td>
                  <strong>
                    {dinero(nc.saldo_disponible)}
                  </strong>
                </td>

                <td>
                  <span
                    className={`factura-badge ${
                      nc.estado === 'anulada'
                        ? 'anulada'
                        : 'emitida'
                    }`}
                  >
                    {nc.estado === 'anulada'
                      ? 'Anulada'
                      : nc.saldo_disponible > 0
                        ? 'Disponible'
                        : 'Utilizada'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
)}

      {facturaSeleccionada && !modalAnular && (
        <div className="modal-overlay" onClick={() => setFacturaSeleccionada(null)}>
          <div className="modal modal-grande factura-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Factura #{facturaSeleccionada.id_factura}</h2>
                <p className="modal-subtitulo">{fecha(facturaSeleccionada.fecha)}</p>
              </div>
              <button className="modal-cerrar" onClick={() => setFacturaSeleccionada(null)}>✕</button>
            </div>

            <div className="modal-body factura-imprimible">
              {cargandoDetalle ? (
                <div className="facturas-vacio">Cargando detalle...</div>
              ) : (
                <>
                  <div className="factura-info-grid">
                    <div><span>Cliente</span><strong>{facturaSeleccionada.cliente_nombre} {facturaSeleccionada.cliente_apellido}</strong></div>
                    <div><span>Email</span><strong>{facturaSeleccionada.cliente_email || '—'}</strong></div>
                    <div><span>Pedido</span><strong>#{facturaSeleccionada.id_pedido}</strong></div>
                    <div><span>Forma de pago</span><strong>{FORMAS[facturaSeleccionada.forma_pago] || facturaSeleccionada.forma_pago}</strong></div>
                    <div><span>Estado</span><strong>{facturaSeleccionada.estado}</strong></div>
                    <div><span>Total</span><strong>{dinero(facturaSeleccionada.total)}</strong></div>
                  </div>

                  <div className="factura-detalle-titulo">Productos</div>
                  <table className="factura-detalle-tabla">
                    <thead>
                      <tr><th>Producto</th><th>Variante</th><th>Cantidad</th><th>Precio</th><th>Subtotal</th></tr>
                    </thead>
                    <tbody>
                      {(facturaSeleccionada.detalle || []).map((d) => (
                        <tr key={d.id_detalle}>
                          <td>{d.nombre_producto}</td>
                          <td>{d.nombre_variante || '—'}</td>
                          <td>{d.cantidad}</td>
                          <td>{dinero(d.precio_unitario)}</td>
                          <td>{dinero(d.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {facturaSeleccionada.estado === 'anulada' && (
                    <div className="facturas-alerta warning">
                      <strong>Factura anulada.</strong><br />
                      Motivo: {facturaSeleccionada.motivo_anulacion || '—'}<br />
                      Fecha: {fecha(facturaSeleccionada.fecha_anulacion)}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="modal-footer no-print">
              <button className="btn-secundario" onClick={imprimirFactura}>🖨️ Imprimir</button>
              {facturaSeleccionada.estado !== 'anulada' && (
                <button className="btn-danger" onClick={() => abrirAnulacion(facturaSeleccionada)}>Anular factura</button>
              )}
              <button className="btn-primario" onClick={() => setFacturaSeleccionada(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {modalAnular && facturaSeleccionada && (
        <div className="modal-overlay" onClick={cerrarAnulacion}>
          <div className="modal factura-modal-anular" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Anular factura #{facturaSeleccionada.id_factura}</h2>
                <p className="modal-subtitulo">{dinero(facturaSeleccionada.total)} — {facturaSeleccionada.cliente_nombre} {facturaSeleccionada.cliente_apellido}</p>
              </div>
              <button className="modal-cerrar" onClick={cerrarAnulacion}>✕</button>
            </div>

            <div className="modal-body">
              <div className="factura-alerta-anulacion">
                <strong>La mercadería volverá al stock.</strong>
                <span>Elegí qué hacer con el dinero que el cliente ya pagó.</span>
              </div>

              <div className="reversion-opciones">
                <label className={tipoReversion === 'dinero' ? 'seleccionada' : ''}>
                  <input type="radio" value="dinero" checked={tipoReversion === 'dinero'} onChange={(e) => setTipoReversion(e.target.value)} />
                  <div><strong>💵 Devolver dinero</strong><span>Se registra un egreso en Caja por lo efectivamente cobrado.</span></div>
                </label>
                <label className={tipoReversion === 'nota_credito' ? 'seleccionada' : ''}>
                  <input type="radio" value="nota_credito" checked={tipoReversion === 'nota_credito'} onChange={(e) => setTipoReversion(e.target.value)} />
                  <div><strong>🧾 Nota de crédito</strong><span>El dinero no sale de Caja. El importe pagado queda a favor del cliente.</span></div>
                </label>
              </div>

              <div className="field-group">
                <label>Motivo de la anulación *</label>
                <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej.: devolución de mercadería por parte del cliente" rows={4} />
              </div>

              {errorAnulacion && <div className="facturas-alerta error">⚠️ {errorAnulacion}</div>}
            </div>

            <div className="modal-footer">
              <button className="btn-secundario" onClick={cerrarAnulacion} disabled={procesando}>Cancelar</button>
              <button className="btn-danger" onClick={confirmarAnulacion} disabled={procesando}>
                {procesando ? 'Procesando...' : 'Confirmar anulación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
