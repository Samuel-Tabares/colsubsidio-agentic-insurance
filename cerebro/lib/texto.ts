/**
 * Markdown -> texto plano para las burbujas de chat.
 *
 * El system prompt ya prohíbe markdown explícitamente ("Nunca markdown: sin
 * negritas, sin listas numeradas, sin viñetas, texto plano"), y el modelo lo
 * usó igual: en el chat real salió `**Seguro de Vida**` y
 * `[aquí](https://...)` literales, con asteriscos y corchetes a la vista.
 * Mismo patrón que el gate de `recomendar_seguro`: una instrucción del prompt
 * no es un guardrail. Esto se aplica en la salida del servicio (ver
 * app/decidir/route.ts), sobre TODOS los mensajes, así ninguno se lo salta.
 *
 * Los enlaces no se descartan, se aplanan: en un chat una URL cruda es
 * clickeable y los corchetes de markdown no.
 */
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";

export function aTextoPlano(texto: string): string {
  return (
    texto
      // [texto](https://url) -> texto (https://url)
      .replace(/\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g, "$1 ($2)")
      // [texto](cualquier-otra-cosa) -> texto
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1") // **negrita**
      .replace(/__([^_]+)__/g, "$1") // __negrita__
      .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1$2") // *cursiva*
      .replace(/`([^`]+)`/g, "$1") // `código`
      .replace(/^#{1,6}\s+/gm, "") // ### encabezado
      .replace(/^[ \t]*[*•]\s+/gm, "") // viñetas
      .replace(/[ \t]{2,}/g, " ") // espacios dobles que deja el limpiado
      .replace(/\n{3,}/g, "\n\n") // saltos de más
      .trim()
  );
}

function demo(): void {
  // Caso real capturado del chat (captura de Jhon, 26-jul).
  const real =
    "1. **Seguro de Vida**: Este plan protege a tu familia en caso de fallecimiento. " +
    "Empieza desde **$12.000 al mes**. Puedes ver más detalles " +
    "[aquí](https://www.colsubsidio.com/seguros/familiares/vida).";
  const limpio = aTextoPlano(real);
  assert.ok(!limpio.includes("**"), `quedaron asteriscos: ${limpio}`);
  assert.ok(!limpio.includes("["), `quedaron corchetes: ${limpio}`);
  assert.ok(limpio.includes("Seguro de Vida"), "se perdió el nombre del producto");
  assert.ok(limpio.includes("$12.000 al mes"), "se perdió el precio");
  assert.ok(
    limpio.includes("https://www.colsubsidio.com/seguros/familiares/vida"),
    "se perdió el enlace"
  );
  assert.ok(limpio.includes("aquí ("), `el enlace no quedó aplanado: ${limpio}`);

  // La numeración se conserva a propósito: renderiza bien como texto y ayuda
  // cuando se listan varios productos. Lo que rompía eran los asteriscos y
  // los corchetes, no los números.
  assert.ok(limpio.startsWith("1. Seguro de Vida"), `se perdió la numeración: ${limpio}`);

  assert.equal(aTextoPlano("*cursiva* y `código`"), "cursiva y código");
  assert.equal(aTextoPlano("## Encabezado"), "Encabezado");
  assert.equal(aTextoPlano("* uno\n* dos"), "uno\ndos");
  assert.equal(aTextoPlano("[sin url](#)"), "sin url");
  // Texto que ya está limpio no se toca.
  const yaLimpio = "Hola, ¿en qué te puedo ayudar hoy?";
  assert.equal(aTextoPlano(yaLimpio), yaLimpio);

  console.log("demo OK - texto.ts: markdown aplanado, enlaces y numeración conservados");
}

if (pathToFileURL(process.argv[1] ?? "").href === import.meta.url) {
  demo();
}
