# Hackathon Colsubsidio × 30X — Reto 2: Venta Automatizada de Seguros

> Documento de referencia del equipo, transcrito a partir de las diapositivas oficiales presentadas durante la hackathon (22-26 julio 2026, Bogotá).

## Contexto del negocio

Colsubsidio ofrece productos de seguros a sus afiliados, pero el proceso de venta actual depende completamente de un asesor humano: identificar la necesidad del cliente, cotizar, explicar condiciones y cerrar la venta. Este modelo no escala — está limitado por la disponibilidad y capacidad del equipo comercial, y el crecimiento del negocio de seguros está atado al número de asesores disponibles.

## El problema a resolver

Diseñar y construir una solución que permita que un afiliado pueda pasar de **"no sé qué seguro necesito"** a **"quedé asegurado"**, sin que un humano intervenga en el proceso.

Esto implica resolver, como mínimo:
- Cómo se identifica la necesidad real del usuario (diagnóstico conversacional)
- Cómo se cotiza y se explican las condiciones del producto
- Cómo se genera la confianza suficiente para completar una compra financiera sin asesor
- Cómo se cierra la venta y se formaliza el proceso

## Alcance esperado de la solución

- Un flujo o prototipo funcional que demuestre el recorrido completo del usuario, de principio a fin
- Un agente/sistema de IA que sostenga la conversación y tome decisiones (qué preguntar, qué producto recomendar, cuándo escalar a un humano si es necesario)
- Evidencia de que la solución podría integrarse con canales reales (ej. WhatsApp Business API u otro canal conversacional)

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
*Documento generado a partir de capturas de las diapositivas oficiales. Si algo no coincide exactamente con lo presentado, por favor corregir directamente en este archivo antes de compartirlo con el resto del equipo.*
