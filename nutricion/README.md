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

Proponer platos con lo que hay en casa era antes también trabajo de Compra. Ya no: eso lo
hacen Menú —que genera la semana tirando de la despensa— y Recetas.

**Hoy no sugiere nada.** Es un cuadro de mandos y un registro: el número grande es lo que
falta de calorías, debajo cuatro baldosas de macros —proteína, carbos, grasa, saturadas—
con su número, su objetivo y su barra, y al pie una tira pequeña con fibra, hierro, calcio
y vitamina D. Los micros son contexto, no el objetivo del día, y se ven como tal.

Justo debajo del panel están los cuatro botones de registrar —desayuno, almuerzo, merienda
y cena—, que es la acción principal de la pestaña y tiene que caer donde está el pulgar al
terminar de mirar los números. Más abajo, cada comida tiene en su pie el botón que le
toca: «Registrar cena» si está vacía, «Editar» si ya tiene algo.

Proponer es trabajo de Recetas y de Menú: tenerlo también aquí llenaba la pantalla de
cosas que no eran el registro.

## Una ficha de receta, en un solo sitio

Contar lo que lleva un plato y cómo se hace es trabajo de **Recetas**. La ficha
(`recipeDetail`) vive ahí una vez —dibujo, ingredientes con gramos y kcal, macros, micros,
densidad proteica, el aviso de las proteínas en polvo y la preparación— y **Menú tira de
ella** cuando enseña el plato propuesto, sin dibujo porque ahí no hace falta. Dos copias del
mismo bloque se separan a la primera.

**Hoy no la usa.** Hoy registra y mide: su lista de recetas es nombre, macros, estrella y
«Registrar», con un «Verla en Recetas» que cambia de pestaña. Si quieres saber cómo se
hace, se mira donde se guardan las recetas.

## Tus recetas, al registrar

Guardar una receta y que luego no aparezca al registrar la comida es guardarla en un cajón
sin asa, que es lo que pasaba: al quitar las sugerencias de Hoy, la única forma de ver una
receta guardada era irse a la pestaña Recetas.

Cada comida de Hoy tiene ahora un **★** al lado de su botón. Abre tus recetas de esa
comida, ordenadas con las de estrella primero, luego las habituales, luego el resto, y un
filtro «Todas / ★ Favoritas».

Cada tarjeta es nombre, macros, la estrella y dos botones: **Registrar**, que la mete en
esa comida, y **Verla en Recetas**, que cambia de pestaña y abre su ficha. Aquí no hay
desglose ni preparación: eso es de Recetas.

### El dibujo del plato

**No es una foto.** La app va sin conexión y en un solo archivo: no hay fotos que traer ni
sitio donde meterlas. Es un dibujo en SVG hecho con los ingredientes de verdad.

El recipiente sale de cómo se llama el plato —cuenco, plato, vaso, pila de tortitas,
rebanada, pieza—, y dentro va una mancha por ingrediente, del tamaño de su parte en gramos
y del color de lo que es: los arándanos azules, el aguacate verde, el pan tostado. Los
mismos colores marcan el desglose de abajo, para poder leer una cosa mirando la otra.

Una regla que no es obvia: en una tostada la base es **la rebanada**, aunque no sea lo que
más pesa. Una tostada con huevo encima no es amarilla; es de pan con una mancha amarilla.

La estrella se pone desde ahí o desde la pestaña Recetas. Se guarda aparte de la receta
(`recetas_fav`), que marcar algo como favorito es cosa tuya y tiene que sobrevivir a
editarla.

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

Cada comida tiene su propio botón **Editar**, en el pie de su tarjeta. Se edita comida a
comida: al corregir la cena no tiene por qué desordenarse el desayuno. En edición cada
línea se toca: los gramos se escriben en el sitio, tocar el nombre abre la ficha completa
—comida a la que va, marca de comida fuera— y la ✕ la quita.

Corregir suele incluir «y además me comí esto», así que en edición sale también un
**+ Añadir** al lado de «Listo»: se añade sin salir de la edición, y lo nuevo aparece ya
editable. Una comida vacía no tiene nada que editar, así que su botón dice «Registrar
cena».

En la ficha completa se cambian los gramos con los macros recalculándose mientras
escribes, la comida a la que va y la marca de comida fuera.

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
todo lo demás: no descuenta de la despensa, no cuenta como consumo tuyo para reponer, no
entra en la lista de la compra y no cuenta como receta repetida al proponer el menú.
Tampoco se puede guardar como receta.

Se quita igual de fácil que se pone: en modo edición cada línea lleva su 🍽, y tocarlo
marca o desmarca. Al marcarlo se devuelve a la despensa lo que había descontado; al
quitarlo se vuelve a descontar. Antes había que borrar la línea y volver a registrarla.

En Hoy se ve con un 🍽 en cada línea y una etiqueta en la comida —«fuera» si toda ella lo
fue, «parte fuera» si solo una parte—.

## Buscadores que no se van de la pantalla

Los buscadores de las hojas —registrar, montar comida, compositor— viven en una **franja
fija** entre la cabecera y el cuerpo, fuera de lo que hace scroll.

El primer intento fue `position: sticky` dentro del cuerpo, y no aguanta en Safari de iOS:
el `-webkit-overflow-scrolling: touch` del contenedor lo rompe, así que al aparecer los
resultados y abrirse el teclado el campo se iba por arriba y se escribía a ciegas. Sacarlo
del scroll no depende de ningún truco: si no está dentro, no se puede ir.

## Compra: tres secciones y un botón de editar

La pestaña tenía tres bloques largos uno detrás de otro y para ver la despensa había que
bajar por todo lo demás. Ahora son tres secciones con su botón arriba —**Lista**, **Mi
despensa**, **Se acaba**—, con el número de cada una, y se ve la que toques.

Un único botón **Editar** pone en modo edición la sección que estés viendo. Ahí cada línea
deja de ser un texto y pasa a ser tres cosas: los gramos se escriben, tocar el nombre abre
el buscador para cambiar de producto conservando la cantidad, y la ✕ lo quita. Es el caso
de «esto no era eso, y de aquello había 400 g no 800», que antes obligaba a borrar y
volver a añadir.

Las cantidades se guardan al salir del campo, no en cada tecla: repintar mientras escribes
te roba el cursor.

## La lista es lo que falta

En la Lista solo salen los productos **por comprar**. Marcar uno como comprado lo mete en
la despensa con su cantidad y lo saca de la lista: ya está en casa, y su sitio es Mi
despensa. Desmarcarlo deshace las dos cosas exactamente —se apunta cuántos gramos entraron
por esa vía (`shopbuy_<semana>`), para poder devolver esos y no otros.

Debajo queda una línea con lo comprado esta semana y un «Verlos» que los enseña tachados,
por si hay que desmarcar un toque sin querer. Los productos del pedido de Mercadona entran
ya marcados, así que aparecen en Mi despensa y no estorban en la lista.

El contador de la cabecera dice «38 por comprar», los chips de supermercado cuentan solo lo
pendiente, y el coste estimado también.
## Quitar cosas de la lista de la compra

La lista se calcula sola —del menú, de lo que se acaba, de los habituales sin stock— pero
hay cosas que solo sabe ella, así que **+ Añadir producto** mete lo que quiera, con el
motivo «lo has puesto tú».

Quitar una línea calculada no es borrarla: es decir «esta semana no». Se guarda por semana
(`shopx_<semana>`), y la siguiente vuelve a proponerla si sigue haciendo falta. Debajo de
la lista se ve cuántas has quitado, con un enlace para volver a ponerlas todas.

## Menú: un botón arriba

Arriba solo hay la semana y **Preferencias**. Todo lo que es «cómo quiero la semana» —los
dos modos de despensa, las sugerencias, rehacer el menú— vive dentro de esa hoja, que es de
lo que se trata. Antes había cinco botones y un párrafo de instrucciones antes de ver el
lunes.

## Decirle cómo quieres la semana

Lo dictado **se escribe en el propio campo de texto** según sale, para poder corregirlo
antes de guardar. Antes se quedaba en una caja aparte y había que volver a tocar el
micrófono para pasarlo: si guardabas directamente, las preferencias se perdían sin decir
nada.

**Preferencias** abre una hoja donde se dicta o se escribe: *«más pescado y verdura, sin
cerdo, algo rápido»*. **No hay ninguna IA dentro** —la app va sin conexión—: lo que hay es
un lector de reglas. Eso está aquí, no en la pantalla: la hoja son los dos modos de
despensa, el botón de dictar, el campo y lo que ha entendido. Explicar cómo funciona por
dentro no ayuda a usarla.

Va palabra a palabra. Una negación (`sin`, `nada`, `ni`, `evita`, `menos`…) abre un tramo
negado y una palabra positiva (`más`, `quiero`, `pon`, `con`…) lo cierra, así que «sin
cerdo, más pescado» deja el cerdo fuera y el pescado dentro. Lo que no reconoce como comida
lo ignora, y lo dice en vez de callárselo.

No se buscan productos del catálogo sino **familias**, porque nadie pide «Salmón fresco
Carrefour», pide «pescado». Hay familias para pescado, marisco, cerdo, pollo, ternera,
cordero, carne, verdura, fruta, legumbre, lácteo, queso, huevo, pasta, arroz, pan, dulce y
frito; lo que no es familia se busca por nombre.

Con eso: lo negado **no entra** aunque cuadre de maravilla, lo pedido suma 10 puntos por
ingrediente (hasta 3), y si pides prisa suben las recetas con etiqueta `rapido` —las
recetas no guardan minutos, así que se pondera en vez de filtrar—. Si tus condiciones dejan
una comida sin ninguna receta posible, el hueco se queda vacío y el aviso lo dice: un hueco
mudo parece un fallo.

## El menú dice qué tienes y qué falta

«¿Esto lo tengo?» es la pregunta que se hace mirando el menú, y hasta ahora había que
irse a Compra a averiguarlo. Al final de la semana hay un resumen —«48 productos · 12 en
casa · 36 por comprar»— y, dentro de cada día en edición, cada ingrediente dice **en
casa**, **en la lista** o **sin comprar**.

Lo que falta entra solo en la lista de la compra, que se calcula del menú. «Sin comprar»
solo sale si la quitaste tú de la lista; entonces el resumen los nombra y ofrece volver a
ponerlos.

## Cambiar una comida del menú

Tocar una comida del menú abre el plato **propuesto** primero: lo que lleva ingrediente a
ingrediente con sus gramos y sus kcal, los macros, la preparación si la receta la trae, y
una línea con lo que te falta de casa para hacerlo. Debajo, las demás opciones en
compacto, cada una con «Ver qué lleva» y «Poner esta».

Las notas de una receta unas veces cuentan cómo se hace y otras son un apunte nutricional,
así que el titulillo mira cómo empieza la frase: **Preparación** si arranca con un verbo de
cocina, **Nota** si no. Llamar «Preparación» a «la grasa viene del aguacate» es mentir en
la etiqueta.

Cambiar de plato borra los cambios que le hubieras hecho al anterior: eran de aquella
receta, no de este hueco.

## Editar un día del menú

Cada día tiene su **Editar el día**. Abre los platos: cada ingrediente con su cantidad, un
🛒 delante de lo que no tengas en casa, y tres cosas que puedes hacer — cambiarlo por otro
(⇄, conservando la cantidad), quitarlo (✕) o añadir uno nuevo. Más un botón que manda a la
lista de la compra todo lo que falte de ese plato.

Los cambios viven en el hueco del menú (`swaps`, `removed`, `added`), no en la receta:
cambiar la cena del martes no puede reescribir la receta para siempre. Los macros del día
se recalculan con los cambios, la comida se marca como «cambiada» y hay un «Deshacer
cambios» que la devuelve a la original.

## El menú tira de la despensa

Un menú que te manda al súper cada día no lo sigue nadie. Al generarlo, cada receta suma
puntos por la parte de sus ingredientes que ya está en casa (`pantryCoverage`, en gramos,
no en número de ingredientes) y por los favoritos que uses de esa comida. Dos modos:

- **Prioriza lo que tengo** — la despensa suma 18 puntos como mucho: desempata entre
  recetas parecidas, pero no sacrifica los objetivos del día.
- **Lo que menos falte** — manda cuántos ingredientes faltan y los macros desempatan.

Por encima de todos los bonus hay una penalización de 60 puntos si el plato pasaría el día
del límite de saturadas. Pasarse es una regla de salud, no una preferencia, y sin ese
castigo la despensa y los antojos acababan mandando sobre el colesterol: con la despensa
llena, cuatro de siete días se pasaban.

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
