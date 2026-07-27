"use client";

import { useChat } from "ai/react";
import { Streamdown } from "streamdown";

export function AdminChatPanel() {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
  } = useChat({
    api: "/api/chat",
    id: "admin-chat",
    initialMessages: [
      {
        role: "assistant",
        content:
          "Bienvenido al panel de LicitaClub. 🎯\n\nPuedes consultar oportunidades de compras públicas chilenas directamente desde aquí. Por ejemplo:\n\n• Busca licitaciones de construcción\n• Muestra oportunidades por código\n• ¿Qué licitaciones están disponibles?",
      },
    ],
  });

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-700">🤖 Asistente IA</h2>
        <p className="text-xs text-slate-400">Consulta Mercado Público</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[90%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-800"
              }`}
            >
              {msg.role === "assistant" ? (
                <Streamdown>{msg.content}</Streamdown>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-slate-100 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="Buscar licitaciones..."
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          →
        </button>
      </form>
    </div>
  );
}
