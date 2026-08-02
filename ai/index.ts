import { createGroq } from "@ai-sdk/groq";
import { experimental_wrapLanguageModel as wrapLanguageModel } from "ai";

import { customMiddleware } from "./custom-middleware";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

// llama-3.3-70b-versatile: best quality on Groq
export const geminiProModel = wrapLanguageModel({
  model: groq("llama-3.3-70b-versatile"),
  middleware: customMiddleware,
});

// llama-3.1-8b-instant: faster/lighter for simple tasks
export const geminiFlashModel = wrapLanguageModel({
  model: groq("llama-3.1-8b-instant"),
  middleware: customMiddleware,
});
