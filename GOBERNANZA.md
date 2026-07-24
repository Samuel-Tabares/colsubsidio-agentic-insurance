# Gobernanza de datos e IA — MVP Reto 2

**Para:** el equipo (Luis, Samuel, Sarah) y el jurado.
**Por qué existe:** los "4 pilares de gobernanza de datos" y las "5 preguntas éticas" de 30X son la
rúbrica con la que el jurado califica. Este doc responde cada una para nuestro MVP, y deja cableado
lo que falta construir. No es adorno: es puntaje.

---

## Principio rector: System 2 by design

30X citó a Kahneman. System 1 es la IA rápida e intuitiva que aprueba su propia respuesta sin
cuestionarla (el peligro: alucina coberturas y precios). System 2 es la IA lenta y deliberada que
verifica fuentes, evalúa la lógica y se defiende de sus propios sesgos.

Nuestro agente es System 2 por construcción, no por un parche encima:

- **Verifica fuentes:** las coberturas, exclusiones y precios se leen del catálogo (RAG). El LLM
  nunca los inventa.
- **Evalúa la lógica:** la familia de seguro la deciden reglas explícitas (`reglas.json`), no la
  intuición del modelo.
- **Se defiende de alucinar:** si le piden un producto que no existe, responde "no lo tengo", no uno
  inventado.

Ese diseño es, además, la respuesta al gate de explicabilidad del brief.

---

## Los 4 pilares de gobernanza de datos (rúbrica 30X)

**1. Origen y consentimiento.** ¿De dónde viene el dato y hay permiso para usarlo?
- La base viene de Colsubsidio, anonimizada en la fuente.
- Los datos simulados que agregamos están **autorizados por escrito por 30X + Colsubsidio**
  (2026-07-24) para la demo. El mapeo real solo se pide si pasamos a producción.
- El catálogo sale de la web pública de Colsubsidio.

**2. Calidad y trazabilidad.** ¿Puedes rastrear una respuesta hasta el dato que la originó?
- Cada recomendación se rastrea a una regla concreta de `reglas.json` (con su `razon_dato` y su
  `respaldo` numérico) más un producto del catálogo.
- La razón que ve el usuario tiene dos patas: "por tu perfil" (el dato) y "por lo que me contaste"
  (la conversación). Nada es "porque el modelo lo dijo".

**3. Privacidad y minimización.** ¿Usas solo el dato estrictamente necesario?
- La base está anonimizada (códigos, sin nombres ni PII).
- Solo se guarda lo necesario para recomendar. Los datos de salud son dato sensible bajo la Ley 1581
  de 2012, y se tratan como tal.
- Los valores simulados se marcan como simulados; nunca se afirma el mapeo real como hecho.

**4. Seguridad y acceso.** ¿Quién en el equipo puede ver, editar o exportar los datos sensibles?
- RLS (Row Level Security) en Supabase: cada usuario ve solo su fila.
- Llaves de mínimo privilegio: el frontend usa la llave pública (limitada por RLS); la service key
  (que salta RLS) vive solo en el backend, nunca en el navegador.
- Cifrado en tránsito (TLS) y en reposo, por defecto en Supabase.
- Dos tablas separadas por sensibilidad: el catálogo es público de lectura; la tabla de clientes es
  de acceso restringido.

---

## Marcos de IA que citamos en el pitch

- **OCDE:** principios de IA (transparencia, robustez, rendición de cuentas). Nuestro "por qué"
  trazable es rendición de cuentas.
- **UNESCO (Ética de la IA, 2021):** dignidad, proporcionalidad y supervisión humana. El toggle
  humano (abajo) es supervisión humana.
- **NIST AI RMF:** mapear, medir, gestionar y gobernar el riesgo. El registro de riesgos de abajo es
  ese ejercicio.
- **Colombia, MinTIC / CONPES IA:** lineamientos nacionales de ética e IA para el sector productivo.

---

## Las 5 preguntas éticas (validación 30X), respondidas

**1. Trazabilidad. ¿Puedes explicar qué generó el LLM y por qué?**
Sí. Regla citable + producto del catálogo + razón de dos patas. El LLM narra, no decide.

**2. Verificación técnica. ¿Revisaste el código por vulnerabilidades o dependencias inseguras?**
Sí. RLS activo, secretos fuera del frontend, dependencias mínimas, y un protocolo de QA antes de
desplegar código.

**3. Consentimiento y licencias. ¿Los datos y el código respetan derechos y privacidad?**
Sí. Datos simulados autorizados, catálogo público de Colsubsidio, base sin PII.

**4. Transparencia. ¿El usuario final sabe que interactúa con IA?**
Sí. El asistente se presenta como asistente. No se hace pasar por humano.

**5. Reversibilidad. ¿Puede un humano deshacer o corregir una decisión automatizada?**
Sí. El toggle de agente a humano (Fase 5) permite que una persona retome. Y el MVP no emite pólizas
ni cobra, así que ninguna decisión es irreversible: el agente escala, no cierra en firme.

---

## Identidad y sesión (sin login)

El brief excluye login. La sesión se mantiene por un `id` (UUID) por usuario:

- El `id` se guarda en el navegador (localStorage) y viaja en la URL del handoff WhatsApp a web.
- Al volver, se lee el `id`, se recupera el perfil desde Supabase, y el contexto se restaura. No se
  pierde la conversación si guardamos su estado en la fila.
- Acceso seguro sin `auth.uid()`: la tabla de clientes no es legible con la llave pública; los
  accesos pasan por un backend con la service key que filtra por `id`, y el `id` es un UUID no
  adivinable.
- Se pierde el contexto solo si se borra el localStorage o se entra desde otro dispositivo sin el
  link. Ahí se re-entra.

Esto es territorio de Samuel (tabla de clientes y backend); la propuesta lo deja cableado.

---

## Qué puede fallar (registro de riesgos)

- **Service key filtrada al frontend:** compromiso total de la base. Mitigación: la service key nunca
  sale del backend; el frontend solo usa la llave pública con RLS.
- **`id` robado o adivinado:** ver la sesión de otro. Mitigación: UUID no adivinable + acceso
  mediado por backend, no lectura directa desde el cliente.
- **RLS mal configurado:** fuga de datos. Mitigación: deny por defecto (RLS activo sin policy de
  escritura) y probar cada policy antes de confiar.
- **El LLM alucina coberturas o precios:** System 2 lo previene (RAG + "no lo tengo"), pero se vigila
  en pruebas.
- **Límites del plan free de Supabase:** conexiones y streaming limitados. Mitigación: si el SSE de
  la bandeja no aguanta, se degrada a polling.
- **Dimensión de embedding equivocada:** la ingesta falla temprano con un assert de 1536, no en
  silencio.
- **`id` perdido (localStorage borrado u otro dispositivo):** se pierde el contexto. Se re-entra;
  documentado como limitación conocida, no como bug.

---

## Qué queda por construir (para el equipo)

- La tabla de clientes con RLS y el backend que filtra por `id` (Samuel).
- El manejo del `id` en localStorage + URL para el handoff (Samuel).
- La declaración de "hablas con un asistente" visible en la interfaz (Sarah / Samuel).
- El toggle humano de la Fase 5 (Samuel).
