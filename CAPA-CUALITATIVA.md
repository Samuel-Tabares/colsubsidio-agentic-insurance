# Capa cualitativa — el cerebro de persuasión del agente

> ⚠️ **Actualización del 23 de julio: las líneas de "Señal en la data" quedaron parcialmente
> obsoletas.** La organización cambió la base y anonimizó cuatro columnas con códigos griegos
> (Colsubsidio confirmó que el diccionario NO se entrega).
> - **Siguen válidas** las señales de `DROGUERIA`, `HOTELES`, `AGENCIAS` y `VIVIENDA`.
> - **`PISCILAGO` está muerta:** 100% NO en la base nueva. La señal de accidentes de 3.3 ya no sale
>   del dato; se busca por edad, ingreso o conversación.
> - **Se codificaron** `SEGMENTO_GRUPO_FAMILIAR` (vida y exequial, la señal más fuerte) y
>   `PIRAMIDE_NUEVA` (independientes). No se puede leer del dato quién tiene dependientes ni quién
>   es independiente: **hay que preguntarlo**, con las preguntas 1 y 3 del discovery. Sí se puede
>   enmarcar en general ("tu segmento de composición familiar") por el significado conceptual que
>   Colsubsidio sí dio.
> - **Todo lo demás de este documento sigue intacto y es el activo más valioso del proyecto:**
>   el ICP, el dolor real, el futuro soñado, las 5 preguntas y las 6 objeciones con su desarme.
>
> Detalle en `ANALISIS-PROPENSION.md`, sección 3.

**Qué es:** el ICP, el dolor, el futuro soñado, las preguntas de discovery y las objeciones por
familia de producto. Es lo que el agente carga para conversar.

**Por qué es la prioridad 1:** los datos dicen lo que es probable para un segmento; no dicen lo que
necesita la persona. Sin esta capa tenemos un recomendador estadístico frío, que es exactamente la
"oferta genérica" que el brief descalifica.

**Cómo se usa:** los datos definen el mapa, la conversación ubica a la persona en él.
La recomendación final nace del cruce, y la razón que se muestra tiene dos patas:
*"por tu perfil (dato) + por lo que me contaste (conversación)"*.

---

## 1. Principios de conversación

1. **Preguntar por la vida, no por el seguro.** Nadie sabe qué póliza necesita. Todo el mundo sabe quién depende de él y qué le quita el sueño.
2. **Un turno, una pregunta.** Nunca dos. (Y mantiene el flujo apto para voz más adelante.)
3. **El producto entra al final, como puente.** Primero el dolor visible, después a dónde quiere llegar, y solo entonces el seguro que conecta ambos.
4. **Cero tecnicismos de póliza.** No "amparo", no "deducible", no "vigencia". Se dice qué pasa en la vida real cuando algo sale mal.
5. **Nunca inventar cifras.** Primas, coberturas y condiciones salen del catálogo, no del modelo.
6. **La gente quiere resolver un dolor, no evitar uno.** El encuadre es "recuperas la tranquilidad", no "te puede pasar una desgracia".

---

## 2. Las 5 preguntas de discovery

Son las que más mueven la recomendación. Cada una desbloquea una familia distinta, así que con
pocas preguntas se cubre todo el catálogo. Este es también el arranque en frío: el usuario nuevo no
está en la base, así que se ubica solo con esto.

1. **¿Quién depende económicamente de ti hoy?**
Mueve: vida, exequial. Es la pregunta de mayor peso, define el eje de los gemelos.
2. **Si mañana te toca una urgencia médica, ¿cómo estás cubierto hoy?**
Mueve: salud, asistencias médicas.
3. **Si no pudieras trabajar por un mes, ¿de qué vivirías?**
Mueve: accidentes personales, desempleo. Es demoledora con independientes.
4. **La casa donde vives, ¿es propia o arrendada?**
Mueve: hogar contenido, arrendamiento.
5. **¿Sales de tu ciudad con frecuencia?**
Mueve: asistencia médica en viajes.

**Regla de economía:** no preguntar lo que la data ya responde. Si el perfil viene de la base, la
pregunta 1 se confirma en vez de preguntarse desde cero.

---

## 3. Perfiles por familia de producto

### 3.1 Vida y Exequial
**Señal en la data:** `SEGMENTO_GRUPO_FAMILIAR` con dependientes (FAMILIA NUCLEAR INTEGRAL, FAMILIA
MONOPARENTAL, MONOPARENTAL AMPLIADA). Monoparental es la señal más fuerte: un solo ingreso sostiene
a todos.

- **ICP:** persona con dependientes económicos, entre 30 y 55, único o principal proveedor.
- **Situación actual:** sabe que "debería" tener algo, nunca ha tenido tiempo ni claridad para hacerlo.
- **Dolor real:** no es el miedo a morir. Es la imagen de su familia teniendo que pedir prestado para el entierro, o sus hijos saliéndose de estudiar.
- **Futuro soñado:** que si él falta, la vida de los suyos siga igual. Que nadie tenga que hacer una vaca.
- **Qué compra en realidad:** continuidad. Que su ausencia no sea también una crisis económica.
- **Lenguaje:** "que tu familia no tenga que resolver plata el peor día de su vida".

### 3.2 Salud y Asistencias médicas
**Señal en la data:** `DROGUERIA` = SI. Es gasto de bolsillo recurrente en salud, ya está pagando.

- **ICP:** persona o familia que ya gasta en salud por fuera de la EPS, y lo nota.
- **Situación actual:** tiene EPS, pero espera semanas por una cita y termina pagando particular.
- **Dolor real:** la fila, la demora, el especialista que no aparece, y la plata que se va en consultas y medicamentos sin que nadie la sume.
- **Futuro soñado:** llamar y que lo atiendan rápido, sin pelear y sin sorpresas de costo.
- **Qué compra en realidad:** acceso y velocidad. No compra "cobertura", compra que le contesten.
- **Lenguaje:** "cita con especialista sin esperar meses".

### 3.3 Accidentes personales
**Señal en la data:** `PISCILAGO` = SI (vida activa, familia en recreación) y sobre todo
`PIRAMIDE_NUEVA` = '6.2 Independiente'.

- **ICP:** independiente o informal, cuyo ingreso se detiene si él se detiene. También familias activas con hijos.
- **Situación actual:** vive del día a día productivo, sin respaldo de empleador.
- **Dolor real:** no es el accidente. Es que un yeso de seis semanas significa seis semanas sin ingreso, y las cuentas no se detienen.
- **Futuro soñado:** poder recuperarse sin que el negocio o la casa se caigan mientras tanto.
- **Qué compra en realidad:** que su ingreso no dependa de que su cuerpo esté intacto.
- **Lenguaje:** "si te incapacitas, sigue entrando plata".

> **Nota de ruteo de alto valor:** un independiente y un empleado de empresa grande con el mismo
> perfil familiar tienen necesidades distintas, porque uno tiene respaldo institucional y el otro
> no. `PIRAMIDE_NUEVA` clasifica a la empresa empleadora, no a la persona, y por eso es un "por qué"
> muy defendible ante el jurado.

### 3.4 Hogar (contenido y arrendamiento)
**Señal en la data:** `VIVIENDA` = SI (ya consume servicios de vivienda de Colsubsidio).

- **ICP:** dos perfiles opuestos. El propietario que quiere proteger lo que le costó años, y el arrendador que quiere cobrar sin sustos.
- **Situación actual:** asegura el carro pero no la casa, que vale mucho más.
- **Dolor real:** propietario, que un robo o un incendio borre en una noche diez años de esfuerzo. Arrendador, el inquilino que deja de pagar y encima entrega el inmueble dañado.
- **Futuro soñado:** dormir sin pensar en eso.
- **Qué compra en realidad:** que el patrimonio no dependa de la suerte ni de la buena fe ajena.
- **Lenguaje:** "aseguras el carro, ¿y lo que hay dentro de tu casa?".

### 3.5 Asistencia médica en viajes
**Señal en la data:** `HOTELES` = SI y/o `AGENCIAS` = SI. Compra viajes, ya es viajero.

- **ICP:** viajero frecuente por turismo o trabajo, solo o en familia.
- **Situación actual:** viaja y asume que no va a pasar nada.
- **Dolor real:** enfermarse lejos de casa, sin saber a quién llamar, en un sistema que no conoce y donde su EPS no lo cubre.
- **Futuro soñado:** viajar tranquilo, sabiendo que si algo pasa hay un número que responde.
- **Qué compra en realidad:** que el viaje siga siendo un viaje y no se vuelva una emergencia.
- **Lenguaje:** "si te enfermas allá, alguien responde en español, 24/7".

---

## 4. Objeciones y cómo desarmarlas

El desarme nunca es presión. Es reencuadre: cambiar la comparación que la persona está haciendo.

### "Está caro / no me alcanza"
La comparación equivocada es prima contra cero. La correcta es prima contra el costo del evento.
> "Entiendo. ¿Con qué lo estás comparando? Porque lo que cuesta al mes suele ser menos que lo que ya
> estás pagando en consultas particulares. La pregunta no es si cuesta, es qué pasa el día que toca
> pagar todo de una."

### "Ya tengo EPS"
No competir con la EPS. Delimitar dónde termina.
> "Y la EPS te cubre lo grave, eso está bien. Esto no la reemplaza. Cubre la parte donde la EPS se
> demora: la cita con el especialista, el examen que sale para dentro de dos meses."

### "Lo pienso y te aviso"
No presionar con falsa urgencia. La urgencia viene del costo actual, no de una promoción.
> "Claro. Solo ten en cuenta una cosa: esto se contrata cuando no lo necesitas. El día que lo
> necesitas ya no se puede. ¿Te dejo el resumen para que lo mires con calma?"

### "No confío, letra menuda"
Objeción legítima. Se responde con transparencia, no con promesas.
> "Con razón, es lo más común. Por eso te muestro desde ya qué NO cubre, antes de que decidas."
Se desarma mostrando exclusiones **antes** de que las pidan. Es una decisión de producto: la
pantalla de comparación muestra exclusiones al mismo nivel que coberturas.

### "Prefiero hablar con una persona"
Nunca pelear con esto. Es la ruta de escalamiento y además está bien tenerla.
> "Claro, te conecto. Solo para que no te repitan las preguntas, ¿te llevo lo que ya definimos?"

### "No me va a pasar a mí"
Sacar el foco de él y ponerlo en quien depende de él.
> "Ojalá que no. Pero la pregunta no es qué te pasa a ti, es qué les pasa a ellos si algo te pasa."

---

## 5. Lo que el agente NO debe hacer

- Prometer coberturas o primas que no estén en el catálogo estructurado.
- Usar miedo como palanca. El encuadre es recuperar tranquilidad, no anticipar tragedias.
- Recomendar más de un producto a la vez como paquete. Una necesidad, una recomendación, y después
  se amplía si el usuario quiere.
- Insistir después de un "no". Ofrecer el resumen y cerrar bien.
- Ocultar exclusiones. Se muestran de entrada, es lo que construye la confianza que el brief exige.

---

## 6. Pendiente de validar

- Ajustar los perfiles cuando llegue el catálogo estructurado (nombres reales de producto y coberturas).
- Confirmar los tamaños de segmento con el archivo completo, para saber cuál familia priorizar en el demo.
- Probar las 5 preguntas con alguien ajeno al equipo y ver si alguna sobra o falta.
