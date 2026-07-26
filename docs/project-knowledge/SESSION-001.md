# SESSION-001

## Executive Summary

En esta sesión se construyó la primera versión funcional de la experiencia con la que una persona
podrá contratar un seguro sin hablar con un asesor, junto con el tablero interno con el que el
equipo comercial verá y hará seguimiento a esas conversaciones. Hasta ahora el proyecto tenía el
análisis de datos y toda la documentación de estrategia, pero no existía todavía nada navegable.
Al cierre de la sesión ya se puede recorrer, de principio a fin, una conversación completa: la
persona llega sin saber qué necesita, responde unas pocas preguntas sobre su vida, recibe una
recomendación de seguro concreta con la explicación de por qué esa y no otra, compara opciones,
ajusta la cobertura y cierra. Todo eso queda registrado y visible para el equipo comercial en el
mismo momento.

## Objectives Achieved

- Dejar disponible y navegable el **chat web** donde el cliente conversa con el asistente.
- Dejar disponible el **panel de administración** con dos secciones: el historial de todas las
  conversaciones y el embudo de ventas por fases.
- Conectar ambas superficies a un **único perfil de cliente compartido**, de modo que una misma
  persona sea siempre el mismo registro sin importar por dónde entre.
- Dejar el sistema funcionando de punta a punta hoy mismo, sin depender todavía del motor de
  recomendación definitivo.

## Business Problems Solved

- **No había nada que un jurado o un cliente pudiera usar solo.** Existía la estrategia y el
  análisis, pero ninguna pantalla real. Ahora hay una experiencia navegable.
- **Riesgo de que la recomendación se sintiera arbitraria.** La conversación ya entrega la
  recomendación acompañada de dos razones visibles —lo que dicen los datos del perfil y lo que la
  persona contó en el chat—, que es justamente el criterio que más pesa en la evaluación del reto.
- **Falta de visibilidad para el equipo comercial.** No existía forma de ver qué estaba pasando en
  las conversaciones ni en qué punto de la venta iba cada persona. Ahora hay un tablero que lo
  muestra en vivo.

## New Capabilities

- **Chat web de autoservicio:** la persona conversa en lenguaje natural y recibe, dentro del mismo
  chat, tarjetas con la recomendación, la comparación de opciones, el ajuste de cobertura y el
  resumen de cierre.
- **Recomendación explicada:** cada recomendación llega con su doble justificación (por el perfil y
  por lo conversado), a la vista, no escondida.
- **Panel de conversaciones:** el equipo ve todo lo que dijo el cliente y todo lo que respondió el
  asistente, de cualquier canal, en un solo lugar.
- **Embudo de ventas por fases:** cada cliente avanza automáticamente por las etapas de la venta a
  medida que conversa, y el equipo lo ve moverse.
- **Traspaso a una persona:** el equipo puede apagar el asistente en una conversación y retomarla
  de forma manual cuando haga falta.
- **Perfil compartido entre canales:** el mismo cliente es el mismo registro aunque cambie de
  punto de entrada, lo que hace posible continuar una conversación sin repetir nada.

## Business Benefits

- **Atención 24/7 y sin asesor:** la venta puede ocurrir a cualquier hora sin intervención humana.
- **Confianza:** mostrar el porqué y las exclusiones por adelantado desarma la principal objeción
  de seguros ("hay letra menuda").
- **Consistencia:** todas las personas reciben la misma calidad de asesoría, sin depender de qué
  asesor las atienda.
- **Trazabilidad para el negocio:** cada conversación y cada cambio de fase queda registrado, útil
  tanto para revisar la calidad del asistente como para el seguimiento comercial.
- **Independencia de piezas aún en desarrollo:** la experiencia ya funciona hoy con un guion de
  demostración, y el motor de recomendación definitivo se podrá enchufar más adelante sin rehacer
  las pantallas.

## Before vs After

- **Antes:** el proyecto tenía la base de datos de afiliados analizada, las reglas de negocio
  pensadas y toda la documentación de estrategia, pero ninguna pantalla; nada que una persona
  ajena al equipo pudiera abrir y usar.
- **Después:** hay una conversación completa navegable de punta a punta y un tablero interno donde
  el equipo comercial ve esas conversaciones y el avance de cada cliente por el embudo. La demo se
  puede recorrer sola.

## Decisions

- **Reutilizar una base de CRM open source existente** en lugar de construir el tablero desde
  cero: ya traía resuelto el historial de conversaciones, el embudo por fases y el traspaso a un
  humano, lo que ahorró la mayor parte del trabajo del panel administrativo.
- **Mantener el motor de recomendación como una pieza separada y reemplazable:** hoy corre un
  guion de demostración local y mañana se conecta el motor real que construye otro frente del
  equipo, sin tocar las pantallas ni los datos.
- **Adoptar el embudo de ventas realista de seguros** (prospecto → análisis → cotización/
  negociación → cierre ganado → suscripción → póliza emitida, con la rama de cierre perdido),
  porque refleja el proceso real del negocio, incluidos los pasos posteriores a la venta.
- **Un solo perfil de cliente compartido** entre canales, para que el traspaso entre puntos de
  entrada sea real y no una simulación con datos de prueba.

## Rejected Alternatives

- **Construir un backend separado en otro lenguaje:** se descartó porque habría obligado a
  rehacer desde cero el tablero administrativo (historial, embudo, traspaso a humano) que la base
  reutilizada ya trae, además de sumar un segundo despliegue y contradecir una decisión de equipo
  ya registrada.
- **Construir las pantallas completamente a mano:** descartado por costo de tiempo frente a
  adaptar una base existente que ya cubría la mayor parte de las necesidades.

## Value Generated

Se pasó de "tenemos la estrategia y los datos" a "tenemos algo que se puede usar y mostrar". Esto
desbloquea el criterio más importante del reto —que alguien ajeno al equipo recorra la experiencia
solo y llegue hasta el final— y le da al equipo comercial, por primera vez, visibilidad de lo que
ocurre en las conversaciones y en el embudo. La arquitectura elegida protege el trabajo futuro: el
motor de recomendación real se conecta sin rehacer nada de lo construido hoy.

## Features Added

- Chat web de autoservicio con recomendación, comparación de opciones, ajuste de cobertura y
  cierre, todo dentro de la conversación.
- Panel de conversaciones que consolida los mensajes de cualquier canal.
- Embudo de ventas por fases con avance automático a medida que la conversación progresa.
- Traspaso manual a una persona del equipo.
- Perfil de cliente único y compartido entre canales.

## Future Opportunities

- Reemplazar la piel provisional del chat web por el diseño definitivo de marca.
- Conectar el motor de recomendación real (catálogo y reglas de propensión) en lugar del guion de
  demostración.
- Habilitar el canal de WhatsApp, dejado explícitamente como fase futura en esta sesión (la base
  ya quedó preparada para sumarlo sin rehacer trabajo).
- Publicar la experiencia en línea para que se pueda abrir desde cualquier dispositivo.
