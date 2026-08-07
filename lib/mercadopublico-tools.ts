/**
 * Mercado Público Tools for AI Chatbot
 * 
 * This module provides AI tools for querying Mercado Público data.
 * It should be used in the AI SDK streamText function.
 */

import { tool } from "ai";
import { z } from "zod";

import {
  buscarLicitaciones,
  buscarOrdenesCompra,
  getLicitacionesResponse,
  getOrdenesResponse,
  LICITACION_ESTADOS,
  OC_ESTADOS,
} from "./mercadopublico-api";

/**
 * Get today's date in ddmmaaaa format
 */
export function getTodayDate(): string {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `${day}${month}${year}`;
}

/**
 * Create Mercado Público tools for AI chatbot
 */
export function createMercadoPublicoTools() {
  return {
    // Tool: Search licitaciones by code
    buscarLicitacionPorCodigo: tool({
      description: "Buscar una licitación específica en Mercado Público de Chile por su código (ej: 1502-37-L119)",
      parameters: z.object({
        codigo: z.string().describe("Código de la licitación, e.g. 1502-37-L119"),
      }),
      execute: async ({ codigo }) => {
        const fecha = getTodayDate();
        try {
          const data = await buscarLicitaciones(fecha, undefined, codigo);
          
          if (data.Cantidad === 0) {
            return {
              exito: false,
              mensaje: `No se encontró la licitación con código ${codigo}`,
              datos: null,
            };
          }
          
          const licitacion = data.Listado[0];
          return {
            exito: true,
            mensaje: `Licitación encontrada: ${licitacion.Nombre}`,
            datos: {
              ...licitacion,
              estadoDescripcion: LICITACION_ESTADOS[licitacion.CodigoEstado] || 'Desconocido',
              urlDetalle: `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idlicitacion=${licitacion.CodigoExterno}`,
            },
          };
        } catch (error) {
          return {
            exito: false,
            mensaje: `Error al buscar licitación: ${error instanceof Error ? error.message : 'Unknown error'}`,
            datos: null,
          };
        }
      },
    }),

    // Tool: Search licitaciones by keyword
    buscarLicitacionesPorPalabra: tool({
      description: "Buscar licitaciones en Mercado Público por palabra clave (ej: construcción, software, mantenimiento)",
      parameters: z.object({
        palabra: z.string().describe("Palabra clave para buscar, e.g. construcción, software, mantenimiento"),
        fecha: z.string().optional().describe("Fecha en formato ddmmaaaa. Si no se proporciona, se usa la fecha de hoy"),
        limite: z.number().optional().describe("Máximo de resultados a retornar (por defecto: 5)"),
      }),
      execute: async ({ palabra, fecha, limite = 5 }) => {
        const fechaBusqueda = fecha || getTodayDate();
        
        try {
          const data = await buscarLicitaciones(fechaBusqueda);
          
          const palabraLower = palabra.toLowerCase();
          const resultados = data.Listado.filter(
            (licitacion) =>
              licitacion.Nombre.toLowerCase().includes(palabraLower) ||
              licitacion.CodigoExterno.toLowerCase().includes(palabraLower)
          );
          
          const resultadosFormateados = resultados.slice(0, limite).map((licitacion) => ({
            ...licitacion,
            estadoDescripcion: LICITACION_ESTADOS[licitacion.CodigoEstado] || 'Desconocido',
            urlDetalle: `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idlicitacion=${licitacion.CodigoExterno}`,
          }));
          
          return {
            exito: true,
            mensaje: `Se encontraron ${resultados.length} licitaciones con "${palabra}" para el ${fechaBusqueda}`,
            datos: resultadosFormateados,
          };
        } catch (error) {
          return {
            exito: false,
            mensaje: `Error al buscar licitaciones: ${error instanceof Error ? error.message : 'Unknown error'}`,
            datos: null,
          };
        }
      },
    }),

    // Tool: Get today's licitaciones
    obtenerLicitacionesHoy: tool({
      description: "Obtener las licitaciones publicadas hoy en Mercado Público de Chile",
      parameters: z.object({
        estado: z.string().optional().describe("Filtrar por estado: 5 (publicada), 6 (cerrada), 7 (desierta), 8 (adjudicada)"),
        limite: z.number().optional().describe("Máximo de resultados a retornar (por defecto: 10)"),
      }),
      execute: async ({ estado, limite = 10 }) => {
        const fecha = getTodayDate();
        
        try {
          const data = await buscarLicitaciones(fecha, estado);
          
          const resultadosFormateados = data.Listado.slice(0, limite).map((licitacion) => ({
            ...licitacion,
            estadoDescripcion: LICITACION_ESTADOS[licitacion.CodigoEstado] || 'Desconocido',
            fechaCierre: new Date(licitacion.FechaCierre).toLocaleString('es-CL'),
            urlDetalle: `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idlicitacion=${licitacion.CodigoExterno}`,
          }));
          
          return {
            exito: true,
            mensaje: `Se encontraron ${data.Cantidad} licitaciones para el ${fecha}${estado ? ` con estado ${estado}` : ''}`,
            datos: resultadosFormateados,
          };
        } catch (error) {
          return {
            exito: false,
            mensaje: `Error al obtener licitaciones: ${error instanceof Error ? error.message : 'Unknown error'}`,
            datos: null,
          };
        }
      },
    }),

    // Tool: Get purchase orders
    obtenerOrdenesCompra: tool({
      description: "Obtener órdenes de compra del Mercado Público de Chile",
      parameters: z.object({
        fecha: z.string().optional().describe("Fecha en formato ddmmaaaa. Si no se proporciona, se usa la fecha de hoy"),
        estado: z.string().optional().describe("Filtrar por estado: aceptada, cancelada, etc."),
        limite: z.number().optional().describe("Máximo de resultados a retornar (por defecto: 10)"),
      }),
      execute: async ({ fecha, estado, limite = 10 }) => {
        const fechaBusqueda = fecha || getTodayDate();
        
        try {
          const data = await buscarOrdenesCompra(fechaBusqueda, estado);
          
          const resultadosFormateados = data.Listado.slice(0, limite).map((orden) => ({
            ...orden,
            estadoDescripcion: orden.Estado ? OC_ESTADOS[orden.Estado] || orden.Estado : 'N/A',
          }));
          
          return {
            exito: true,
            mensaje: `Se encontraron ${data.Cantidad} órdenes de compra para el ${fechaBusqueda}${estado ? ` con estado ${estado}` : ''}`,
            datos: resultadosFormateados,
          };
        } catch (error) {
          return {
            exito: false,
            mensaje: `Error al obtener órdenes de compra: ${error instanceof Error ? error.message : 'Unknown error'}`,
            datos: null,
          };
        }
      },
    }),

    // Tool: Get help about Mercado Público
    ayudaMercadoPublico: tool({
      description: "Obtener ayuda sobre cómo usar Mercado Público y la API",
      parameters: z.object({
        tema: z.string().optional().describe("Tema específico: licitaciones, ordenes, estados, como_usar"),
      }),
      execute: async ({ tema }) => {
        const ayudas: Record<string, string> = {
          licitaciones: `
**Licitaciones en Mercado Público:**

- Una licitación es un proceso de compra pública donde el Estado invita a proveedores a presentar ofertas
- Los estados posibles son:
  - 5: Publicada (el proceso está activo)
  - 6: Cerrada (el plazo de postulación terminó)
  - 7: Desierta (no hubo ofertas válidas)
  - 8: Adjudicada (se seleccionó un ganador)
  - 9: Revocada (el proceso fue cancelado)

- Para buscar licitaciones puedes:
  1. Usar el código exacto (ej: 1502-37-L119)
  2. Buscar por palabra clave (ej: construcción, software)
  3. Obtener todas las licitaciones del día`,

          ordenes: `
**Órdenes de Compra en Mercado Público:**

- Las órdenes de compra son documentos que formalizan una compra realizada
- Los estados posibles son:
  - 4: Enviada a Proveedor
  - 5: En proceso
  - 6: Aceptada
  - 9: Cancelada
  - 12: Recepción Conforme
  - 13: Pendiente de Recepcionar
  - 14: Recepcionada Parcialmente
  - 15: Recepción Conforme Incompleta

- Para buscar órdenes necesitas:
  1. La fecha en formato ddmmaaaa
  2. Opcionalmente, el estado`,

          como_usar: `
**Cómo usar Mercado Público:**

1. **Para proveedores:**
   - Inscríbete en ChileProveedores
   - Verifica tu estado en TGR y SII
   - Busca licitaciones que se ajusten a tu rubro
   - Presenta tu oferta antes de la fecha de cierre

2. **Para compradores:**
   - Publica tus necesidades de compra
   - Gestiona las licitaciones
   - Emite órdenes de compra
   - Realiza la recepción de bienes/servicios

3. **Uso de la API:**
   - Obtén tu ticket gratuito en api.mercadopublico.cl
   - Usa los endpoints para licitaciones y órdenes
   - Los datos se actualizan en tiempo real`,
        };

        const ayuda = tema ? (ayudas[tema] || ayudas.como_usar) : ayudas.como_usar;
        
        return {
          exito: true,
          mensaje: ayuda.trim(),
          datos: null,
        };
      },
    }),
  };
}

/**
 * Get system prompt for Mercado Público chatbot
 */
export function getMercadoPublicoSystemPrompt(): string {
  const today = new Date().toLocaleDateString('es-CL');
  
  return `Eres un asistente especializado en el Mercado Público de Chile (ChileCompra). Tu objetivo es ayudar a los usuarios a consultar licitaciones y órdenes de compra.

## Información importante:
- La fecha de hoy es: ${today}
- La API de Mercado Público está disponible en https://api.mercadopublico.cl
- Puedes buscar licitaciones por código, palabra clave, o listar todas las del día
- Puedes buscar órdenes de compra por fecha y estado

## Cómo responder:
1. **Cuando el usuario pregunta por licitaciones:**
   - Usa la herramienta buscarLicitacionesPorPalabra si no tiene un código específico
   - Usa la herramienta buscarLicitacionPorCodigo si tiene un código exacto
   - Usa la herramienta obtenerLicitacionesHoy para ver todas las del día

2. **Cuando el usuario pregunta por órdenes de compra:**
   - Usa la herramienta obtenerOrdenesCompra

3. **Cuando el usuario necesita ayuda:**
   - Usa la herramienta ayudaMercadoPublico

4. **Formato de respuesta:**
   - Sé claro y conciso
   - Incluye la información relevante (código, nombre, estado, fecha de cierre)
   - Proporciona el enlace para ver más detalles
   - Responde siempre en español

## Ejemplos de código de licitación:
- 1502-37-L119
- 4339-14-SE19
- 3506-77-LE26

## Ejemplos de estados de licitación:
- 5 = Publicada (activa)
- 6 = Cerrada (plazo terminado)
- 7 = Desierta (sin ofertas)
- 8 = Adjudicada (con ganador)

Recuerda: NO inventes datos. Si no encuentras información, dilo claramente y sugiere alternativas.`;
}
