// ============================================================
// RECIPES.JS — Biblioteca de recetas
// ------------------------------------------------------------
// Cantidades SIEMPRE en gramos/mililitros.
// Los macros se calculan una vez y se cachean en la receta
// (total_macros); solo se recalculan si cambian los ingredientes.
// ============================================================

const MEAL_TYPES = [
  { key: 'desayuno', nombre: 'Desayuno', icon: '☀️' },
  { key: 'almuerzo', nombre: 'Almuerzo', icon: '🍽️' },
  { key: 'snack',    nombre: 'Snack',    icon: '🍎' },
  { key: 'cena',     nombre: 'Cena',     icon: '🌙' },
];

// Las proteínas en polvo tienen uso diferenciado y excluyente.
const PROTEIN_POWDERS = {
  evolate: {
    food_id: 'b210',
    nombre: 'Evolate whey isolate',
    uso: 'post_entreno',
    nota: 'Solo post-entreno. No usar en recetas.',
  },
  garden_of_life: {
    food_id: 'b211',
    nombre: 'Garden of Life plant-based',
    uso: 'recetas',
    nota: 'Solo para recetas. No usar como post-entreno.',
  },
};

// ============================================================
// RECETAS SEMILLA
// Los desayunos pueden ser dulces o salados; se etiquetan como
// tales para poder alternar, no para restringir.
// ============================================================
const RECIPES_SEED = [
  // ── DESAYUNOS DULCES ──────────────────────────────────────
  {
    id: 'r_des_01',
    name: 'Bowl de skyr con arándanos y avena',
    meal_type: 'desayuno',
    is_fixed: true,
    tags: ['dulce', 'rapido', 'habitual'],
    ingredients: [
      { ingredient_id: 'b004', amount_g: 200 }, // Skyr natural
      { ingredient_id: 'b074', amount_g: 80 },  // Arándanos
      { ingredient_id: 'b055', amount_g: 30 },  // Copos de avena
      { ingredient_id: 'b127', amount_g: 8 },   // Chía
    ],
    notes: 'Mezclar la chía la noche antes si se quiere más cremoso.',
  },
  {
    id: 'r_des_02',
    name: 'Porridge proteico de avena y plátano',
    meal_type: 'desayuno',
    is_fixed: false,
    tags: ['dulce', 'caliente'],
    ingredients: [
      { ingredient_id: 'b055', amount_g: 45 },  // Copos de avena
      { ingredient_id: 'b016', amount_g: 200 }, // Bebida de almendras (ml)
      { ingredient_id: 'b070', amount_g: 80 },  // Plátano
      { ingredient_id: 'b211', amount_g: 15 },  // Garden of Life (receta)
    ],
    notes: 'Proteína vegetal Garden of Life — nunca la Evolate aquí.',
  },
  {
    id: 'r_des_03',
    name: 'Tostadas con quark, mermelada y fresas',
    meal_type: 'desayuno',
    is_fixed: false,
    tags: ['dulce', 'rapido'],
    ingredients: [
      { ingredient_id: 'b057', amount_g: 60 },  // Pan de molde integral
      { ingredient_id: 'b212', amount_g: 120 }, // Quark 0%
      { ingredient_id: 'b201', amount_g: 15 },  // Mermelada
      { ingredient_id: 'b073', amount_g: 80 },  // Fresas
    ],
    notes: '',
  },
  {
    id: 'r_des_04',
    name: 'Yogur griego 0% con frutos rojos',
    meal_type: 'desayuno',
    is_fixed: false,
    tags: ['dulce', 'rapido', 'habitual'],
    ingredients: [
      { ingredient_id: 'b003', amount_g: 200 }, // Yogur griego 0%
      { ingredient_id: 'b074', amount_g: 60 },  // Arándanos
      { ingredient_id: 'b073', amount_g: 60 },  // Fresas
      { ingredient_id: 'b126', amount_g: 10 },  // Crema de cacahuete (dosis pequeña)
    ],
    notes: 'La crema de cacahuete va en dosis pequeña: es grasa del día, no la fuente de proteína.',
  },
  {
    id: 'r_des_05',
    name: 'Tortitas de avena y clara con miel',
    meal_type: 'desayuno',
    is_fixed: false,
    tags: ['dulce', 'caliente'],
    ingredients: [
      { ingredient_id: 'b055', amount_g: 40 },  // Copos de avena
      { ingredient_id: 'b024', amount_g: 150 }, // Clara pasteurizada
      { ingredient_id: 'b070', amount_g: 60 },  // Plátano
      { ingredient_id: 'b200', amount_g: 10 },  // Miel
    ],
    notes: 'Triturar todo y hacer a la sartén sin aceite.',
  },

  // ── DESAYUNOS SALADOS ─────────────────────────────────────
  {
    id: 'r_des_06',
    name: 'Masa madre con huevo, claras y aguacate',
    meal_type: 'desayuno',
    is_fixed: false,
    tags: ['salado', 'habitual'],
    ingredients: [
      { ingredient_id: 'b220', amount_g: 60 },  // Pan de masa madre
      { ingredient_id: 'b023', amount_g: 60 },  // Huevo entero (1 ud)
      { ingredient_id: 'b024', amount_g: 100 }, // Clara pasteurizada
      { ingredient_id: 'b101', amount_g: 50 },  // Aguacate
    ],
    notes: 'La grasa viene del aguacate y la yema: insaturada en su mayor parte.',
  },
  {
    id: 'r_des_07',
    name: 'Tostada de masa madre con salmón ahumado y aguacate',
    meal_type: 'desayuno',
    is_fixed: false,
    tags: ['salado', 'pescado_azul'],
    ingredients: [
      { ingredient_id: 'b220', amount_g: 60 },  // Pan de masa madre
      { ingredient_id: 'b218', amount_g: 70 },  // Salmón ahumado
      { ingredient_id: 'b101', amount_g: 40 },  // Aguacate
      { ingredient_id: 'b094', amount_g: 60 },  // Tomate
    ],
    notes: 'Pescado azul de buena mañana: bien los días con margen de grasa.',
  },
  {
    id: 'r_des_08',
    name: 'Revuelto de claras con espinacas y pan integral',
    meal_type: 'desayuno',
    is_fixed: false,
    tags: ['salado', 'ligero'],
    ingredients: [
      { ingredient_id: 'b024', amount_g: 180 }, // Clara pasteurizada
      { ingredient_id: 'b023', amount_g: 60 },  // Huevo entero (1 ud)
      { ingredient_id: 'b090', amount_g: 80 },  // Espinacas
      { ingredient_id: 'b221', amount_g: 50 },  // Masa madre integral
    ],
    notes: '',
  },

  // ── ALMUERZOS ─────────────────────────────────────────────
  {
    id: 'r_alm_01',
    name: 'Pollo a la plancha con arroz basmati y brócoli',
    meal_type: 'almuerzo',
    is_fixed: false,
    tags: ['salado', 'habitual'],
    ingredients: [
      { ingredient_id: 'b020', amount_g: 160 }, // Pechuga de pollo
      { ingredient_id: 'b052', amount_g: 180 }, // Arroz basmati cocido
      { ingredient_id: 'b091', amount_g: 150 }, // Brócoli
      { ingredient_id: 'b120', amount_g: 8 },   // AOVE
    ],
    notes: '',
  },
  {
    id: 'r_alm_02',
    name: 'Merluza al horno con patata y espárragos',
    meal_type: 'almuerzo',
    is_fixed: false,
    tags: ['salado'],
    ingredients: [
      { ingredient_id: 'b028', amount_g: 200 }, // Merluza
      { ingredient_id: 'b059', amount_g: 200 }, // Patata cocida
      { ingredient_id: 'b181', amount_g: 120 }, // Espárragos
      { ingredient_id: 'b120', amount_g: 8 },   // AOVE
    ],
    notes: '',
  },
  {
    id: 'r_alm_03',
    name: 'Bowl de lentejas con pavo y verduras',
    meal_type: 'almuerzo',
    is_fixed: false,
    tags: ['salado', 'fibra'],
    ingredients: [
      { ingredient_id: 'b111', amount_g: 200 }, // Lentejas cocidas
      { ingredient_id: 'b160', amount_g: 120 }, // Pechuga de pavo
      { ingredient_id: 'b097', amount_g: 80 },  // Pimiento rojo
      { ingredient_id: 'b092', amount_g: 60 },  // Zanahoria
      { ingredient_id: 'b120', amount_g: 6 },   // AOVE
    ],
    notes: 'Buena carga de fibra.',
  },
  {
    id: 'r_alm_04',
    name: 'Ensalada de bonito, garbanzos y tomate',
    meal_type: 'almuerzo',
    is_fixed: false,
    tags: ['salado', 'rapido', 'fibra'],
    ingredients: [
      { ingredient_id: 'b216', amount_g: 120 }, // Bonito al natural
      { ingredient_id: 'b110', amount_g: 150 }, // Garbanzos cocidos
      { ingredient_id: 'b094', amount_g: 150 }, // Tomate
      { ingredient_id: 'b096', amount_g: 40 },  // Cebolla
      { ingredient_id: 'b120', amount_g: 8 },   // AOVE
    ],
    notes: '',
  },
  {
    id: 'r_alm_05',
    name: 'Salmón con quinoa y espinacas',
    meal_type: 'almuerzo',
    is_fixed: false,
    tags: ['salado', 'pescado_azul'],
    ingredients: [
      { ingredient_id: 'b027', amount_g: 140 }, // Salmón
      { ingredient_id: 'b062', amount_g: 160 }, // Quinoa cocida
      { ingredient_id: 'b090', amount_g: 120 }, // Espinacas
      { ingredient_id: 'b120', amount_g: 5 },   // AOVE
    ],
    notes: 'Pescado azul: buena opción los días con margen de grasa.',
  },

  // ── SNACKS ────────────────────────────────────────────────
  {
    id: 'r_snk_01',
    name: 'Batido post-entreno Evolate',
    meal_type: 'snack',
    is_fixed: false,
    tags: ['dulce', 'post_entreno'],
    ingredients: [
      { ingredient_id: 'b210', amount_g: 30 },  // Evolate whey (SOLO post-entreno)
      { ingredient_id: 'b016', amount_g: 250 }, // Bebida de almendras (ml)
      { ingredient_id: 'b070', amount_g: 60 },  // Plátano
    ],
    notes: 'Exclusivo post-entreno. Fuera del post-entreno usar Garden of Life.',
  },
  {
    id: 'r_snk_02',
    name: 'Quark con canela y arándanos',
    meal_type: 'snack',
    is_fixed: false,
    tags: ['dulce', 'rapido', 'habitual'],
    ingredients: [
      { ingredient_id: 'b212', amount_g: 150 }, // Quark 0%
      { ingredient_id: 'b074', amount_g: 70 },  // Arándanos
    ],
    notes: '',
  },
  {
    id: 'r_snk_03',
    name: 'Requesón con miel y nueces',
    meal_type: 'snack',
    is_fixed: false,
    tags: ['dulce'],
    ingredients: [
      { ingredient_id: 'b010', amount_g: 150 }, // Requesón
      { ingredient_id: 'b200', amount_g: 8 },   // Miel
      { ingredient_id: 'b123', amount_g: 12 },  // Nueces (dosis pequeña)
    ],
    notes: 'Nueces en dosis pequeña — grasa insaturada, no fuente principal de proteína.',
  },
  {
    id: 'r_snk_04',
    name: 'Tortitas de arroz con pavo',
    meal_type: 'snack',
    is_fixed: false,
    tags: ['salado', 'rapido'],
    ingredients: [
      { ingredient_id: 'b058', amount_g: 20 },  // Tortitas de arroz
      { ingredient_id: 'b038', amount_g: 80 },  // Pavo en lonchas
    ],
    notes: '',
  },
  {
    id: 'r_snk_05',
    name: 'Skyr con kiwi',
    meal_type: 'snack',
    is_fixed: false,
    tags: ['dulce', 'rapido'],
    ingredients: [
      { ingredient_id: 'b004', amount_g: 150 }, // Skyr
      { ingredient_id: 'b075', amount_g: 100 }, // Kiwi
    ],
    notes: '',
  },

  // ── CENAS ─────────────────────────────────────────────────
  {
    id: 'r_cen_01',
    name: 'Tortilla de claras con espinacas y champiñones',
    meal_type: 'cena',
    is_fixed: false,
    tags: ['salado', 'ligero', 'habitual'],
    ingredients: [
      { ingredient_id: 'b024', amount_g: 200 }, // Clara pasteurizada
      { ingredient_id: 'b023', amount_g: 60 },  // Huevo entero (1 ud)
      { ingredient_id: 'b090', amount_g: 100 }, // Espinacas
      { ingredient_id: 'b102', amount_g: 100 }, // Champiñones
      { ingredient_id: 'b120', amount_g: 5 },   // AOVE
    ],
    notes: '',
  },
  {
    id: 'r_cen_02',
    name: 'Sardinas al horno con ensalada',
    meal_type: 'cena',
    is_fixed: false,
    tags: ['salado', 'pescado_azul'],
    ingredients: [
      { ingredient_id: 'b162', amount_g: 150 }, // Boquerones
      { ingredient_id: 'b095', amount_g: 80 },  // Lechuga
      { ingredient_id: 'b094', amount_g: 120 }, // Tomate
      { ingredient_id: 'b120', amount_g: 8 },   // AOVE
    ],
    notes: 'Pescado azul.',
  },
  {
    id: 'r_cen_03',
    name: 'Wok de gambas con calabacín y arroz integral',
    meal_type: 'cena',
    is_fixed: false,
    tags: ['salado'],
    ingredients: [
      { ingredient_id: 'b031', amount_g: 160 }, // Gambas peladas
      { ingredient_id: 'b099', amount_g: 150 }, // Calabacín
      { ingredient_id: 'b051', amount_g: 120 }, // Arroz integral cocido
      { ingredient_id: 'b141', amount_g: 10 },  // Salsa de soja
      { ingredient_id: 'b120', amount_g: 6 },   // AOVE
    ],
    notes: '',
  },
  {
    id: 'r_cen_04',
    name: 'Trucha a la plancha con judías verdes y boniato',
    meal_type: 'cena',
    is_fixed: false,
    tags: ['salado', 'pescado_azul'],
    ingredients: [
      { ingredient_id: 'b217', amount_g: 160 }, // Trucha
      { ingredient_id: 'b103', amount_g: 150 }, // Judías verdes
      { ingredient_id: 'b061', amount_g: 120 }, // Boniato cocido
      { ingredient_id: 'b120', amount_g: 5 },   // AOVE
    ],
    notes: '',
  },
  {
    id: 'r_cen_05',
    name: 'Pechuga de pavo con crema de calabacín',
    meal_type: 'cena',
    is_fixed: false,
    tags: ['salado', 'ligero'],
    ingredients: [
      { ingredient_id: 'b160', amount_g: 150 }, // Pechuga de pavo
      { ingredient_id: 'b099', amount_g: 200 }, // Calabacín
      { ingredient_id: 'b184', amount_g: 60 },  // Puerro
      { ingredient_id: 'b120', amount_g: 6 },   // AOVE
    ],
    notes: '',
  },
];

// ============================================================
// API
// ============================================================
const Recipes = {
  /** Macros de una receta a partir de sus ingredientes (g/ml). */
  computeMacros(recipe) {
    const totals = { kcal: 0, prot: 0, carbs: 0, fat: 0, sat: 0, fiber: 0 };
    for (const item of (recipe.ingredients || [])) {
      const food = FoodDB.byId(item.ingredient_id);
      if (!food) continue;
      const m = FoodDB.macrosFor(food, item.amount_g);
      totals.kcal  += m.kcal;
      totals.prot  += m.prot;
      totals.carbs += m.carbs;
      totals.fat   += m.fat;
      totals.sat   += m.sat;
      totals.fiber += m.fiber;
    }
    for (const k in totals) totals[k] = Math.round(totals[k] * 10) / 10;
    totals.kcal = Math.round(totals.kcal);
    return totals;
  },

  /** Devuelve la receta con total_macros cacheado y al día. */
  withMacros(recipe) {
    const sig = this.signature(recipe);
    if (recipe.total_macros && recipe._sig === sig) return recipe;
    return Object.assign({}, recipe, {
      total_macros: this.computeMacros(recipe),
      _sig: sig,
    });
  },

  /** Huella de los ingredientes: si cambia, hay que recalcular. */
  signature(recipe) {
    return (recipe.ingredients || [])
      .map(i => `${i.ingredient_id}:${i.amount_g}`)
      .join('|');
  },

  /** Todas las recetas: semilla (menos las borradas) + propias. */
  all() {
    const deleted = Store.getDeletedSeedRecipes();
    const overrides = Store.getRecipeOverrides();
    const own = Store.getRecipes();
    const seeds = RECIPES_SEED
      .filter(r => deleted.indexOf(r.id) < 0)
      .map(r => overrides[r.id] ? Object.assign({}, r, overrides[r.id]) : r);
    return seeds.concat(own).map(r => this.withMacros(r));
  },

  byMealType(mealType) {
    return this.all().filter(r => r.meal_type === mealType);
  },

  get(id) {
    return this.all().find(r => r.id === id) || null;
  },

  isSeed(id) {
    return RECIPES_SEED.some(r => r.id === id);
  },

  /**
   * Guarda una receta. Las semillas se guardan como override
   * (para no perder la receta original al actualizar la app).
   */
  save(recipe) {
    const clean = Object.assign({}, recipe);
    clean.total_macros = this.computeMacros(clean);
    clean._sig = this.signature(clean);
    if (this.isSeed(clean.id)) Store.saveRecipeOverride(clean.id, clean);
    else Store.saveRecipe(clean);
    return clean;
  },

  create(data) {
    const recipe = Object.assign({
      id: 'r_' + Date.now().toString(36),
      name: 'Nueva receta',
      meal_type: 'almuerzo',
      ingredients: [],
      is_fixed: false,
      tags: [],
      notes: '',
    }, data || {});
    return this.save(recipe);
  },

  remove(id) {
    if (this.isSeed(id)) Store.deleteSeedRecipe(id);
    else Store.deleteRecipe(id);
  },

  /** Cuenta de uso — alimenta la preferencia por recetas habituales. */
  markUsed(id) {
    Store.bumpRecipeUsage(id);
  },

  usageCount(id) {
    return Store.getRecipeUsage()[id] || 0;
  },

  /** Una receta es "habitual" si está marcada o si se repite mucho. */
  isHabitual(recipe) {
    return (recipe.tags || []).indexOf('habitual') >= 0 || this.usageCount(recipe.id) >= 3;
  },

  hasTag(recipe, tag) {
    return (recipe.tags || []).indexOf(tag) >= 0;
  },

  /** Uso correcto de las dos proteínas en polvo. */
  proteinPowderWarning(recipe) {
    const ids = (recipe.ingredients || []).map(i => i.ingredient_id);
    const isPostWorkout = this.hasTag(recipe, 'post_entreno');
    if (ids.indexOf(PROTEIN_POWDERS.evolate.food_id) >= 0 && !isPostWorkout) {
      return 'La Evolate whey es solo post-entreno — en recetas usa la Garden of Life.';
    }
    if (ids.indexOf(PROTEIN_POWDERS.garden_of_life.food_id) >= 0 && isPostWorkout) {
      return 'La Garden of Life es solo para recetas — post-entreno usa la Evolate.';
    }
    return null;
  },
};

if (typeof window !== 'undefined') {
  window.Recipes = Recipes;
  window.RECIPES_SEED = RECIPES_SEED;
  window.MEAL_TYPES = MEAL_TYPES;
  window.PROTEIN_POWDERS = PROTEIN_POWDERS;
}
