/** Lectura del afiliado por `serie` (columna real, PK de la tabla). El demo resuelve
 * identidad de forma conversacional (ver identidad.ts) y no por token/URL, así que
 * getAfiliadoBySerie es la vía real de este servicio. */
import { getSupabaseServerClient } from "./supabaseClient.ts";

export interface AfiliadoRaw {
  serie: number;
  genero: string | null;
  rango_edad: string | null;
  rango_salarial: string | null;
  ciudad_afiliado: string | null;
  empresa_foco: string | null;
  segmento_grupo_familiar: string | null;
  segmento_poblacional: string | null;
  piramide_empresa: string | null;
  drogueria: boolean;
  vivienda: boolean;
  agencias: boolean;
  hoteles: boolean;
  piscilago: boolean;
}

export async function getAfiliadoBySerie(serie: number): Promise<AfiliadoRaw | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("afiliados")
    .select("*")
    .eq("serie", serie)
    .maybeSingle();
  if (error) throw error;
  return (data as AfiliadoRaw) ?? null;
}
