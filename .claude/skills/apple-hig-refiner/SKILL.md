---
name: apple-hig-refiner
description: Pule una interfaz hasta el acabado de una app nativa de Apple, siguiendo las Human Interface Guidelines. Úsala cuando se pida que algo "se vea/sienta como una app de iPhone", con acabado Apple, más nativo, más pulido o con mejor detalle visual; y siempre que se trabaje en una web app o PWA que se vaya a usar desde el móvil, aunque no nombren a Apple. Cubre zonas táctiles, safe areas, tipografía, hojas modales, movimiento, contraste, modo oscuro y las trampas de Safari en iOS.
---

# Acabado Apple

Las apps de Apple no destacan por ser bonitas sino por ser **previsibles**: el pulgar
llega donde tiene que llegar, nada salta de sitio, el texto se lee al sol y cada
gesto responde al instante. Esta skill busca ese acabado, no una capa de estilo.

## Los tres principios y lo que implican

Apple los resume en claridad, deferencia y profundidad. Traducidos a decisiones:

- **Claridad** — el texto se lee siempre, los iconos se entienden, hay una sola
  acción principal por pantalla y se nota cuál es.
- **Deferencia** — manda el contenido. Los cromos, bordes y sombras están al servicio
  de lo que se muestra; si compiten con ello, sobran.
- **Profundidad** — las capas explican dónde estás. Una hoja que sube desde abajo
  dice «esto es temporal, puedes volver» sin una sola palabra.

## Empieza siempre por esto

En una web app que se usa desde iPhone hay cuatro fallos que aparecen casi siempre y
que rompen la ilusión de app nativa al instante. Compruébalos antes que nada:

**1. Campos de texto por debajo de 16 px.** Safari en iOS **hace zoom automático** al
enfocar un `input` con tipografía menor de 16 px, y deja la página descuadrada. Es el
fallo más común y el más delator. Todo `input`, `select` y `textarea` va a 16 px o
más, aunque visualmente pidiera menos.

**2. Zonas táctiles menores de 44×44 pt.** Es la medida del pulgar, no un capricho.
Un botón puede *verse* pequeño, pero su área pulsable no. Se consigue con `padding`,
o con un pseudo-elemento que agrande el objetivo sin tocar el aspecto.

**3. Safe areas ignoradas.** El notch, la Dynamic Island y la barra de inicio se comen
los bordes. Barra inferior fija sin `padding-bottom: env(safe-area-inset-bottom)` =
botones debajo del indicador de inicio, imposibles de pulsar. Requiere además
`viewport-fit=cover` en el viewport.

**4. Rebote de layout al aparecer el teclado.** Si el foco en un campo mueve o tapa lo
que se estaba mirando, la sensación es de página web, no de app.

El detalle de cada comprobación, con el CSS concreto, está en
`references/checklist-ios.md`. Léelo cuando vayas a aplicar los arreglos.

## Qué revisar, por bloques

### Tipografía
Escala clara y pocos tamaños. Cuerpo a 16-17 px; nada por debajo de 11 px, y ese
tamaño solo para etiquetas cortas. Títulos con peso, no con tamaño desmedido.
`text-wrap: balance` en titulares. Números que se comparan en columna: tipografía
tabular (`font-variant-numeric: tabular-nums`), o bailan al actualizarse.
La familia del sistema (`-apple-system`) da SF Pro en iPhone, que es exactamente la
tipografía que la persona ya está leyendo en el resto del móvil.

### Jerarquía y acción
Una sola acción principal por pantalla, con relleno de color; el resto en contorno o
en texto. Si hay dos botones rellenos compitiendo, alguno no era principal. Lo
destructivo se separa del resto y se marca en rojo.

### Hojas y modalidad
Suben desde abajo, con esquinas redondeadas y un asa visible. Se cierran tocando
fuera, arrastrando o con Escape. Ocupan lo que necesitan, no siempre la pantalla
entera. No anides hojas: si una hoja abre otra hoja que abre otra, ya se perdió el
hilo de por dónde se vuelve.

### Navegación
Barra de pestañas con cinco como mucho, cada una guardando su propio estado al ir y
volver. La marca de «dónde estoy» debe leerse sin pensar. Volver atrás nunca pierde
lo que se estaba escribiendo sin avisar.

### Controles y teclado
Cada campo pide el teclado que le toca: `inputmode="numeric"` para cantidades,
`type="search"` con `autocorrect` y `autocapitalize` desactivados para buscadores.
Interruptores para lo que se activa y desactiva; segmentos para elegir entre pocas
opciones excluyentes; nunca un desplegable para tres cosas.

### Respuesta y movimiento
Todo lo que se toca responde en el mismo momento: un cambio de fondo, una opacidad.
Sin respuesta inmediata la app parece rota aunque sea rápida. Las transiciones
duran entre 0,2 y 0,3 s y tienen un porqué: explicar de dónde sale algo o adónde va.
Respeta `prefers-reduced-motion`. Evita `:hover` como única señal: en el móvil no
existe.

### Color, contraste y modo oscuro
El color semántico (bien, aviso, error) va aparte del color de marca. Contraste
mínimo 4,5:1 en texto normal. El modo oscuro no es invertir: los grises se recalculan
y el acento suele necesitar subir luminosidad para sostenerse sobre fondo oscuro.
El color nunca es el único portador de un significado; acompáñalo de texto o forma.

### Accesibilidad
No es un extra: es parte del acabado. Etiqueta los botones que solo llevan icono
(`aria-label`), marca el estado de los que se conmutan (`aria-pressed`,
`aria-current`), asegura un foco visible para quien navega con teclado y comprueba
que el orden de lectura sigue al orden visual.

## Cómo trabajar

Verifica en un navegador real con tamaño de iPhone (390×844 es buena referencia) y
mira **las dos modalidades de color**. Un fallo de contraste en oscuro no se ve
leyendo el CSS.

Arregla por tokens, no por parches: si un color o un tamaño se corrige a mano en un
sitio, el mismo fallo sigue vivo en los otros diez.

Al informar, separa lo que rompe la experiencia de lo que la mejora, y di qué
comprobaste de verdad frente a qué dedujiste leyendo el código. «Comprobado en 390×844
en claro y oscuro» y «deducido del CSS» no valen lo mismo.

## El límite

Imitar el acabado de Apple es aprender de sus decisiones de diseño. No es apropiarse
de su identidad: no reproduzcas su marca, sus iconos ni sus tipografías de pago, ni
hagas pasar la app por una app de Apple.
