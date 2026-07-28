import { motion } from "framer-motion";

import { MessageIcon } from "./icons";

export const Overview = () => {
  return (
    <motion.div
      key="overview"
      className="max-w-[500px] mt-20 mx-4 md:mx-0"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: 0.5 }}
    >
      <div className="border-none bg-muted/50 rounded-2xl p-6 flex flex-col gap-4 text-zinc-500 text-sm dark:text-zinc-400 dark:border-zinc-700">
        <p className="flex flex-row justify-center gap-4 items-center text-zinc-900 dark:text-zinc-50">
          <MessageIcon />
        </p>
        <p>
          Encuentra oportunidades de negocio con el Estado, más rápido.
          LicitaCLUB es una plataforma de inteligencia para empresas que
          participan en Mercado Público y Compra Ágil.
        </p>
        <p>
          Busca licitaciones, analiza oportunidades y obtén respuestas
          basadas en información real directamente desde ChileCompra, todo
          desde un único panel de trabajo.
        </p>
        <p>
          Nuestro asistente inteligente te ayuda a:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Buscar licitaciones y Compras Ágiles por rubro, organismo o palabra clave.</li>
          <li>Analizar requisitos, fechas y antecedentes de cada oportunidad.</li>
          <li>Comprender bases y documentos de una licitación.</li>
          <li>Identificar información relevante para tomar mejores decisiones comerciales.</li>
          <li>Ahorrar tiempo en la búsqueda y análisis de oportunidades.</li>
        </ul>
        <p>
          Este panel será la base para nuevas funcionalidades de LicitaCLUB,
          incluyendo alertas inteligentes, historial de búsquedas, seguimiento
          de oportunidades y asistentes especializados para apoyar el proceso
          de venta al Estado.
        </p>
        <p className="text-zinc-300 dark:text-zinc-600 text-xs">
          Comienza escribiendo una pregunta en el chat, por ejemplo:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-xs text-zinc-400 dark:text-zinc-500">
          <li>"Busca Compras Ágiles de construcción."</li>
          <li>"Muéstrame licitaciones de servicios informáticos."</li>
          <li>"Analiza esta licitación."</li>
          <li>"¿Qué oportunidades cierran esta semana?"</li>
        </ul>
      </div>
    </motion.div>
  );
};
