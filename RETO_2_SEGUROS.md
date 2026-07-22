# Hackathon Colsubsidio × 30X — Reto 2: Venta Automatizada de Seguros

> Documento de referencia del equipo, transcrito a partir de las diapositivas oficiales presentadas durante la hackathon (22-26 julio 2026, Bogotá), y fusionado con el brief informal del reto (antes en `contexto.md`) para no perder ningún detalle entre las dos versiones.

**Enlaces:** catálogo de seguros Colsubsidio → https://www.colsubsidio.com/seguros · dashboard exploratorio de datos de afiliados → ver [README](README.md).

## Contexto del negocio

Colsubsidio ofrece productos de seguros a sus afiliados, pero el proceso de venta actual depende completamente de un asesor humano: identificar la necesidad del cliente, cotizar, explicar condiciones y cerrar la venta. Sin esa intervención, la venta no ocurre.

Este modelo no escala:
- **No escala**: un asesor solo puede atender a un potencial cliente a la vez, y el crecimiento del negocio de seguros está atado al número de asesores disponibles.
- **No está disponible 24/7**: si alguien lo necesita un sábado a las 10pm, espera al lunes.
- **Genera experiencias inconsistentes**: cada asesor explica distinto, ofrece distinto, cierra distinto.

## El problema a resolver

Diseñar y construir una solución que permita que un afiliado pueda pasar de **"no sé qué seguro necesito"** a **"quedé asegurado"**, sin que un humano intervenga en el proceso. Dicho de otra forma: llevar al potencial cliente desde "no sé qué seguro necesito" hasta "ya quedé asegurado" sin que tenga que hablar con nadie.

Esto implica resolver, como mínimo:
- Cómo se identifica la necesidad real del usuario (diagnóstico conversacional)
- Cómo se cotiza y se explican las condiciones del producto
- Cómo se genera la confianza suficiente para completar una compra financiera sin asesor
- Cómo se cierra la venta y se formaliza el proceso

**Rol de Colsubsidio**: actúa como sponsor, no diseña ni emite las pólizas — facilita el acceso a seguros ofrecidos por distintas aseguradoras. El reto consiste en ayudar a cada persona a identificar la opción más adecuada dentro de esa oferta y acompañarla hasta quedar asegurada.

## Cómo se ve un buen resultado

No dicen qué construir, sino qué tendría que lograr una buena solución:

- Identifica qué tipo de persona tiene mayor propensión a necesitar un seguro y por qué.
- Le presenta una oferta adaptada a su perfil: distinta para alguien soltero sin hijos que para alguien casado con tres hijos.
- Le permite ajustar coberturas, comparar opciones y resolver dudas sin tener que llamar a nadie.
- Cierra la vinculación: aceptación, confirmación y resumen. La persona termina asegurada.
- El flujo completo se puede recorrer de inicio a fin sin que el equipo lo explique al jurado. Autogestionado.

Si la solución logra eso, no importa si es una app, un chat, un flujo guiado o algo que no se les haya ocurrido — eso es lo que quieren ver: la forma de resolverlo del equipo.

## Alcance esperado de la solución

- Un flujo o prototipo funcional que demuestre el recorrido completo del usuario, de principio a fin.
- Un agente/sistema de IA que sostenga la conversación y tome decisiones (qué preguntar, qué producto recomendar, cuándo escalar a un humano si es necesario).
- Evidencia de que la solución podría integrarse con canales reales (ej. WhatsApp Business API u otro canal conversacional).

## El dominio: lo que necesitas entender para resolverlo bien

Esto no es instrucción de qué construir, es el contexto del problema.

**Colsubsidio es sponsor, no asegurador, ni intermediario.** El catálogo de seguros que se maneja reúne productos de varias aseguradoras. El flujo no diseña el seguro; ayuda al potencial cliente a encontrar el adecuado entre los que ya existen y a vincularse a él.

**La propensión no puede ser aleatoria.** Decidir a quién mostrarle un seguro de vida vs. uno de hogar debe estar basado en variables reales del potencial cliente: número de beneficiarios, edad, eventos de vida, tipo de empleo, hábitos. El jurado preguntará: ¿por qué a esta persona le mostraste este seguro y no otro? Si la respuesta es "porque sí" o "aleatorio", el criterio no se cumple.

**La oferta debe variar por perfil.** Una persona soltera sin hijos y una casada con 3 hijos deben ver ofertas claramente distintas: no solo en el precio, también en el tipo de seguro y en las coberturas sugeridas. Una oferta genérica que sirva para todos no califica.

**La experiencia tiene que transmitir confianza.** La persona no está comprando una camiseta, está decidiendo proteger algo importante. La interfaz debe sentirse personal, no como un formulario genérico. Lenguaje claro, información relevante visible, sin tecnicismos de póliza. La pregunta que se hace el jurado: ¿yo usaría esto para comprar un seguro real?

**Timing y canal (opcional, pero potente).** Detectar cuándo y por dónde contactar al potencial cliente (tras un evento de vida, tras X días sin interacción, tras consultar cierto servicio) eleva mucho el puntaje estratégico.

## Qué NO toca este reto

- Integración real con aseguradoras.
- Firma electrónica con validez legal.
- Gestión de siniestros, renovaciones o flujo multi-aseguradora en producción.
- Pasarela de pago real.

## Criterios de evaluación (a confirmar con el jurado)

- Claridad y viabilidad de la propuesta de negocio
- Calidad de la experiencia de usuario (facilidad, confianza, transparencia)
- Solidez técnica de la solución (arquitectura, uso de IA, manejo de datos)
- Calidad de la presentación/pitch final

## Notas del equipo

- El equipo decidió no cerrar del todo la arquitectura hasta escuchar la explicación oficial y completa del reto, ya que aún pueden surgir requisitos adicionales (por ejemplo, si el agente debe manejar transacciones de dinero directamente).
- Se identificó como riesgo crítico: qué tan bien se comunica la recomendación de un producto de seguro sin que el usuario sienta que es una decisión arbitraria o poco transparente de la IA.

## Cronograma del evento

- **Miércoles y jueves**: sesiones virtuales (explicación de retos, mentoría)
- **Viernes a domingo**: hackathon presencial en Club La Colina, Colsubsidio, Bogotá (o virtual si no hay cupo presencial)

## Equipo asignado a este reto

| Integrante | Rol propuesto |
|---|---|
| Sarah | UX del journey conversacional, confianza/explicabilidad, pitch |
| Jhon | Orquestación conversacional (flujo del agente, integración WhatsApp API) |
| Samuel | Backend y arquitectura de datos (PostgreSQL, RAG/Pinecone) |
| Santiago | Capa de IA/modelos y decisión, infraestructura cloud |

---
*Documento generado a partir de capturas de las diapositivas oficiales y del brief informal del reto. Si algo no coincide exactamente con lo presentado, por favor corregir directamente en este archivo antes de compartirlo con el resto del equipo.*
