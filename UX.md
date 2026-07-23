# UX — La pantalla del usuario (en emulador y en website)

Para Sarah. Qué tiene que lograr la interfaz que ve la persona que va a comprar un seguro.
No dice cómo se ve, dice qué tiene que pasarle a quien la usa. El cómo es tuyo.

---

# NOTAS
puentes/canales son 2 principalmente (lo que ve el cliente y por donde se va a contactar con colsubsidio):

la webpage (un simulador chatbot con estilo de colsubsidio que por detras funciona exactamente igual que el simulador de whatsapp), va en una seccion entera dedicada a ese chatbot (no es un boton flotante, es una seccion entera de la pagina oficial de colsubsidio), el flujo es cliente->bot aunque el sistema puede incluir contexto de cliente si viene desde otro lugar (whatsapp)

el simulador de whatsapp (un simulador que literalmente es como si fuera whatsapp, su mismo estilo grafico) donde el cliente va a poder contactar Y SER CONTACTADO con flujo cliente->bot y bot->cliente [la idea es despues poder simular mensajes iniciales del bot hacia el cliente]; este simulador de whatsapp es proactivo, el puede contactar directamente al cliente y viceversa, aunque el objetivo principal siempre es mandar al cliente a la webpage con toda la informacion y contexto que se haya recopilado en whatsapp, un cliente puede completar el proceso end 2 end directamente en whatsapp, solo que en la webpage seria mas facil para todos


el dashboard de admin es un lugar donde el admin puede ver 2 secciones principales:

seccion CRM: donde evidencia todos los clientes del csv o xlsx que le inyecte con su informacion cruda, otro lugar donde los clinetes ya hayan sido procesados/analizados por ia para dar un breve resumen/analisis de hhacia que direccion se puede ir el cliente, otro lugar donde pueda mostrar ya los clientes con su respectivo analisis, los demas datos, y las fases de los clientes (Prospecto [datos crudos de cliente], Análisis [analizado segun datos crudos], Cotización/negociacion [esta hablando con cliente para ver su mejor seguro], Cierre Ganado [adquiere seguro], Cierre Perdido [rechaza oferta de seguros], En Suscripción [La aseguradora evalúa el riesgo antes de emitir, este proceso se hace manual], Póliza Emitida [pago inicial registrado, este proceso ya se hace manual]) y si deben pasar a follow-manual (nuestrasolucion no alcanza para el proceso entero, pero si mas del 70%).

seccion registros: un lugar donde se va a poder visualizar todo lo que el clinete dijo y todo lo que el bot dijo (tanto desde el simulador de whatsapp como desde el website o como desde llamadas a futuro con sus transcripts usando ia), algo simple, tipo app de mensajes, que tenga informacion cruda del cliente obtenida del csv o xlsx o alguna db, analisis del cliente, y ahi mismo se puede ver el contexto del cliente adicional.


## 1. La única prueba que importa

> "El flujo completo se puede recorrer de inicio a fin sin que el equipo lo explique al jurado."

**Un jurado va a abrir la pantalla y a usarla solo, sin que nadie le diga nada.** Si en algún punto
se queda mirando sin saber qué hacer, ese criterio se pierde y no hay forma de compensarlo después.

Esto convierte tu trabajo en el que decide el resultado del reto. Cuando haya que elegir entre algo
bonito y algo obvio, gana lo obvio.

La segunda prueba, en palabras del propio brief: **"¿yo usaría esto para comprar un seguro real?"**

---

## 2. Quién es la persona

por defecto, 20 a 35 años soltero sin hijos (segun analisis de data 1.5m registros)

**Qué sabe de seguros:** casi nada. No sabe si necesita vida, salud o accidentes. No sabe qué es un deducible ni le importa, solo quiere encontrar lo que mas le convenga.

**Por qué nunca ha comprado:** no sabe por dónde empezar y porque asume que va a terminar hablando con un vendedor que le va a insistir.

**Qué teme al usar esto:** que le vendan algo que no necesita, que después le digan que eso no estaba cubierto.

**No está comprando un seguro.** Está decidiendo proteger algo. Eso no significa que la interfaz deba ser solemne, significa que no puede sentirse como un formulario ni como una tienda.

---

## 3. Cómo está armada la pantalla, son 2 puentes actualmente lo que ve el cliente (emulador-website)

Un **chat que ocupa el centro**, con la estructura de WhatsApp: burbujas, hilo que baja, escritura natural. La conversación es el producto, no un accesorio.
Pero con el design de colsubsidio y sus colores y todo eso

el puente que conecta el sistema con el cliente mediante el simulador de whatsapp, debe tener todo el ux y design de whatsapp para simularlo al maximo (este es el lugar donde el cliente se contactaria en la vida real con el sistema, mediante whatsapp)

el puente que conecta el sistema con el cliente mediante la website si debe tener todo el ux y design propio de colsubisido, va a ser una seccion dedicada en el apartado de seguros de la pagina oficial de colsubsidio y va a tener la misma funcion y capacidad que el puente de whatsapp, solo es un puente diferente

Dentro del chat, el agente puede mandar **tarjetas interactivas**: bloques que se tocan, no solo
texto. Ahí viven la comparación, el ajuste de cobertura y las exclusiones.
para el puente de whatsapp debemos tener en cuenta las tools que actualmente se pueden usar en whatsapp (bootnes, listas, imagenes, links, etc...) y para el puente de website ya puede ser personalizable al 100% la idea es que sea similar a whatsapp o si hay una idea mejor, aplicarla, pero para este mvp la idea es hacer lo mismo que hace whatsapp, documentando que se puede expandir hacia un lugar mas personalizado

**La regla que ordena todo esto:** lo que va dentro del chat tiene que ser algo que WhatsApp
también podría mostrar (listas, botones, tarjetas). Así el mismo agente sirve en la web y en
WhatsApp sin rediseñar.
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

Referencia en `Manual de Marca Colsubsidio.md` del repo del equipo. Ojo con una advertencia que el
propio documento trae: **no es un manual oficial**, es una reconstrucción desde el logo público. No
hay valores oficiales publicados. Sirve como guía, no como ley.

- **Amarillo Colsubsidio** `#FFD100`, primario.
- **Azul institucional** `#0068B3`. **Azul oscuro para texto** `#0B2A4A`. **Blanco** `#FFFFFF`.
- **Tipografía:** Poppins para títulos, Inter para cuerpo.
- **Nunca texto claro sobre amarillo**, no se lee.
- **Tono de marca:** institucional pero cálido. Lenguaje claro, sin tecnicismos fríos.

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
