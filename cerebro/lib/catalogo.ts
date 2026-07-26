/** Búsqueda semántica del catálogo real. Embebe la consulta con OpenAI y llama al
 * RPC match_catalogo, ya filtrado por la familia que decidió recomendar(). */
import { getSupabaseServerClient } from "./supabaseClient.ts";

export interface PlanCatalogo {
  nombre_plan: string;
  aseguradora: string;
  precio_mensual_desde: number | null;
  coberturas: string[];
}

export interface ProductoCatalogo {
  id: string;
  familia: string;
  aseguradora: string;
  nombre_producto: string;
  url: string;
  planes: PlanCatalogo[];
  page_content: string;
  similarity: number;
}

async function embed(texto: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Falta OPENAI_API_KEY");
  const resp = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "text-embedding-3-small", input: texto }),
  });
  if (!resp.ok) throw new Error(`OpenAI embeddings falló: ${resp.status} ${await resp.text()}`);
  const json = (await resp.json()) as { data: { embedding: number[] }[] };
  return json.data[0].embedding;
}

export async function matchCatalogo(
  query: string,
  familiaFilter: string | null = null,
  matchCount = 3
): Promise<ProductoCatalogo[]> {
  const supabase = getSupabaseServerClient();
  const embedding = await embed(query);
  const { data, error } = await supabase.rpc("match_catalogo", {
    query_embedding: embedding,
    familia_filter: familiaFilter,
    match_count: matchCount,
  });
  if (error) throw error;
  return (data ?? []) as ProductoCatalogo[];
}
