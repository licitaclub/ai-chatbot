import { convertToCoreMessages, Message, streamText } from "ai";
import { z } from "zod";

import { geminiProModel } from "@/ai";
import { auth } from "@/app/(auth)/auth";
import {
  deleteChatById,
  getChatById,
  saveChat,
} from "@/db/queries";

/**
 * Get today's date in ddmmaaaa format for Mercado Público API
 */
function getTodayDate(): string {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `${day}${month}${year}`;
}

export async function POST(request: Request) {
  const { id, messages }: { id: string; messages: Array<Message> } =
    await request.json();

  const session = await auth();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const coreMessages = convertToCoreMessages(messages).filter(
    (message) => message.content.length > 0,
  );

  const today = getTodayDate();

  const result = await streamText({
    model: geminiProModel,
    system: `\
Eres un asistente especializado en el Mercado Público de Chile (ChileCompra). Tu objetivo es ayudar a los usuarios a consultar licitaciones y órdenes de compra.

## ¿CÓMO FUNCIONO?
Puedo ayudarte a buscar:
- ✅ Licitaciones por código (ej: 1502-37-L119)
- ✅ Licitaciones por palabra clave (ej: "construcción", "software")
- ✅ Todas las licitaciones de hoy
- ✅ Órdenes de compra

## EJEMPLOS DE QUÉ PODES DECIRME:
- "Busco licitaciones de construcción"
- "¿Qué hay hoy en Mercado Público?"
- "Dame el código 1502-37-L119"
- "Órdenes de compra aceptadas de hoy"
- "¿Cómo funciona Mercado Público?"

## RECURSOS ÚTILES:
- Dashboard: https://www.mercadopublico.cl
- API Docs: https://www.chilecompra.cl/api/

## AVISO IMPORTANTE:
La fecha de hoy es: ${today}
`,
    messages: coreMessages,
    tools: {
      searchLicitacion: {
        description: "Buscar una licitación en el Mercado Público de Chile por su código",
        parameters: z.object({
          codigo: z
            .string()
            .describe(
              "Código de la licitación, e.g. 1502-37-L119 or 4339-14-SE19",
            ),
        }),
        execute: async ({ codigo }) => {
          const ticket = process.env.MERCADO_PUBLICO_TICKET;

          if (!ticket) {
            return {
              error:
                "El servicio de Mercado Público no está configurado. Contacta al administrador.",
            };
          }

          const response = await fetch(
            `https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?codigo=${encodeURIComponent(codigo)}&ticket=${encodeURIComponent(ticket)}`,
          );

          if (!response.ok) {
            return {
              error:
                "No se pudo obtener información de la licitación desde Mercado Público.",
            };
          }

          const data = await response.json();
          return data;
        },
      },
      
      // NUEVO: Buscar licitaciones por palabra clave
      buscarLicitacionesPorPalabra: {
        description: "Buscar licitaciones en Mercado Público por palabra clave (ej: construcción, software, mantenimiento)",
        parameters: z.object({
          palabra: z.string().describe("Palabra clave para buscar, e.g. construcción, software, mantenimiento"),
          fecha: z.string().optional().describe("Fecha en formato ddmmaaaa. Si no se proporciona, se usa la fecha de hoy"),
        }),
        execute: async ({ palabra, fecha }) => {
          const ticket = process.env.MERCADO_PUBLICO_TICKET;
          const fechaBusqueda = fecha || getTodayDate();

          if (!ticket) {
            return {
              error: "El servicio de Mercado Público no está configurado.",
            };
          }

          try {
            const response = await fetch(
              `https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?fecha=${encodeURIComponent(fechaBusqueda)}&ticket=${encodeURIComponent(ticket)}`,
            );

            if (!response.ok) {
              return {
                error: "No se pudo obtener información desde Mercado Público.",
              };
            }

            const data = await response.json();
            
            // Filtrar por palabra clave
            const palabraLower = palabra.toLowerCase();
            const resultados = data.Listado.filter(
              (licitacion: any) =>
                licitacion.Nombre.toLowerCase().includes(palabraLower) ||
                licitacion.CodigoExterno.toLowerCase().includes(palabraLower)
            );

            return {
              cantidadTotal: data.Cantidad,
              cantidadFiltrada: resultados.length,
              resultados: resultados.slice(0, 10),
            };
          } catch (error) {
            return {
              error: `Error al buscar licitaciones: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
          }
        },
      },
      
      // NUEVO: Obtener todas las licitaciones del día
      obtenerLicitacionesHoy: {
        description: "Obtener todas las licitaciones publicadas hoy en Mercado Público",
        parameters: z.object({
          estado: z.string().optional().describe("Filtrar por estado: 5 (publicada), 6 (cerrada), 7 (desierta), 8 (adjudicada)"),
          limite: z.number().optional().describe("Máximo de resultados a retornar (por defecto: 10)"),
        }),
        execute: async ({ estado, limite = 10 }) => {
          const ticket = process.env.MERCADO_PUBLICO_TICKET;
          const fecha = getTodayDate();

          if (!ticket) {
            return {
              error: "El servicio de Mercado Público no está configurado.",
            };
          }

          try {
            const params = new URLSearchParams({ fecha, ticket });
            if (estado) {
              params.append('estado', estado);
            }

            const response = await fetch(
              `https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?${params}`,
            );

            if (!response.ok) {
              return {
                error: "No se pudo obtener información desde Mercado Público.",
              };
            }

            const data = await response.json();
            
            return {
              fecha: fecha,
              cantidadTotal: data.Cantidad,
              resultados: data.Listado.slice(0, limite),
            };
          } catch (error) {
            return {
              error: `Error al obtener licitaciones: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
          }
        },
      },
      
      // NUEVO: Obtener órdenes de compra
      obtenerOrdenesCompra: {
        description: "Obtener órdenes de compra del Mercado Público",
        parameters: z.object({
          fecha: z.string().optional().describe("Fecha en formato ddmmaaaa. Si no se proporciona, se usa la fecha de hoy"),
          estado: z.string().optional().describe("Filtrar por estado: aceptada, cancelada, etc."),
          limite: z.number().optional().describe("Máximo de resultados a retornar (por defecto: 10)"),
        }),
        execute: async ({ fecha, estado, limite = 10 }) => {
          const ticket = process.env.MERCADO_PUBLICO_TICKET;
          const fechaBusqueda = fecha || getTodayDate();

          if (!ticket) {
            return {
              error: "El servicio de Mercado Público no está configurado.",
            };
          }

          try {
            const params = new URLSearchParams({ fecha: fechaBusqueda, ticket });
            if (estado) {
              params.append('estado', estado);
            }

            const response = await fetch(
              `https://api.mercadopublico.cl/servicios/v1/publico/ordenesdecompra.json?${params}`,
            );

            if (!response.ok) {
              return {
                error: "No se pudo obtener información desde Mercado Público.",
              };
            }

            const data = await response.json();
            
            return {
              fecha: fechaBusqueda,
              cantidadTotal: data.Cantidad,
              resultados: data.Listado.slice(0, limite),
            };
          } catch (error) {
            return {
              error: `Error al obtener órdenes de compra: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
          }
        },
      },
    },
    onFinish: async ({ responseMessages }) => {
      if (session.user && session.user.id) {
        try {
          await saveChat({
            id,
            messages: [...coreMessages, ...responseMessages],
            userId: session.user.id,
          });
        } catch (error) {
          console.error("Failed to save chat");
        }
      }
    },
    experimental_telemetry: {
      isEnabled: true,
      functionId: "stream-text",
    },
  });

  return result.toDataStreamResponse({});
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Not Found", { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    await deleteChatById({ id });

    return new Response("Chat deleted", { status: 200 });
  } catch (error) {
    return new Response("An error occurred while processing your request", {
      status: 500,
    });
  }
}
