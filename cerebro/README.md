# cerebro

Servicio HTTP que implementa el lado "cerebro" del contrato ya cableado en
`app/src/lib/cerebro/` (Vocero): un solo endpoint, `POST /decidir` (sin
prefijo `/api` — Vocero llama literal `{CEREBRO_URL}/decidir`, ver
`app/src/lib/cerebro/index.ts`), que recibe `CerebroRequest` y devuelve
`CerebroResponse`.

Deploy manual a Vercel, ver **[DEPLOY-VERCEL.md](./DEPLOY-VERCEL.md)**.

## Para activarlo en Vocero

Una vez desplegado, en el entorno donde corre `app/` (Coolify/compose, no
Vercel):

```
CEREBRO_MODE=external
CEREBRO_URL=<URL de producción real que asigne Vercel, ver DEPLOY-VERCEL.md>
```

## Qué hace

1. Resuelve la identidad del afiliado escaneando el `historial` que Vocero
   manda en cada turno (busca un mensaje que sea solo dígitos y matchee una
   `serie` real en la tabla `afiliados` de Supabase — "como pedir la cédula").
   Sin tabla nueva: Vocero ya reenvía el historial completo cada turno.
2. Arma el prompt (`lib/systemPrompt.ts`, sección 1 de `SYSTEM-PROMPT.md`
   pegada literal + el bloque de identidad conversacional que ese documento
   no cubría) con el perfil ya resuelto y el historial.
3. Llama al LLM (OpenAI, tool-calling real) con dos tools:
   - `recomendar_seguro` — motor de reglas puro (`lib/recomendar.ts` +
     `reglas.json`), decide la familia de seguro.
   - `buscar_producto` — RAG sobre el catálogo real (`lib/catalogo.ts`,
     `match_catalogo` en Supabase/pgvector).
   El modelo decide cuándo llamarlas, nunca decide la familia por su cuenta.
4. Devuelve `{ mensajes: [{ tipo: "text", texto }] }`. Tarjetas
   (`recomendacion`/`comparacion`/`control_cobertura`) y `fase`/`tags`/
   `ranking` quedan fuera de este MVP — son opcionales en el contrato.

## Desarrollo local

```bash
npm install
cp .env.local.example .env.local   # completar con las 3 keys reales
npm run check:recomendar           # motor de reglas, sin red
npm run check:identidad            # requiere Supabase
npm run check:agente               # requiere Supabase + OpenAI (llama al LLM real)
npm run dev                        # next dev, prueba POST /decidir en localhost
```

## Variables de entorno

| Variable | Para qué |
|---|---|
| `SUPABASE_URL` | Proyecto Supabase (`afiliados`, `catalogo`) |
| `SUPABASE_SECRET_KEY` | Service key, salta RLS. Nunca al navegador. |
| `OPENAI_API_KEY` | Embeddings de `match_catalogo` + chat del agente |
| `CEREBRO_MODEL` | Opcional, default `gpt-4o-mini` |

Se cargan en el dashboard de Vercel al conectar el proyecto, ver
[DEPLOY-VERCEL.md](./DEPLOY-VERCEL.md).

## Fuera de alcance (a propósito)

- Tarjetas interactivas, `tags`/`ranking`/`fase` del contrato.
- Autenticación entre Vocero y este servicio (ambos privados en la demo).
- Log de conversación a la tabla `conversaciones` — Vocero ya es la fuente
  de verdad del historial.
