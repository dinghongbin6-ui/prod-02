import test from "node:test";
import assert from "node:assert/strict";
import { getEmbedding } from "../embedding.js";

test("getEmbedding sends the configured model and returns the vector", async () => {
  const originalFetch = globalThis.fetch;
  const originalEndpoint = process.env.LMSTUDIO_embeddings_API;
  const originalKey = process.env.LMSTUDIO_KEY;
  let request;

  process.env.LMSTUDIO_embeddings_API = "http://embedding.test/v1/embeddings";
  delete process.env.LMSTUDIO_KEY;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ data: [{ embedding: [0.1, 0.2] }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  try {
    assert.deepEqual(await getEmbedding("sample"), [0.1, 0.2]);
    assert.equal(request.url, "http://embedding.test/v1/embeddings");
    assert.equal(JSON.parse(request.options.body).model, "text-embedding-nomic-embed-text-v1.5");
    assert.equal(request.options.headers.Authorization, undefined);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalEndpoint === undefined) delete process.env.LMSTUDIO_embeddings_API;
    else process.env.LMSTUDIO_embeddings_API = originalEndpoint;
    if (originalKey === undefined) delete process.env.LMSTUDIO_KEY;
    else process.env.LMSTUDIO_KEY = originalKey;
  }
});

test("getEmbedding reports a clear error when the endpoint is missing", async () => {
  const originalFetch = globalThis.fetch;
  const originalEndpoint = process.env.LMSTUDIO_embeddings_API;
  delete process.env.LMSTUDIO_embeddings_API;
  globalThis.fetch = async () => { throw new Error("fetch should not run"); };

  try {
    await assert.rejects(getEmbedding("sample"), /LMSTUDIO_embeddings_API is not configured/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalEndpoint !== undefined) process.env.LMSTUDIO_embeddings_API = originalEndpoint;
  }
});
