# Plan de construcción — fases, dueños y entregables

**Actualizado:** 2026-07-23, tras el cambio de base de la organización.
**Contexto del reto:** `BRIEF.md`. Si algo acá lo contradice, gana el brief.

Cada fase dice: qué se hace, quién lo hace, dónde queda la salida, de qué depende, y cuándo se
considera terminada. Si no se puede marcar el criterio de terminado, la fase sigue abierta.

**Tiempo real:** el domingo está prácticamente muerto. Quedan jueves, viernes y sábado. Unos 2,5
días. Por eso el orden importa más que la ambición.

---

## Mapa de dependencias

```
FASE 0 (desbloqueo)
   │
   ├──► FASE 1 (datos) ────────┐
   │                            ├──► FASE 3 (motor) ──► FASE 4 (vista cliente) ──► FASE 6
   └──► FASE 2 (catálogo) ─────┘                                │
                                                                 │
        FASE 5 (vista admin) ───────────────────────────────────┘
```

Las fases 1 y 2 corren **en paralelo** y no se bloquean entre sí. La 5 tampoco depende de las
demás: Vocero ya funciona, se puede adaptar desde el primer día.

---

## FASE 0 — Desbloqueo

**Dueño:** Jhon.
**Depende de:** nada. Es lo primero.
**Duración estimada:** una hora.

### 0.1 Pedir el diccionario de códigos a la organización

La base nueva trae cuatro columnas anonimizadas con letras griegas (`CATEGORIA`,
`SEGMENTO_GRUPO_FAMILIAR`, `SEGMENTO_POBLACIONAL`, `PIRAMIDE_NUEVA`). Sin diccionario no sabemos
qué significa `LAMBDA`.

Es un mensaje y cambia el alcance de toda la Fase 1. **Hacerlo antes que nada.**

Si no lo entregan, la Fase 1 sigue igual: se trabaja con los campos legibles y se caracterizan los
códigos por comportamiento observable. No bloquea, pero saberlo temprano ahorra trabajo.

### 0.2 Congelar los cuatro contratos entre componentes

Sin esto nadie puede trabajar en paralelo sin pisarse. Salen de las preguntas abiertas de
`EMULADOR_ARQUITECTURA.md`.

1. **Luis a Jhon (RAG).** Endpoint, formato de la consulta y forma de la respuesta. Con la
   arquitectura vigente, la consulta no es "dame seguros relevantes" sino "dame los productos de la
   familia X que apliquen a este perfil".
2. **Luis a Samuel (perfil).** Cómo se notifica un cambio en `perfil_crudo`. Un `PATCH` HTTP alcanza.
3. **El motor.** Dónde vive `recomendar(perfil)`, qué recibe y qué devuelve. Ver Fase 3.
4. **`estado_crm.fase`.** Quién la mueve y en qué evento conversacional.

**Terminada cuando:** los cuatro contratos están escritos en el repo y los cuatro los leyeron.

---

## FASE 1 — Datos y reglas de propensión

**Dueño:** Luis. Samuel apoya con la tubería de ETL, que ya existe.
**Depende de:** Fase 0.2. Idealmente también de 0.1, pero no bloquea.
**Instrucciones completas:** `ANALISIS-PROPENSION.md`. Guía técnica de DuckDB en
`GUIA-ANALISIS-DATOS.md`.

### Pasos

1. **Reapuntar el ETL al archivo nuevo.** La tubería de Samuel sirve tal cual. Cambian el tamaño
   (500K en vez de 1,56M) y las columnas: se fueron `NOMBRE_COMPLETO` y `ESTADOAFILIADO`, entró
   `RANGO_SALARIAL`. **Los resultados del análisis anterior no se heredan.**
2. **Perfilar.** Vocabulario exacto de cada columna con conteos, porcentaje de nulos y de vacíos
   (`''` no es `NULL`), y confirmar que la base no viene filtrada.
3. **Caracterizar los códigos griegos por comportamiento observable.** Para cada código: reparto de
   edad, de rango salarial, de género, y tasa de cada marca de consumo. Es lo que convierte cuatro
   columnas inútiles en cuatro columnas usables **sin inventar qué significan**.
4. **Cruces.** Cada marca de consumo contra edad, rango salarial y cada código. Al cruzar, excluir
   por par las filas sin alguno de los dos campos.
5. **Volver a medir si el consumo es señal independiente del perfil.** En la base anterior lo era, y
   de eso depende si las reglas suman o se pisan.
6. **Medir el solape entre `PIRAMIDE_NUEVA` y `EMPRESA_FOCO`.** Antes eran casi la misma cosa. Si se
   repite, usar solo una: contar la misma evidencia dos veces infla el score.
7. **Escribir las reglas.** Explícitas, con su justificación y su respaldo numérico.

### Salida

- **`lib/reglas.json`** — el artefacto que consume el motor. Contrato completo en
  `ANALISIS-PROPENSION.md` sección 6. Campos obligatorios por regla: `razon_dato`, `respaldo`, y
  `codigo_opaco` cuando se apoya en una columna anonimizada.
- **`docs/LOGICA-RECOMENDACION.md`** — entregable **no negociable** del brief. Se escribe mientras
  se analiza, no al final.

### Terminada cuando

- Para cualquier perfil de prueba se puede señalar la regla exacta que produjo la recomendación.
- Toda regla con `codigo_opaco` trae una métrica de comportamiento, no solo el tamaño del segmento.
- Ninguna frase en el artefacto traduce una letra griega a una etiqueta.
- Las reglas corren contra un perfil con la mitad de los campos vacíos sin romperse.

---

## FASE 2 — Catálogo de seguros y RAG

**Dueño:** Jhon.
**Depende de:** nada. Puede arrancar ya.
**Spec:** `SPEC-SCRAPE-CATALOGO.md`.

Es el **camino crítico**: sin catálogo no hay nada que recomendar, por bien perfilada que esté la
base. La Fase 3 y la Fase 4 lo necesitan.

### Pasos

1. **Scrape** de la oferta pública de Colsubsidio, 22 URLs priorizadas por señal.
2. **Estructurar** a `catalogo.json`. Campos mínimos por producto: `id`, `familia`, `aseguradora`,
   `nombre`, `coberturas`, `exclusiones`, `prima` o su rango, `condiciones`.
   El campo `aseguradora` no es opcional: comparar entre aseguradoras es requisito del brief.
3. **Indexar** para búsqueda semántica. Vector store sobre el Postgres que ya existe (pgvector), o
   Pinecone si ya está andando. Una cuenta menos es una cosa menos que falla en vivo.

### Salida

- **`lib/catalogo.json`** — productos con coberturas, exclusiones y condiciones.
- **Índice consultable** por familia y por perfil.

### Terminada cuando

- Cada familia de seguro de las reglas de la Fase 1 tiene al menos un producto asociado.
- Toda prima o rango que aparezca sale del catálogo. Si el catálogo público no trae primas, se
  sintetizan rangos coherentes por edad y **se declaran como ilustrativos en pantalla**.
- Una consulta por familia devuelve productos de esa familia, con sus exclusiones incluidas.

---

## FASE 3 — El motor de recomendación

**Dueño:** Jhon las reglas de negocio, Luis la integración.
**Depende de:** Fases 1 y 2.

### La regla de arquitectura que sostiene todo

- **Las reglas explícitas deciden la FAMILIA** y producen la justificación.
- **El RAG recupera el PRODUCTO concreto** dentro de esa familia.
- **El LLM conversa y narra.** No decide familia, ni producto, ni prima.

Si la búsqueda semántica ordena por relevancia y eso define la recomendación, la respuesta al
jurado es "porque el vector quedó cerca", que es la caja negra que el brief descalifica.

### Qué se construye

`recomendar(perfil)`, función pura que lee `reglas.json` y `catalogo.json` y devuelve:

```
{
  familia, producto_id, aseguradora, prima,
  razon: { dato, conversacion, respaldo },
  coberturas, exclusiones, alternativas
}
```

Sin servicio aparte, sin llamada de red, sin punto de falla en vivo. Y las reglas quedan legibles
en el diff de Git, que es literalmente lo que el brief exige.

### Terminada cuando

- Dos perfiles que difieren en una sola variable devuelven resultados visiblemente distintos.
- Pedirle un producto que no está en el catálogo devuelve "no lo tengo", nunca uno inventado.
- La `razon` viene con sus dos patas pobladas: el criterio de la regla y lo que la persona contó.

---

## FASE 4 — Vista cliente

**Dueño:** Sarah diseña, Luis cablea.
**Depende de:** Fase 3 para los datos reales. El diseño puede arrancar antes con datos falsos.
**Especificación:** `UX.md`.

**Es la fase que decide el reto.** El criterio 5 del brief dice que el jurado recorre el flujo solo,
sin que nadie del equipo le explique nada. Es el único criterio que no se puede compensar.

### Qué se construye

- Chat estilo WhatsApp, arranque en frío.
- Discovery con las 5 preguntas de `CAPA-CUALITATIVA.md`. Una pregunta por turno, nunca dos.
- Recomendación con la razón compuesta visible en pantalla.
- Tarjeta de comparación, dos o tres opciones, con las aseguradoras.
- Control de ajuste de cobertura con recálculo en vivo.
- Exclusiones desplegadas antes de que la persona las pida.
- Cierre: aceptación, confirmación, resumen, y aviso de que un asesor retoma para finalizar.
- El momento de gemelos: el jurado cambia una variable y ve recalcularse todo.

**Regla que ordena el diseño:** lo que va dentro del chat tiene que ser algo que WhatsApp también
podría mostrar. Lo que solo funciona en web va fuera del chat y tiene que ser prescindible.

### Terminada cuando

**Alguien ajeno al equipo abre la URL, la recorre sin explicación y llega al resumen final.**
Se prueba apenas haya algo navegable, no el último día. Si necesita ayuda para avanzar, todo lo
demás se detiene hasta arreglarlo.

---

## FASE 5 — Vista administrativa

**Dueño:** Samuel.
**Depende de:** nada para arrancar. Vocero ya funciona.
**Base:** Vocero CRM (MIT, Next.js 15 + Drizzle + Postgres).

No aparece en ninguno de los 6 criterios del brief, así que **nunca le quita tiempo a la Fase 4.**
Pero cuesta poco porque ya está construido, y demuestra el modelo operativo completo.

### Qué se adapta

- **Bandeja de conversaciones**, ya viene hecha.
- **Toggle para apagar el agente y que un humano retome.** Es la contraparte del cierre de la Fase
  4: el agente escala y en la bandeja se ve al humano recibiendo el caso. Vale más que cualquier
  otra pantalla administrativa.
- **CRM por fases** con el seguro comprado, cruzado contra los datos reales del afiliado.
- Marca Colsubsidio.

### Decisión de despliegue pendiente

Vercel apuntando a Supabase como Postgres, o VPS con Docker como Vocero trae de fábrica.
**A verificar:** que la bandeja en tiempo real, que usa SSE, aguante los límites de duración de
función en Vercel. Si no aguanta, se degrada a polling.

### No se construye

Envíos masivos. Vocero no los incluye por diseño, Meta exige plantilla aprobada y opt-in previo, y
la base no trae teléfono ni correo.

---

## FASE 6 — Entregables

**Dueño:** todos, coordina Jhon.
**Depende de:** las anteriores.

1. **README que levanta el proyecto en menos de 2 minutos.** Requisito explícito del brief.
   Se prueba con clone limpio y cronómetro, no a ojo.
2. **`docs/LOGICA-RECOMENDACION.md`**, que sale de la Fase 1.
3. **`docs/ARQUITECTURA.md`, `docs/FLUJO.md`, `docs/LIMITACIONES.md`.** Diagramas en Mermaid dentro
   de los `.md`, que se ven en GitHub y se diffean.
   En limitaciones va lo que el brief excluyó y lo que WhatsApp no permite. Ser explícito ahí suma
   credibilidad, no la resta.
4. **URL desplegada.**
5. **Pitch de 2 minutos y video.**

---

## Si sobra tiempo, en este orden

1. **Pantalla de "a quién le hablaríamos hoy":** segmentos priorizados con su tamaño real, el
   disparador y el canal sugerido. Es el bonus de timing y canal que el brief premia
   explícitamente, y sale casi gratis del análisis de la Fase 1.
2. **Laboratorio de agente**, idea tomada de Vocero: clientes simulados conversando contra nuestro
   agente, con un juez que puntúa. Es evidencia de calidad que se le puede mostrar al jurado.

---

## Lo que no se construye, pase lo que pase

- Integración con aseguradoras, firma electrónica, pasarela de pago, siniestros, renovaciones.
  **Los excluye el propio brief.**
- Voz, telefonía, WhatsApp real. Ruta declarada en el README, no se construye.
- Modelo de machine learning decidiendo en runtime. No hay variable objetivo, y las reglas
  explícitas ganan en explicabilidad, que es justo lo que califican.
- Login, cuentas de usuario, multi-idioma.
- Campañas de envío masivo.
- Cotizador actuarial real.
