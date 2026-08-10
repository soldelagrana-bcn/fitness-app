# Módulo de nutrición y recetas

App personal (una sola usuaria) para planificar comidas, calcular macros y generar
menús semanales contra objetivos nutricionales **fijos**. Vive dentro de la PWA
existente: HTML/CSS/JS sin build, datos en `localStorage`, sincronización opcional
con Supabase. Sin backend ni multiusuario.

## Dónde está cada cosa

| Fichero | Responsabilidad |
|---|---|
| `js/nutrition-config.js` | **Única** fuente de los objetivos diarios, el perfil y las reglas de salud |
| `js/foods.js` | Catálogo de alimentos (kcal, macros, saturadas, fibra) + `FoodDB` |
| `js/recipes.js` | Modelo de receta, recetas semilla y API de la biblioteca |
| `js/planner.js` | Motor: restante del día, sugerencias, menú semanal, lista de la compra |
| `js/store.js` | Persistencia en `localStorage` (recetas, despensa, menús, objetivos) |
| `js/app.js` | Vistas, navegación y modales |

## Objetivos diarios

Son **fijos**: no varían por tipo de día (gym / tenis / descanso). Se definen en
`js/nutrition-config.js` y se leen siempre con `NutritionConfig.targets()`:

```js
DAILY_TARGETS_DEFAULT = { kcal: 1600, protein_g: 115, carbs_g: 165, fat_g: 55 }
```

- La **proteína es un piso**, no una variable de ajuste.
- Los **carbohidratos y la grasa** son lo que se recalcula si cambian las kcal
  (`NutritionConfig.rebalance()`, o el botón «Recalcular CH y grasa» en Ajustes).
- Se editan en **un solo sitio**: Ajustes → Objetivos nutricionales. Ningún
  componente hardcodea kcal ni gramos.

Las tablas `MACROS_POR_DIA` y `TIPO_DIA_SEMANA` de `js/data.js` quedan **inactivas**
para el cálculo de objetivos. Si algún día se reintroduce el reparto por tipo de día,
debe ir detrás del toggle `DAY_TYPE_TARGETS_ENABLED`, desactivado por defecto.

## Reglas de salud

Definidas en `HEALTH_RULES` y aplicadas por `Planner.alerts(fecha)`:

- Grasa saturada por encima del **20% del objetivo de grasa** (11 g con 55 g de grasa).
- Día por debajo de **1500 kcal** — el riesgo documentado aquí es el subconsumo.
- Proteína por debajo de **115 g**.

Además, cuando el día tiene margen de grasa, el motor **prioriza** recetas con grasas
insaturadas o pescado azul (etiquetas `pescado_azul` y `grasa_insaturada`).

La app solo registra y avisa. No interpreta clínicamente el colesterol.

## Densidad nutricional

`FoodDB.proteinDensity(food)` = `prot100 / kcal100`. Es un criterio de **ranking**, no un
filtro: los alimentos calóricamente densos y bajos en proteína (cremas de frutos secos,
quesos grasos) puntúan peor como fuente de proteína pero siguen disponibles en dosis
pequeñas o como grasa del día. Se usa al ordenar el selector de alimentos, al puntuar
recetas y en el atajo «cierra con un ingrediente».

## «¿Qué me falta para cerrar el día?»

Es la función central (`Planner.suggestForMeal`). Dado lo ya consumido:

1. Calcula el restante del día contra los objetivos fijos.
2. Reparte ese restante entre las comidas que faltan; si es la última, le toca todo.
3. **Ajusta la porción** de cada receta candidata a ese hueco (`fitFactor`), porque es
   lo que realmente se va a comer.
4. Puntúa la versión ajustada: proteína (peso mayor, y quedarse corto penaliza mucho
   más que pasarse), kcal, saturadas, grasa y carbos; más bonus por densidad proteica,
   grasas saludables cuando hay margen y recetas habituales; y penalización creciente
   por repetición.

El número que se ve en cada sugerencia es el **encaje relativo** al mejor candidato.

## Menú semanal y compra

- `Planner.generateWeeklyMenu(weekStart)` genera 7 días cuadrando cada uno con los
  objetivos, ajustando porciones y evitando repetir recetas en días seguidos.
- Cada hueco se puede **cambiar** (se reajusta la porción al hueco del día) o **fijar**
  con el candado para que no se mueva al regenerar.
- `Planner.shoppingList(menu)` agrega los ingredientes del menú y **resta lo que ya hay
  en la despensa**, agrupando por categoría.

## Las dos proteínas en polvo

Tienen uso excluyente y el motor lo respeta:

- **Evolate whey** (`b210`) — solo post-entreno. Solo se propone los días con entreno
  completado, y nunca como ingrediente suelto en recetas.
- **Garden of Life plant-based** (`b211`) — solo para recetas, nunca como post-entreno
  ni suelta.

`Recipes.proteinPowderWarning()` avisa en la ficha y en el editor si se mezclan.

## Unidades

Todo en **gramos y mililitros**, en el modelo y en la interfaz. Nunca onzas, tazas ni
cacitos.

## Fuera de alcance

Multiusuario, integración con Garmin para nutrición, ajuste automático de calorías por
actividad y cualquier interpretación médica.

## Pendiente (fase 2)

Lectura de recetas de Pinterest/Instagram, micronutrientes (fibra ya se registra;
faltan hierro, calcio y vitamina D), déficits semanales de micros, límite configurable
de repeticiones por semana, histórico de adherencia y aprendizaje de lo que se evita.
