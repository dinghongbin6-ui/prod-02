import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(projectRoot, ".env") });

export async function getEmbedding(text) {
  const endpoint = process.env.LMSTUDIO_embeddings_API;
  if (!endpoint) throw new Error("LMSTUDIO_embeddings_API is not configured");

  const headers = { "Content-Type": "application/json" };
  if (process.env.LMSTUDIO_KEY) {
    headers.Authorization = `Bearer ${process.env.LMSTUDIO_KEY}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "text-embedding-nomic-embed-text-v1.5",
        input: text
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorText = (await response.text()).slice(0, 1000);
      throw new Error(`Embedding HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const embedding = data?.data?.[0]?.embedding;
    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error("Embedding API returned no embedding vector");
    }
    return embedding;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("Embedding API request timed out");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
