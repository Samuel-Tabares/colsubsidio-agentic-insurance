# cerebro

Servicio HTTP que implementa el lado "cerebro" del contrato ya cableado en
`app/src/lib/cerebro/` (Vocero): un solo endpoint, `POST /decidir` (sin
prefijo `/api` — Vocero llama literal `{CEREBRO_URL}/decidir`, ver
`app/src/lib/cerebro/index.ts`), que recibe `CerebroRequest` y devuelve
`CerebroResponse`.

Corre en **Railway**, proyecto `colsubsidio-asegura`, servicio `cerebro` (raíz
`cerebro/`), y redespliega solo con cada push a `main`. Ver la sección
*Despliegue* del [README general](../README.md). El
[DEPLOY-VERCEL.md](./DEPLOY-VERCEL.md) describe un montaje anterior que ya no
se usa.

## Para activarlo en Vocero

En el entorno donde corre `app/`:

```
CEREBRO_MODE=external
CEREBRO_URL=http://cerebro.railway.internal:3000   # red privada de Railway
```

Fuera de Railway, apunta `CEREBRO_URL` a la URL pública donde lo hayas
desplegado.

## Qué hace

1. Resuelve la identidad del afiliado escaneando el `historial` que Vocero
   manda en cada turno (busca un mensaje que sea solo dígitos y matchee una
   `serie` real en la tabla `afiliados` de Supabase — "como pedir la cédula").
   Sin tabla nueva: Vocero ya reenvía el historial completo cada turno.
2. Arma el prompt (`lib/systemPrompt.ts`, sección 1 de `SYSTEM-PROMPT.md`
   pegada literal + el bloque de identidad conversacional que ese documento
   no cubría) con el perfil ya resuelto y el historial. Se le suman dos bloques
   de runtime (`lib/agente.ts`, no van en el .md porque dependen del turno): la
   **fase actual** del funnel con qué se espera del agente ahí, y **lo que la
   persona ya contó**, para que no lo repregunte.
3. Llama al LLM (OpenAI, tool-calling real) con dos tools:
   - `recomendar_seguro` — motor de reglas puro (`lib/recomendar.ts` +
     `reglas.json`), decide la familia de seguro.
   - `buscar_producto` — RAG sobre el catálogo real (`lib/catalogo.ts`,
     `match_catalogo` en Supabase/pgvector).
   El modelo decide cuándo llamarlas, nunca decide la familia por su cuenta.
4. Segunda pasada de solo lectura (`lib/estado.ts`, salida estructurada, modelo
   barato): clasifica en qué **fase del funnel** quedó la conversación y extrae
   los **hechos** que la persona contó en vivo (mascota, dependientes, trabajo).
   Va aparte del agente a propósito: la primera ronda del agente lleva
   `tool_choice` forzado a `recomendar_seguro` (gate de gobernanza), así que una
   tercera tool para clasificar pelearía con ese gate. Si falla, el turno sigue
   sin fase ni hechos nuevos — nunca tumba la respuesta.
5. Devuelve `{ mensajes, fase, perfil.hechos, tags, analisis, ranking }`. Las
   tarjetas (`recomendacion`/`comparacion`/`control_cobertura`) siguen fuera de
   este MVP — son opcionales en el contrato.

### Las fases del CRM

El agente maneja 5 de las 7 etapas del funnel: **Prospecto → Análisis →
Cotización / negociación → Cierre ganado**, más **Cierre perdido** desde
cualquier punto. *En suscripción* y *Póliza emitida* son trabajo humano y el
agente no las toca.

La fase la decide `lib/estado.ts` leyendo la conversación (es lo único que sabe
si la persona aceptó o se fue). Las tools solo ponen un **piso**: si en el turno
se mostraron productos, ya está al menos en negociación. Se toma la más
avanzada de las dos. Del lado del canal, `puedeMoverAgente`
(`app/src/lib/funnel.ts`) hace cumplir que el movimiento sea válido: nunca hacia
atrás, nunca a una etapa manual, y nunca saca un lead que una persona ya movió
a mano.

## Desarrollo local

```bash
npm install
cp .env.local.example .env.local   # completar con las 3 keys reales
npm run check:recomendar           # motor de reglas, sin red
npm run check:identidad            # requiere Supabase
npm run check:agente               # requiere Supabase + OpenAI (llama al LLM real)
npm run check:estado               # fases + hechos; sin OPENAI_API_KEY corre solo la parte offline
npm run dev                        # next dev, prueba POST /decidir en localhost
```

## Variables de entorno

| Variable | Para qué |
|---|---|
| `SUPABASE_URL` | Proyecto Supabase (`afiliados`, `catalogo`) |
| `SUPABASE_SECRET_KEY` | Service key, salta RLS. Nunca al navegador. |
| `OPENAI_API_KEY` | Embeddings de `match_catalogo` + chat del agente |
| `CEREBRO_MODEL` | Opcional, default `gpt-4o-mini` |
| `CEREBRO_MODEL_LECTURA` | Opcional, default `gpt-4o-mini`. Modelo de la pasada de fases/hechos (`lib/estado.ts`) |

Se cargan en el dashboard de Vercel al conectar el proyecto, ver
[DEPLOY-VERCEL.md](./DEPLOY-VERCEL.md).

## Fuera de alcance (a propósito)

- Tarjetas interactivas (`recomendacion`/`comparacion`/`control_cobertura`).
- Autenticación entre Vocero y este servicio (ambos privados en la demo).
- Log de conversación a la tabla `conversaciones` — Vocero ya es la fuente
  de verdad del historial.
