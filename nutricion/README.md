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

## Cómo se proponen las recetas

Una receta no es una suma de macros: es un **formato** (bowl, tortitas, porridge,
tostadas, batido, muffins, galletas, revuelto, plancha, ensalada) donde cada
ingrediente cumple un **papel** — base, crujiente, fruta, proteína en polvo, liante,
grasa para untar, guarnición. Los papeles se derivan del alimento en `foodRoles()`.

Al proponer se elige un formato compatible con la comida y con el tiempo disponible,
se reparten los ingredientes elegidos por sus papeles y se ajustan los gramos dentro
de lo que cada papel admite. De ahí salen platos con nombre, tiempo y pasos.

Esto es lo que impide que aparezca una berenjena en un desayuno: no tiene ningún papel
en los formatos de desayuno, y los que llevan verdura la acotan a las que pintan algo
ahí (tomate, espinacas, champiñones). En una cena sí entra, porque ahí sí tiene papel.

**Cantidades fijas.** Si escribes los gramos de un ingrediente, esos no se tocan y ese
ingrediente entra en la receta obligatoriamente. Fijar gramos es decir «esto va, y va
así».

**Lo que falta.** Si con un ingrediente más se desbloquea un formato, se dice cuál y
para qué: «te falta pan para las Tostadas». Al ir por papeles, nunca sugiere algo que
no pinte nada en esa comida.

## Cómo se ajustan las cantidades

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

## Buscador

Busca **por palabras sueltas, no como frase literal**: «pan integral» encuentra «Pan de
molde integral» aunque las palabras no vayan seguidas. Todas las palabras escritas
tienen que aparecer en el nombre; el orden da igual. Ordena por parecido con lo escrito
(coincidencia exacta, luego principio de nombre, luego principio de palabra), y la
densidad proteica solo desempata.

Unos 425 alimentos. No es el surtido completo de ninguna cadena —eso son miles de
referencias— sino la cesta habitual, con marcas propias de Mercadona, Ametller Origen,
Carrefour y Jespac donde aportan algo. Lo que falte se crea en Ajustes → Alimentos
propios y queda guardado.

## Unidades

Gramos y mililitros, siempre.
