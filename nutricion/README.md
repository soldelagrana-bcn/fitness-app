# Nutrición · app independiente

App de nutrición en **un solo archivo** (`index.html`), sin dependencias ni build.
Se abre en cualquier navegador y guarda los datos en ese navegador (`localStorage`).

No tiene nada de entrenamiento: ni rutinas, ni fases, ni cargas, ni Garmin.

## Qué hace

- **Hoy** — el número grande es lo que **falta** para cerrar el día, no lo consumido.
  Debajo, proteína, carbos, grasa y saturadas contra el objetivo.
- **Qué como para cerrar el día** — propone recetas para la comida que elijas,
  con la **porción ya ajustada** al hueco que queda, y un atajo para cerrar el
  hueco de proteína con un solo ingrediente.
- **Recetas** — 23 de partida (desayunos dulces y salados), editables, más las tuyas.
  Y **«Proponme una receta»**: eliges entre tus ingredientes favoritos, dices qué
  macros quieres alcanzar (por ejemplo 35 g de proteína, 70 de carbos y 10 de fibra)
  y calcula los gramos de cada cosa, con tres propuestas distintas. Si con lo elegido
  no se llega, recomienda qué ingrediente añadir; y te dice qué falta en la despensa.
- **Menú** — semana completa cuadrada con los objetivos; cambia o fija cada comida.
- **Compra** — despensa, recetas que puedes hacer con lo que hay, y lista que
  resta lo que ya tienes.

## Objetivos

Fijos, no cambian según el día. Por defecto 1600 kcal, 115 g de proteína (piso),
165 g de carbos y 55 g de grasa. Se editan en Ajustes, que es el único sitio donde
viven. «Recalcular carbos y grasa» cuadra los macros con las kcal sin tocar la proteína.

## Reglas de salud

- Saturadas por encima del 20 % del objetivo de grasa.
- Día por debajo de 1500 kcal — el riesgo aquí es comer de menos.
- Proteína por debajo de 115 g.

Al sugerir, cada comida tiene su parte del margen de saturadas con algo de holgura,
para que un huevo con aguacate no dispare un aviso cada mañana. Solo registra y
avisa; no interpreta nada clínicamente.

## Cómo se calculan las recetas propuestas

Es un ajuste, no una búsqueda: se parte de una ración normal de cada ingrediente y se
afina uno a uno, en pasos de 5 g, hasta que deja de mejorar. Tres detalles hacen que
el resultado sea una receta y no una lista de números:

- **Mínimos con sentido.** Por debajo de cierta cantidad el ingrediente no se usa;
  5 g de granola no son un ingrediente.
- **Peaje por ingrediente.** Cuadrar el objetivo con cuatro alimentos es mejor receta
  que cuadrarlo casi igual con nueve, así que cada uno extra penaliza un poco.
- **Varios arranques.** Se prueba desde repartos distintos, porque partiendo siempre
  del mismo sitio sale siempre la misma receta.

Y una regla que manda sobre las demás: **la primera propuesta usa todos los
ingredientes marcados**. Marcarlos significa «quiero comer esto», no «tienes permiso
para usarlo». Las versiones más cortas que vienen debajo dicen en voz alta qué dejan
fuera, para que nada desaparezca en silencio.

Lo que se compra por unidades (huevos) salta de unidad en unidad, y hay topes por
alimento para que no proponga 300 g de aguacate con tal de cuadrar el número.

## Densidad proteica

Los alimentos y recetas se **ordenan** por gramos de proteína por caloría, nunca se
filtran: la crema de cacahuete o los frutos secos siguen ahí, en dosis pequeñas.

## Las dos proteínas en polvo

- **Evolate whey** — solo post-entreno. Aparece únicamente si marcas «¿Entrenaste hoy?».
- **Garden of Life** — solo en recetas, nunca suelta ni como post-entreno.

## Datos

Todo local, sin cuentas ni servidor. En Ajustes puedes copiar tus datos como texto
y pegarlos para restaurarlos, que es también la forma de pasarlos a otro dispositivo.

## Unidades

Gramos y mililitros, siempre.
