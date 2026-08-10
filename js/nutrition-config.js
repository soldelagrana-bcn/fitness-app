// ============================================================
// NUTRITION-CONFIG.JS — Fuente única de verdad nutricional
// ------------------------------------------------------------
// TODOS los targets de macros viven aquí. Ningún componente
// debe hardcodear kcal ni gramos objetivo: pedirlos siempre a
// NutritionConfig.targets().
// ============================================================

// ---- PERFIL (hardcodeado: app de una sola usuaria) ----------
const NUTRITION_PROFILE = {
  nombre: 'Sol',
  objetivo: 'Recomposición corporal — look fino, mantener tono',
  restriccion_salud: 'Colesterol total 220-230 → controlar grasas saturadas',
  desayuno: 'dulce',          // los desayunos son SIEMPRE dulces, nunca salados
  unidades: 'g/ml',           // nunca onzas, tazas ni cacitos
};

// ---- TARGETS DIARIOS FIJOS ---------------------------------
// Fijos: NO varían por tipo de día (gym / tenis / descanso).
// La proteína es un piso no negociable; CH y grasa son la
// variable de ajuste si se cambian las kcal.
const DAILY_TARGETS_DEFAULT = {
  kcal: 1600,
  protein_g: 115,
  carbs_g: 165,
  fat_g: 55,
};

// Toggle de "targets por tipo de día". Desactivado por defecto y
// deliberadamente sin implementar en el cálculo (ver spec §3).
const DAY_TYPE_TARGETS_ENABLED = false;

// ---- REGLAS DE SALUD ---------------------------------------
const HEALTH_RULES = {
  // Grasa saturada: alertar si supera el 20% del total de grasa diaria
  sat_fat_max_pct_of_fat: 0.20,
  // Subconsumo: el riesgo documentado es comer de menos, no de más
  kcal_min: 1500,
  // Piso de proteína
  protein_min_g: 115,
  // Margen de grasa a partir del cual conviene priorizar
  // insaturadas / pescado azul en las sugerencias
  fat_margin_g_for_healthy_fats: 12,
};

// ---- MACROS → KCAL -----------------------------------------
const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 };

const NutritionConfig = {
  STORAGE_KEY: 'sol_daily_targets',

  /** Targets vigentes (por defecto + overrides guardados). */
  targets() {
    let saved = null;
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) saved = JSON.parse(raw);
    } catch (e) { saved = null; }
    const t = Object.assign({}, DAILY_TARGETS_DEFAULT, saved || {});
    return {
      kcal:      Number(t.kcal)      || DAILY_TARGETS_DEFAULT.kcal,
      protein_g: Number(t.protein_g) || DAILY_TARGETS_DEFAULT.protein_g,
      carbs_g:   Number(t.carbs_g)   || DAILY_TARGETS_DEFAULT.carbs_g,
      fat_g:     Number(t.fat_g)     || DAILY_TARGETS_DEFAULT.fat_g,
    };
  },

  saveTargets(partial) {
    const next = Object.assign(this.targets(), partial || {});
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(next));
    return next;
  },

  resetTargets() {
    localStorage.removeItem(this.STORAGE_KEY);
    return this.targets();
  },

  isCustomised() {
    const t = this.targets();
    return Object.keys(DAILY_TARGETS_DEFAULT)
      .some(k => t[k] !== DAILY_TARGETS_DEFAULT[k]);
  },

  /**
   * kcal que suman los macros objetivo. Sirve para avisar de que
   * unos targets editados a mano no cuadran con las kcal fijadas.
   */
  kcalFromMacros(t) {
    const x = t || this.targets();
    return Math.round(
      x.protein_g * KCAL_PER_G.protein +
      x.carbs_g   * KCAL_PER_G.carbs +
      x.fat_g     * KCAL_PER_G.fat
    );
  },

  /**
   * Recalcula CH y grasa para cuadrar con las kcal objetivo,
   * dejando la proteína intacta (es un piso, nunca la variable
   * de ajuste). `fatShare` = fracción de las kcal no proteicas
   * que van a grasa.
   */
  rebalance(kcal, protein_g, fatShare = 0.35) {
    const p = Math.max(0, protein_g);
    const remaining = Math.max(0, kcal - p * KCAL_PER_G.protein);
    const fatKcal = remaining * fatShare;
    return {
      kcal,
      protein_g: p,
      fat_g:   Math.round(fatKcal / KCAL_PER_G.fat),
      carbs_g: Math.round((remaining - fatKcal) / KCAL_PER_G.carbs),
    };
  },

  /** Grasa saturada máxima del día, derivada del target de grasa. */
  satFatLimitG(t) {
    return +(((t || this.targets()).fat_g) * HEALTH_RULES.sat_fat_max_pct_of_fat).toFixed(1);
  },
};

if (typeof window !== 'undefined') {
  window.NutritionConfig = NutritionConfig;
  window.HEALTH_RULES = HEALTH_RULES;
  window.NUTRITION_PROFILE = NUTRITION_PROFILE;
  window.DAILY_TARGETS_DEFAULT = DAILY_TARGETS_DEFAULT;
  window.DAY_TYPE_TARGETS_ENABLED = DAY_TYPE_TARGETS_ENABLED;
  window.KCAL_PER_G = KCAL_PER_G;
}
