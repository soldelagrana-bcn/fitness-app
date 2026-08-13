---
name: ux-refactor
description: Audita una interfaz buscando fricción real de uso y aplica los arreglos. Úsala siempre que se hable de que algo "no es intuitivo", "cuesta de usar", "da muchas vueltas", "es poco claro" o "hay que tocar mucho"; también al rediseñar una pantalla, al añadir una función a una app que ya existe, o antes de dar por terminada una interfaz. No hace falta que pidan "refactor de UX" con esas palabras: si el tema es la usabilidad de algo que ya funciona, esta skill aplica.
---

# Refactor de UX

Arreglar usabilidad no es repartir mejor los píxeles: es reducir el trabajo que la
persona tiene que hacer para conseguir lo que venía a conseguir. Esta skill sirve
para encontrar ese trabajo sobrante y quitarlo.

## El principio que ordena todo lo demás

**Empieza por la tarea, no por la pantalla.** Antes de mirar nada, escribe en una
frase qué viene a hacer la persona y cada cuánto. «Registrar lo que acabo de comer,
tres o cuatro veces al día, de pie en la cocina» lleva a decisiones muy distintas de
«revisar mi progreso una vez por semana en el sofá».

Con esa frase, casi todos los problemas se vuelven visibles: lo que sirve a la tarea
principal debe estar primero y ser grande; lo demás cede el sitio.

## Método

### 1. Recorre el flujo real con datos reales

Lee el código si hace falta, pero **no audites de memoria**: abre la app y haz la
tarea. Si hay forma de automatizarlo (Playwright o similar), hazlo con una pantalla
del tamaño real del dispositivo y con contenido de verdad, no con dos ejemplos de
juguete. Los problemas de UX aparecen cuando hay diez ingredientes en la lista, no
cuando hay uno.

Cuenta mientras recorres:
- **Toques hasta completar la tarea principal.** Es la métrica más honesta que hay.
- **Decisiones antes del primer avance útil.** Cada elección que no ayuda es peaje.
- **Repeticiones.** Si algo se hace N veces seguidas, casi siempre es un lote
  disfrazado de operación individual.

### 2. Busca estos patrones

Son los que más se repiten. Para cada uno, la pregunta que lo detecta:

**La acción principal está enterrada.** ¿Lo que hace la gente el 80 % de las veces
está debajo de lo que hace el 20 %? Pasa mucho cuando lo secundario es lo más
vistoso de construir (recomendaciones, gráficas, resúmenes).

**Un lote convertido en bucle.** ¿Hay que repetir buscar → elegir → confirmar por
cada elemento? Reúnelo en una sola pantalla donde se añadan varios seguidos y el
total se vea al vuelo.

**El orden optimizado para el contexto equivocado.** Un mismo criterio de ordenación
puede ser excelente en un sitio y absurdo en otro. Al *buscar*, manda parecerse a lo
escrito. Al *sugerir*, manda la calidad de la opción. Confundirlos hace que quien
escribe «huevo» reciba «clara de huevo en polvo» primero.

**Valores por defecto neutros pero equivocados.** «100» es neutro y casi nunca
correcto: para un huevo son 60, para el aceite 15. Un buen valor por defecto es el
que acierta la mayoría de las veces, no el que no se moja.

**Avisos que no informan.** Una alerta que salta cuando aún no hay nada que juzgar
(«te faltan 115 g de proteína» con el día vacío) enseña a ignorar las alertas, y
entonces también se ignoran las que importan. Un aviso debe llegar cuando cambia
algo que la persona puede accionar.

**Etiquetas que nombran el sistema, no el mundo.** La gente gestiona *avisos*, no
*configuración de webhooks*. Escribe desde el lado de quien mira la pantalla.

**Estados vacíos que no enseñan.** La primera vez que se abre algo es la mejor
ocasión para explicar qué se puede hacer. «Sin datos» la desaprovecha.

**Callejones sin salida.** ¿Se puede deshacer? ¿Se puede salir de aquí sin perder lo
escrito? ¿Qué pasa si se pulsa atrás a mitad?

**Información sin jerarquía.** Si todo tiene el mismo tamaño y peso, no hay nada
destacado y la vista rebota. Decide qué es lo primero que hay que leer y haz que lo
parezca.

### 3. Prioriza por daño, no por facilidad

Ordena lo encontrado en tres cajones y sé sincero sobre cuál es cuál:

- **Bloquea la tarea** — impide o retrasa mucho lo que la persona vino a hacer.
- **Desgasta** — molesta cada vez; a la larga hace abandonar la app.
- **Pulido** — mejora la sensación pero nadie se ha quejado nunca.

Arregla los dos primeros. El tercero solo si sale gratis mientras estás dentro.

### 4. Arregla y vuelve a recorrer

Aplica los cambios y **repite el recorrido midiendo otra vez**. Si los toques no
bajaron, el arreglo era cosmético. Dilo en vez de disimularlo.

## Cómo informar

Sé concreto y breve. Para cada hallazgo:

```
[Bloquea | Desgasta | Pulido] Qué pasa, en una frase desde el lado de quien usa la app.
Por qué duele: la consecuencia real.
Arreglo: qué se cambió.
```

Al final, la medida antes y después: «montar una comida de cuatro ingredientes pasaba
de 12 toques y 4 pantallas a 6 toques en una sola».

Cuando algo no se arregle, dilo con su motivo. Un informe que solo trae buenas
noticias no sirve para decidir.

## Dos tentaciones que conviene evitar

**Rediseñarlo todo.** El encargo suele ser «esto cuesta de usar», no «hazlo otra vez».
Cambiar de arriba abajo destruye lo que la persona ya sabía dónde estaba, y mezcla
mejoras con regresiones de forma que ya no se puede saber qué funcionó.

**Añadir para resolver.** Un problema de claridad rara vez se arregla metiendo un
texto de ayuda, un tutorial o un icono más. Casi siempre se arregla **quitando** un
paso, una opción o un elemento que competía por la atención.
