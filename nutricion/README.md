# Nutrición · app independiente

App de nutrición en **un solo archivo** (`index.html`), sin dependencias ni build.
Se abre en cualquier navegador y guarda los datos en ese navegador (`localStorage`).

No tiene nada de entrenamiento: ni rutinas, ni fases, ni cargas, ni Garmin.

## Qué hace

Cuatro pestañas, cada una con un trabajo:

| Pestaña | Para qué |
|---|---|
| **Hoy** | Registrar lo que comes y seguir macros y micronutrientes del día |
| **Recetas** | Proponer recetas a partir de los ingredientes que elijas y los macros que quieras alcanzar |
| **Menú** | Menú semanal calculado con lo que tienes en casa y tus preferencias |
| **Compra** | Seguir lo que consumes y montar la lista de la compra |

**Hoy no sugiere nada.** Es un cuadro de mandos y un registro: el número grande es lo que
falta de calorías, debajo cuatro baldosas de macros —proteína, carbos, grasa, saturadas—
con su número, su objetivo y su barra, y al pie una tira pequeña con fibra, hierro, calcio
y vitamina D. Los micros son contexto, no el objetivo del día, y se ven como tal.

Justo debajo del panel están los cuatro botones de registrar —desayuno, almuerzo, merienda
y cena—, que es la acción principal de la pestaña y tiene que caer donde está el pulgar al
terminar de mirar los números. Más abajo, cada comida repite su botón como atajo, y dice
«añadir más» si ya tiene algo registrado.

Proponer es trabajo de Recetas y de Menú: tenerlo también aquí llenaba la pantalla de
cosas que no eran el registro.

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

Uso excluyente: la **Evolate** es solo post-entreno y la **Garden of Life** solo para
recetas. La regla la vigila `powderWarning` al abrir o editar una receta, que es donde se
decide.

No hay casilla de «¿entrenaste hoy?». La hubo, y servía para dejar entrar el batido de
Evolate en el menú, pero un batido post-entreno no se planifica: depende de si entrenas, y
eso no se sabe una semana antes. Las recetas con la etiqueta `post_entreno` quedan fuera
del menú automático y se ponen a mano el día que toca.

## Datos

Todo local, sin cuentas ni servidor. En Ajustes puedes copiar tus datos como texto
y pegarlos para restaurarlos, que es también la forma de pasarlos a otro dispositivo.

## Cargar la compra

Cuatro vías, porque ninguna sirve siempre:

- **Mi último pedido** — el pedido de Mercadona de agosto (44 productos) entero de un
  toque, con sus cantidades. Se suma a lo que ya haya en la despensa, no lo reemplaza.
- **Dictar** — al volver del súper, del tirón: «dos kilos de pechuga de pollo, media
  docena de huevos, un litro de leche». Usa el reconocimiento de voz del navegador.
- **Archivo** — un `.txt` o `.csv` con un producto por línea. De un PDF o una foto no
  puede leer: la app funciona sin conexión y no lleva reconocimiento de imagen.
- **Escribir** — pegar el ticket o la lista.

**No se trocea por puntuación.** Al dictar en español no salen comas: «almejas lomos de
bacalao lomos de salmón y gambas» llega de una pieza. El lector va reconociendo
productos del catálogo y toma en cada punto la secuencia más larga que case, con una
regla que evita comerse el principio del siguiente: una secuencia no puede terminar en
conector ni en palabra de formato, así que «almejas lomos» se descarta y «lomos de
bacalao» queda entero para el bacalao.

Se interpretan cantidades en cifra y en palabra, unidades de peso, volumen, unidades,
docenas y formatos de venta («2 latas de atún» = dos botes, no dos gramos). Interpretar
es adivinar, así que **siempre hay pantalla de revisión**: se ve qué ha entendido de
cada línea, se pueden cambiar el producto y los gramos, y solo entonces entra en la
despensa.

## Supermercados

Dónde compras cada cosa es una costumbre tuya, no una propiedad del alimento, así que
se guarda aparte (`tiendas`) y se puede cambiar desde la propia lista. Por defecto se
deduce de la marca del producto: Hacendado → Mercadona, La Sirena → La Sirena, Alteza,
Selex o Fresc de Mercat → Jespac.

Al cargar una compra se puede marcar de qué súper viene y queda asignada para todos sus
productos, así que la próxima lista ya sale ordenada sola.

La lista se filtra por súper. Con «Todos» se agrupa por supermercado, que es como se
compra; dentro de un súper concreto se agrupa por categoría, que es como está puesta la
tienda.

## Coste estimado

Un producto se compra por envases, no por gramos: si hacen falta 520 g de algo que viene
en botes de 400, se pagan dos botes. Por eso cada alimento puede llevar `precio` (euros
por envase) y `env_g` (lo que trae ese envase), y la lista redondea hacia arriba.

El catálogo solo trae precio de una parte de los productos —los que se leyeron de un
pedido real—, así que **la cifra dice siempre sobre cuántos está hecha**: «Coste estimado
14,20 € · sobre 8 de 23». Tocando el súper de cualquier línea se abre la ficha del
producto, donde se apunta su precio; los precios propios se guardan aparte (`precios`) y
mandan sobre los del catálogo, igual que pasa con las tiendas.

## Editar un registro

Tocar una línea de «Lo que has comido» la abre: se cambian los gramos —con los macros
recalculándose mientras escribes—, la comida a la que va y la marca de comida fuera.

Lo delicado es la despensa, y por eso hay un `reconcilePantry`: subir de 120 a 200 g
descuenta 80 más, bajar a 60 devuelve 140, y marcar una línea como comida fuera devuelve
todo lo que había descontado. Quitar un registro también devuelve lo suyo, cosa que antes
no hacía. Solo se devuelve a lo que ya estaba en la despensa: si el alimento no estaba,
`consumeFood` no descontó nada y devolverlo inventaría stock.

Si el alimento ya no está en el catálogo, los macros se escalan en proporción a lo que se
guardó en su día, que es mejor que no dejar editar.

## Comer fuera

Al montar una comida hay un interruptor **🍽 Comida fuera**. Lo que se registra con él
marcado cuenta para los macros y los micros del día —te lo has comido— pero queda fuera de
todo lo demás:

- **No descuenta de la despensa.** Esa pizza no salió de tu cocina.
- **No cuenta como consumo tuyo**, así que no infla el ritmo con el que `consumptionRate`
  calcula la reposición ni te mete el producto en la lista de la compra.
- **No cuenta como receta repetida** al proponer el menú: cenar pasta en un restaurante no
  es motivo para que la app no te la ponga esta semana.
- **No se puede guardar como receta**: el campo desaparece al marcarlo.

En Hoy se ve con un 🍽 en cada línea y una etiqueta en la comida —«fuera» si toda ella lo
fue, «parte fuera» si solo una parte—.

## Quitar cosas de la lista de la compra

La lista se calcula sola —del menú, de lo que se acaba, de los habituales sin stock— pero
hay cosas que solo sabe ella, así que **+ Añadir producto** mete lo que quiera, con el
motivo «lo has puesto tú».

Quitar una línea calculada no es borrarla: es decir «esta semana no». Se guarda por semana
(`shopx_<semana>`), y la siguiente vuelve a proponerla si sigue haciendo falta. Debajo de
la lista se ve cuántas has quitado, con un enlace para volver a ponerlas todas.

## El menú tira de la despensa

Un menú que te manda al súper cada día no lo sigue nadie. Al generarlo, cada receta suma
puntos por la parte de sus ingredientes que ya está en casa (`pantryCoverage`, en gramos,
no en número de ingredientes) y por los favoritos que uses de esa comida. Dos modos:

- **Prioriza lo que tengo** — la despensa suma 18 puntos como mucho: desempata entre
  recetas parecidas, pero no sacrifica los objetivos del día.
- **Lo que menos falte** — manda cuántos ingredientes faltan y los macros desempatan.

Ninguno de los dos deja huecos. La primera versión filtraba a recetas con todo en casa y
salía un menú vacío: con una compra normal ninguna receta está completa, porque la miel,
la bebida de almendras o la proteína en polvo no vienen en el pedido. Es más útil poner el
plato y etiquetarlo: cada comida dice «en casa» o «faltan 2».

## Consumo y reposición

Cada comida que se registra **descuenta de la despensa**. Con eso y el histórico se
calcula cuánto se gasta al día de cada cosa y para cuántos días queda, y la lista de la
compra se adelanta en vez de ir a remolque. Cada línea dice por qué está: «para el
menú», «te queda poco», «lo usas y no te queda».

## Buscador

Busca **por palabras sueltas, no como frase literal**: «pan integral» encuentra «Pan de
molde integral» aunque las palabras no vayan seguidas. Todas las palabras escritas
tienen que aparecer en el nombre; el orden da igual. Ordena por parecido con lo escrito
(coincidencia exacta, luego principio de nombre, luego principio de palabra), y la
densidad proteica solo desempata.

Unos 861 alimentos. No es el surtido completo de ninguna cadena —eso son miles de
referencias— sino la cesta habitual, con marcas propias de Mercadona, Ametller Origen,
Carrefour y Jespac donde aportan algo. Lo que falte se crea en Ajustes → Alimentos
propios y queda guardado.

## Platos, no solo ingredientes

Un catálogo de ingredientes deja fuera media vida: una pizza, unas croquetas, un
bocadillo, la lasaña del domingo. La categoría **Platos** (unos 114) recoge cocina de
aquí y de Europa ya hecha —pizzas, arroces, platos de cuchara, tapas, guisos, moussaka,
quiche, sushi, kebab— más bollería, quesos y charcutería europea repartidos por sus
categorías.

**Comer fuera también es comer**, así que hay 131 platos de restaurante: tapas y raciones
(pan con tomate, torreznos, chopitos, secreto ibérico, chuletón, kokotxas, marmitako),
arroces, y las cocinas que se comen aquí — italiana, japonesa, china, india, tailandesa,
mexicana, griega, francesa, brunch. Cada uno lleva en `alias` su tipo de cocina, así que
se encuentran buscando «restaurante», «japonés», «tapas» o «italiano», no solo por su
nombre.

Un plato ya hecho **se registra pero no se usa como ingrediente**: `foodRoles` devuelve
lista vacía para toda la categoría, así que el compositor no puede proponerte unas
tortitas «con huevos rotos con jamón». Y como un plato no se mide en cucharadas, hay dos
campos para las cantidades por defecto: `racion_g` (lo que se come de una vez: 75 g de
croquetas, 2 g de sal, 150 ml de vino) y, a falta de ella, 250 g para cualquier plato.
Comprar es otra cosa: de croquetas se trae una bolsa, no una croqueta.

**Los nombres están en castellano**, incluidos los que el súper vende en inglés: la
proteína es «de suero», no *whey*; el queso es «ligero», no *light*; las tortillas de
trigo no son *wraps*. Las marcas no se traducen, que son nombres propios (Hacendado,
MyProtein, Garden of Life).

Para que traducirlos no esconda nada, un alimento puede llevar `alias`: palabras por las
que también se encuentra pero que no se enseñan en ninguna pantalla. Así «whey» sigue
llevando a la proteína de suero, «light» al queso ligero y «kale» a la col rizada. Un
acierto por alias puntúa algo por debajo de uno por nombre, para que el nombre real gane
siempre que compitan.

## Unidades

Gramos y mililitros, siempre.
