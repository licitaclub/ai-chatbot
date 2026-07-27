import { convertToCoreMessages, Message, streamText } from "ai";
import { z } from "zod";

import { geminiProModel } from "@/ai";
import { auth } from "@/app/(auth)/auth";
import {
  deleteChatById,
  getChatById,
  saveChat,
} from "@/db/queries";

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

  const result = await streamText({
    model: geminiProModel,
    system: `\
- Ayudas a los usuarios a buscar licitaciones en Mercado Público de Chile.
- Responde siempre en español. Toda la comunicación con el usuario debe ser en español.
- Cuando el usuario proporcione un código de licitación, utiliza la herramienta searchLicitacion.
- Si la API no encuentra resultados, informa al usuario que no se encontró la licitación.
- No inventes datos ni desinformes.
- La fecha de hoy es ${new Date().toLocaleDateString()}.
`,
    messages: coreMessages,
    tools: {
      searchLicitacion: {
        description: "Buscar una licitación en el Mercado Público de Chile por su código",
        parameters: z.object({
          codigo: z
            .string()
            .describe(
              "Código de la licitación, e.g. 1502-37-L119 o 4339-14-SE19",
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
