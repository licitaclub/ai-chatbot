import { motion } from "framer-motion";
import Link from "next/link";

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
          LicitaCLUB es un chatbot especializado en Mercado Público de Chile.
          Utiliza{" "}
          <code className="rounded-sm bg-muted-foreground/15 px-1.5 py-0.5">
            streamText
          </code>{" "}
          en el servidor y la IA de Gemini para buscar licitaciones y órdenes
          de compra con datos en tiempo real.
        </p>
        <p>
          Automatice sus respuestas a Compra Ágil y licitaciones públicas.
          Cuatro agentes AI leen el pliego, redactan la propuesta, verifican
          cumplimiento y la dejan lista para presentar en ChileCompra — en
          minutos, no en días.
        </p>
      </div>
    </motion.div>
  );
};
