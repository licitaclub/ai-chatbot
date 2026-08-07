/**
 * Mercado Público Chile API Integration
 * 
 * This module provides functions to interact with the Mercado Público API
 * for querying licitaciones (tenders) and órdenes de compra (purchase orders).
 * 
 * API Documentation: https://www.chilecompra.cl/api/
 */

export interface Licitacion {
  CodigoExterno: string;
  Nombre: string;
  CodigoEstado: number;
  FechaCierre: string;
  Organismo?: string;
  TipoLicitacion?: string;
  Monto?: number;
  Region?: string;
  Rubro?: string;
}

export interface OrdenCompra {
  Codigo?: string;
  Organismo?: string;
  Proveedor?: string;
  Estado?: string;
  Monto?: number;
  Fecha?: string;
}

export interface ApiResponse<T> {
  Cantidad: number;
  FechaCreacion: string;
  Version: string;
  Listado: T[];
}

/**
 * Status codes for licitaciones
 * 5 = Publicada (Published)
 * 6 = Cerrada (Closed)
 * 7 = Desierta (Empty/No bids)
 * 8 = Adjudicada (Awarded)
 * 9 = Revocada (Revoked)
 */
export const LICITACION_ESTADOS: Record<number, string> = {
  5: 'Publicada',
  6: 'Cerrada',
  7: 'Desierta',
  8: 'Adjudicada',
  9: 'Revocada',
};

/**
 * Status codes for órdenes de compra
 */
export const OC_ESTADOS: Record<string, string> = {
  '4': 'Enviada a Proveedor',
  '5': 'En proceso',
  '6': 'Aceptada',
  '9': 'Cancelada',
  '12': 'Recepción Conforme',
  '13': 'Pendiente de Recepcionar',
  '14': 'Recepcionada Parcialmente',
  '15': 'Recepción Conforme Incompleta',
};

const API_BASE_URL = 'https://api.mercadopublico.cl/servicios/v1/publico';

/**
 * Get Mercado Público ticket from environment
 */
function getTicket(): string {
  const ticket = process.env.MERCADO_PUBLICO_TICKET;
  if (!ticket || ticket === 'placeholder-ticket-1234') {
    throw new Error(
      'MERCADO_PUBLICO_TICKET not configured. ' +
      'Get your free ticket at https://api.mercadopublico.cl'
    );
  }
  return ticket;
}

/**
 * Fetch licitaciones (tenders) from Mercado Público
 * 
 * @param fecha - Date in format ddmmaaaa (e.g., 02082026 for August 2, 2026)
 * @param estado - Optional state filter (e.g., "5" for published, "activas" for active)
 * @param codigo - Optional tender code (e.g., "1502-37-L119")
 * 
 * @example
 * // Get today's licitaciones
 * const licitaciones = await buscarLicitaciones('02082026');
 * 
 * @example
 * // Get licitaciones by code
 * const licitacion = await buscarLicitaciones('02082026', undefined, '1502-37-L119');
 * 
 * @example
 * // Get active licitaciones
 * const activas = await buscarLicitaciones('02082026', 'activas');
 */
export async function buscarLicitaciones(
  fecha: string,
  estado?: string,
  codigo?: string
): Promise<ApiResponse<Licitacion>> {
  const ticket = getTicket();
  const params = new URLSearchParams({ fecha, ticket });
  
  if (estado) {
    params.append('estado', estado);
  }
  
  if (codigo) {
    params.append('codigo', codigo);
  }
  
  const url = `${API_BASE_URL}/licitaciones.json?${params}`;
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
    next: { revalidate: 300 }, // Cache for 5 minutes
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Mercado Público API error ${response.status}: ${error.Mensaje || response.statusText}`
    );
  }
  
  return response.json();
}

/**
 * Search licitaciones by keyword
 * Note: The API doesn't support keyword search directly, so we filter client-side
 */
export async function buscarLicitacionesPorPalabra(
  fecha: string,
  palabra: string,
  maxResults: number = 10
): Promise<Licitacion[]> {
  const data = await buscarLicitaciones(fecha);
  
  const palabraLower = palabra.toLowerCase();
  const resultados = data.Listado.filter(
    (licitacion) =>
      licitacion.Nombre.toLowerCase().includes(palabraLower) ||
      licitacion.CodigoExterno.toLowerCase().includes(palabraLower)
  );
  
  return resultados.slice(0, maxResults);
}

/**
 * Fetch órdenes de compra (purchase orders) from Mercado Público
 * 
 * @param fecha - Date in format ddmmaaaa
 * @param estado - Optional state (e.g., "aceptada", "cancelada", "todos")
 * 
 * @example
 * // Get today's purchase orders
 * const ordenes = await buscarOrdenesCompra('02082026');
 * 
 * @example
 * // Get only accepted orders
 * const aceptadas = await buscarOrdenesCompra('02082026', 'aceptada');
 */
export async function buscarOrdenesCompra(
  fecha: string,
  estado?: string
): Promise<ApiResponse<OrdenCompra>> {
  const ticket = getTicket();
  const params = new URLSearchParams({ fecha, ticket });
  
  if (estado) {
    params.append('estado', estado);
  }
  
  const url = `${API_BASE_URL}/ordenesdecompra.json?${params}`;
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
    next: { revalidate: 300 },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Mercado Público API error ${response.status}: ${error.Mensaje || response.statusText}`
    );
  }
  
  return response.json();
}

/**
 * Format a licitación for display
 */
export function formatearLicitacion(licitacion: Licitacion): string {
  const estado = LICITACION_ESTADOS[licitacion.CodigoEstado] || 'Desconocido';
  const fechaCierre = new Date(licitacion.FechaCierre).toLocaleDateString('es-CL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  
  return `**Licitación: ${licitacion.CodigoExterno}**
  
**Nombre:** ${licitacion.Nombre}
**Estado:** ${estado}
**Fecha de cierre:** ${fechaCierre}
**Ver más:** https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idlicitacion=${licitacion.CodigoExterno}`;
}

/**
 * Format an order for display
 */
export function formatearOrden(orden: OrdenCompra): string {
  const estado = orden.Estado ? OC_ESTADOS[orden.Estado] || orden.Estado : 'N/A';
  
  return `**Orden de Compra: ${orden.Codigo || 'N/A'}**

**Organismo:** ${orden.Organismo || 'N/A'}
**Proveedor:** ${orden.Proveedor || 'N/A'}
**Estado:** ${estado}
**Monto:** ${orden.Monto ? `$${orden.Monto.toLocaleString('es-CL')}` : 'N/A'}`;
}

/**
 * Get formatted response for chatbot
 */
export async function getLicitacionesResponse(fecha: string, mensaje: string): Promise<string> {
  const fechaRegex = /(\d{2})(\d{2})(\d{4})/;
  const match = mensaje.match(fechaRegex);
  
  if (match) {
    fecha = `${match[2]}${match[1]}${match[3]}`; // Convert from MMDDYYYY to ddmmaaaa
  }
  
  try {
    const data = await buscarLicitaciones(fecha);
    
    if (data.Cantidad === 0) {
      return `No se encontraron licitaciones para la fecha ${fecha}. Intenta con otra fecha.`;
    }
    
    const licitaciones = data.Listado.slice(0, 5);
    const respuestas = licitaciones.map(formatearLicitacion);
    
    return `Se encontraron ${data.Cantidad} licitaciones para el ${fecha}.\n\n${respuestas.join('\n\n---\n\n')}\n\n...\n\n¿Necesitas más detalles sobre alguna licitación?`;
  } catch (error) {
    console.error('Error fetching licitaciones:', error);
    return `Error al consultar licitaciones: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * Get formatted response for purchase orders
 */
export async function getOrdenesResponse(fecha: string, mensaje: string): Promise<string> {
  const fechaRegex = /(\d{2})(\d{2})(\d{4})/;
  const match = mensaje.match(fechaRegex);
  
  if (match) {
    fecha = `${match[2]}${match[1]}${match[3]}`;
  }
  
  try {
    const data = await buscarOrdenesCompra(fecha);
    
    if (data.Cantidad === 0) {
      return `No se encontraron órdenes de compra para la fecha ${fecha}.`;
    }
    
    const ordenes = data.Listado.slice(0, 5);
    const respuestas = ordenes.map(formatearOrden);
    
    return `Se encontraron ${data.Cantidad} órdenes de compra para el ${fecha}.\n\n${respuestas.join('\n\n---\n\n')}\n\n...\n\n¿Necesitas más detalles sobre alguna orden?`;
  } catch (error) {
    console.error('Error fetching órdenes de compra:', error);
    return `Error al consultar órdenes de compra: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}
