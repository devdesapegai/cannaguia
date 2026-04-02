import { Langfuse } from "langfuse";

const langfuseClient = new Langfuse();

export function getLangfuse() {
  return langfuseClient;
}
