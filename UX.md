# UX — La pantalla del usuario (emulador WhatsApp + website)

Para Sarah. Qué tiene que lograr la interfaz que ve la persona que va a comprar un seguro.
No dice cómo se ve, dice qué tiene que pasarle a quien la usa. El cómo es tuyo.

> ⚠️ **Nota del 23 de julio — resultado de la revisión conjunta (Sarah + Claude) de la versión que
> mandó el equipo.** Cuatro cambios reales sobre esa versión, resto queda igual:
> 1. **La web es rica, no paridad con WhatsApp.** El equipo propuso que para el MVP la web hiciera
>    lo mismo que WhatsApp (mismas tarjetas, solo skin distinto). Decisión: se mantiene la versión
>    del journey — la web tiene el simulador/comparador hiperpersonalizado completo, sin las
>    restricciones de WhatsApp. Ver sección 3.
> 2. **La persona por defecto vuelve a marcarse como hipótesis, no hecho.** La base cambió de 1,56M
>    a 500K filas y la columna que definía "sin grupo familiar" ahora viene anonimizada. Ver
>    sección 2.
> 3. **Los colores de la sección 9 estaban desactualizados** — usaban la reconstrucción no oficial
>    vieja en vez del material oficial real que ya tenemos.
> 4. **Las fases del CRM (sección 0.3) están pendientes de confirmar con Samuel** y todavía no
>    están escritas en `sql/schema.sql`. Falta esa conversación corta antes de comprometerlas.

---

## 0. Los dos puentes y el panel de administración

Dos canales por donde el cliente ve y usa esto — mismo backend, mismo perfil, misma lógica de
recomendación, distinta piel:

### 0.1 Website

Sección propia dentro de la página oficial de Colsubsidio (apartado de seguros), **no un botón
flotante**. Diseño y UX propios de Colsubsidio — colores, tipografía, layout — no una copia de
WhatsApp. Flujo cliente → bot, pero el sistema puede traer contexto de otro canal si el cliente
llega desde WhatsApp (nada se repite).

Acá vive la experiencia completa: los tres tipos de tarjeta (sección 6) más el simulador/comparador
hiperpersonalizado del journey — libre de las restricciones de tarjetas nativas de WhatsApp.

### 0.2 WhatsApp (simulador)

Réplica visual de WhatsApp lo más fiel posible — mismo estilo gráfico, porque es por donde el
cliente se contactaría en la vida real. A diferencia de la web, es **bidireccional y proactivo**:
el bot puede iniciar contacto (plantilla personalizada) y el cliente puede escribir primero.

El objetivo principal siempre es llevar al cliente a la web con todo el contexto ya recopilado,
pero **el proceso completo se puede cerrar sin salir de WhatsApp** — solo que en la web es más
fácil para todos. Restringido a las herramientas reales de WhatsApp: botones, listas, imágenes,
links. Nada que dependa de un componente web.

### 0.3 Dashboard admin

Dos secciones:

**CRM.** Todos los clientes del CSV/XLSX inyectado con su información cruda; los que ya tienen
análisis de IA (resumen de hacia dónde puede ir el cliente); y la vista completa por cliente con su
análisis, sus datos y su fase. Fases propuestas:

`Prospecto` (datos crudos) → `Análisis` (analizado según datos crudos) →
`Cotización / negociación` (conversando para encontrar su mejor seguro) →
`Cierre ganado` (adquiere el seguro) / `Cierre perdido` (rechaza la oferta) →
`En suscripción` (la aseguradora evalúa el riesgo antes de emitir — manual) →
`Póliza emitida` (pago inicial registrado — manual)

Con bandera de **follow-manual** cuando el sistema no alcanza a resolver el proceso completo, pero
sí más del 70%.

> ⚠️ **Pendiente:** esta secuencia de fases todavía no está confirmada con Samuel ni escrita en
> `sql/schema.sql`. Es más realista al negocio de seguros porque incluye los pasos reales post-venta
> (suscripción, emisión). Resolver con una conversación corta antes de comprometerla en el schema.

**Registros.** Todo lo que dijo el cliente y todo lo que dijo el bot, sin importar el canal de
origen (WhatsApp, web, y a futuro llamadas transcritas con IA) — simple, tipo app de mensajes, con
la información cruda del cliente, su análisis, y el contexto adicional a la mano.

---

## 1. La única prueba que importa

> "El flujo completo se puede recorrer de inicio a fin sin que el equipo lo explique al jurado."

**Un jurado va a abrir la pantalla y a usarla solo, sin que nadie le diga nada.** Si en algún punto
se queda mirando sin saber qué hacer, ese criterio se pierde y no hay forma de compensarlo después.

Esto convierte tu trabajo en el que decide el resultado del reto. Cuando haya que elegir entre algo
bonito y algo obvio, gana lo obvio.

La segunda prueba, en palabras del propio brief: **"¿yo usaría esto para comprar un seguro real?"**

---

## 2. Quién es la persona

> ⚠️ La base cambió el 23 de julio: de 1,56M a 500K filas, y la columna que definía "sin grupo
> familiar" (`SEGMENTO_GRUPO_FAMILIAR`) ahora viene anonimizada con códigos griegos — ya no se
> puede leer del dato quién es soltero sin hijos, hay que preguntarlo en la conversación (pregunta 1
> del discovery en `CAPA-CUALITATIVA.md`). El perfil de abajo sigue siendo la mejor hipótesis para
> diseñar, pero es hipótesis, no un hecho medido en la base actual.

Del análisis de la base anterior (1,56M), el segmento más grande era **"20 a 35 años, sin grupo
familiar", alrededor de un tercio de la base.** Coincide con el ejemplo que el brief usa para
explicar el reto, el de "soltero sin hijos". Esa es la persona por defecto mientras no se reconfirme
con la base nueva.

**Qué sabe de seguros:** casi nada. No sabe si necesita vida, salud o accidentes. No sabe qué es un
deducible ni le importa — solo quiere encontrar lo que más le convenga.

**Por qué nunca ha comprado:** no sabe por dónde empezar y asume que va a terminar hablando con un
vendedor que le va a insistir.

**Qué teme al usar esto:** que le vendan algo que no necesita, que después le digan que eso no
estaba cubierto.

**No está comprando una camiseta.** Está decidiendo proteger algo. Eso no significa que la interfaz
deba ser solemne, significa que no puede sentirse como un formulario ni como una tienda.

---

## 3. Cómo está armada la pantalla — dos puentes, una lógica

Un **chat que ocupa el centro**, con estructura de WhatsApp: burbujas, hilo que baja, escritura
natural. La conversación es el producto, no un accesorio. Eso es igual en los dos puentes.

Lo que cambia es cuánto se puede hacer dentro de ese chat:

- **Puente WhatsApp:** restringido a las herramientas reales que WhatsApp permite — botones,
  listas, imágenes, links, tarjetas simples. Si algo no se puede mostrar así de verdad, no va acá.
- **Puente web:** libre. Mismo diseño de partida (chat central, estilo WhatsApp) pero con el design
  system de Colsubsidio, y sin el techo de WhatsApp — ahí vive el simulador/comparador
  hiperpersonalizado, con más margen de interacción en comparación y ajuste de cobertura.

Dentro del chat, el agente puede mandar **tarjetas interactivas**: bloques que se tocan, no solo
texto. Ahí viven la comparación, el ajuste de cobertura y las exclusiones (sección 6) — en los dos
puentes, aunque en la web pueden ser más ricas.

**La regla que se mantiene:** la base de las tres tarjetas (sección 6) tiene que existir en su
versión simple en WhatsApp también, para que el mismo agente sirva en los dos canales sin que uno
se quede corto. Lo que la web agrega por encima de esa base no tiene que replicarse en WhatsApp.

---

## 4. El recorrido, momento por momento

Siete momentos. Cada uno con lo que la persona tiene que sentir.

**1. Llega.**
No sabe qué esperar. El primer mensaje tiene que decir en una línea qué va a pasar y cuánto va a
tardar. Nada de "¿en qué puedo ayudarte?", que obliga a la persona a saber qué pedir.

**2. Conversa.**
El agente pregunta por su vida, no por seguros. "¿Quién depende económicamente de ti hoy?" en vez
de "¿le interesa un seguro de vida?". **Una sola pregunta por turno, nunca dos.** El detalle visual
que más ayuda acá es que se note el avance: que la persona sienta que va llegando a algún lado y no
que la están interrogando.

**3. Recibe la recomendación.**
Un producto, no cinco. Con su nombre real, su prima y qué cubre en lenguaje de vida real, no de
póliza. "Si te incapacitas, sigue entrando plata", no "amparo por incapacidad temporal".

**4. Entiende por qué.**
El momento más importante de toda la pantalla. Ver la sección 5.

**5. Compara.**
Puede ver otras opciones, incluso de otras aseguradoras. **Dos o tres, nunca diez.** El objetivo no
es que elija la mejor, es que sienta que no le escondieron nada.

**6. Ajusta.**
Puede subir o bajar la cobertura y ver el efecto en el precio al instante. Y el agente le explica
el intercambio: pagas menos porque asumes más.

**7. Cierra.**
Acepta, confirma, y recibe un resumen de qué quedó cubierto. **No hay pago ni firma**, el brief los
excluye. El agente cierra diciendo que un asesor retoma para finalizar. Eso no es una limitación
escondida, es la transición honesta a un humano.

---

## 5. El "por qué": el momento que decide el reto

El jurado va a preguntar, textualmente: **"¿por qué a esta persona le mostraste este seguro y no
otro?"**. Y el brief aclara que si la respuesta es "porque sí", el criterio no se cumple.

**Ese por qué tiene que verse en la pantalla, no explicarse en el pitch.**

Siempre tiene dos patas, y las dos se muestran:

- **Por tu perfil:** lo que sabemos de los datos. Por ejemplo: "de cada 100 afiliados con tu mismo
  perfil, 62 compran en droguería todos los meses".
- **Por lo que me contaste:** lo que la persona dijo en la conversación. Por ejemplo: "me dijiste
  que tu mamá depende de ti".

Las dos juntas producen la frase que la persona puede repetirle a alguien más. Ese es el examen: si
después de leerla no puede explicarle a un amigo por qué le recomendaron eso, el diseño falló.

**Sugerencia, no obligación:** que el por qué no sea un párrafo, sino dos piezas visualmente
distintas, para que se lea de un vistazo que hay dos fuentes distintas de evidencia.

---

## 6. Las tres tarjetas interactivas

**Tarjeta de recomendación.**
Nombre del producto, aseguradora, prima mensual, qué cubre, y el por qué de la sección 5.
Y las exclusiones, ver abajo.

**Tarjeta de comparación.**
Dos o tres opciones lado a lado o por pestañas. Lo que se compara tiene que ser lo que a la persona
le importa: qué cubre, qué no cubre, cuánto cuesta. No una tabla de características técnicas.

**Control de cobertura.**
Sube o baja el monto asegurado y el precio se mueve en vivo. Que se vea que el número cambia,
porque ese movimiento es lo que comunica que el sistema está calculando de verdad.

---

## 7. Las exclusiones son una decisión de diseño, no letra menuda

Lo que NO cubre la póliza se muestra **al mismo nivel visual que lo que sí cubre, y antes de que la
persona lo pida.**

Va contra el instinto comercial y es exactamente por eso que funciona. La objeción más común en
seguros es "no confío, hay letra menuda". Mostrar las exclusiones de entrada la desarma antes de
que aparezca, y es la forma más barata de ganar el criterio de confianza que el brief evalúa.

No las escondas en un acordeón cerrado al final. Que se vean.

---

## 8. El momento que nos diferencia

El brief usa este ejemplo para explicar la personalización: alguien soltero sin hijos debe ver algo
distinto a alguien casado con tres hijos. Como está en el brief, **varios equipos lo van a mostrar
con dos perfiles preparados**.

Nuestra versión: **que el jurado cambie él mismo una variable** (agregar un hijo, mover la edad) y
vea recalcularse en vivo la recomendación, las coberturas y el por qué.

Necesita un lugar en la pantalla donde eso sea posible y descubrible sin instrucciones. Es el
elemento con más peso de todo el diseño después del recorrido base, y es tuyo definir cómo aparece.

---

## 9. Marca

Referencia en `Manual-de-Marca-Colsubsidio.md`, reconstruido a partir del material gráfico oficial
real que le compartieron al equipo (paleta de colores institucional y logotipos). Valores exactos:

- **Amarillo Colsubsidio** `#ffd000` (Pantone 109 C), primario. Escala de tinta: 80% / 60% / 40%.
- **Azul Colsubsidio** `#0067b1` (Pantone 2196 C). Escala de tinta: 80% / 60% / 40%.
- **Grafito** `#575756` (Pantone Cool Gray 11 C). Escala de tinta: 60% / 40% / 20%.
- **Blanco** `#FFFFFF`.
- **Nunca texto claro sobre amarillo**, no se lee.
- **Tono de marca:** institucional pero cálido. Lenguaje claro, sin tecnicismos fríos.

**Tipografía: Poppins/Inter 

**Logotipo:** solo se recibió el isotipo (amarillo, sobre fondo transparente) y el logotipo completo
en su versión blanca/reversada (para fondos oscuros). 

El tono de marca y lo que necesita este producto coinciden, así que no hay que pelear con la marca
para lograr cercanía.

---

## 10. Cómo escribe el agente

Esto es copy, pero define el ritmo visual, así que te toca a ti también.

- Mensajes cortos, estilo chat, no correo.
- Una idea por mensaje.
- **Una sola pregunta por turno.** Nunca dos.
- Cero tecnicismos de póliza: no "amparo", no "deducible", no "vigencia".
- Un solo siguiente paso por mensaje, nunca dos llamados a la acción.
- Español colombiano, cercano, sin caer en el chiste.
- Nada de urgencia falsa. La urgencia sale del costo real del problema.

El discurso completo (las 5 preguntas, el dolor de cada perfil, las objeciones y cómo se desarman)
está en `CAPA-CUALITATIVA.md`. Vale la pena leerlo: ahí está el lenguaje exacto con el
que la persona piensa su problema.

---

## 11. Lo que NO debe verse

- Que parezca un formulario. El brief lo descalifica con nombre propio.
- Diez opciones. Tres es el techo.
- Palabras de póliza en la cara del usuario.
- Precios o coberturas que se vean "de relleno". Todo lo que se muestra viene del catálogo real.
- Pago, firma electrónica o descarga de póliza. Están fuera de alcance por decisión del brief.
- Botones que no hacen nada. En un demo que el jurado recorre solo, un botón muerto rompe la
  confianza en todo lo demás.

---

## 12. Cómo sabemos si el diseño funciona

1. **La prueba del extraño.** Alguien que no es del equipo abre la URL, la recorre sin ayuda y
   llega al resumen final. Se hace apenas haya algo navegable, no el último día.
2. **La prueba de repetir.** Después de ver la recomendación, esa persona puede explicar con sus
   palabras por qué le recomendaron ese seguro.
3. **La prueba de gemelos.** Cambiar una variable produce un resultado visiblemente distinto.
4. **La prueba de la letra menuda.** La persona vio las exclusiones sin haberlas buscado.
