/**
 * Cliente de Supabase para el backend. Usa la secret/service key: salta RLS, por eso
 * este modulo SOLO se importa desde codigo servidor (API routes, funciones), nunca
 * desde codigo que corre en el navegador.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function requireEnv(...nombres: string[]): string {
  for (const nombre of nombres) {
    const valor = process.env[nombre];
    if (valor) return valor;
  }
  throw new Error(`Falta una de estas variables de entorno: ${nombres.join(", ")}`);
}

let cliente: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient {
  if (cliente) return cliente;
  const url = requireEnv("SUPABASE_URL");
  const secretKey = requireEnv("SUPABASE_SECRET_KEY", "SERVICE_ROLE_KEY");
  cliente = createClient(url, secretKey, { auth: { persistSession: false } });
  return cliente;
}
