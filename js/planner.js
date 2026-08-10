// ============================================================
// PLANNER.JS — Motor de cálculo y recomendación
// ------------------------------------------------------------
// "¿Qué me falta para cerrar el día?" es la función central
// (Planner.suggestForMeal). Todo se mide contra los targets
// fijos de NutritionConfig; nada depende del tipo de día.
// ============================================================

// Reparto orientativo de las kcal del día entre comidas.
// Se usa solo para repartir lo que QUEDA entre las comidas que
// faltan, no como target rígido por comida.
const MEAL_WEIGHTS = {
  desayuno: 0.25,
  almuerzo: 0.35,
  snack:    0.12,
  cena:     0.28,
};

// La vista de log usa 'snacks' (plural) desde la primera versión
// de la app; las recetas usan 'snack'. Puente entre ambos.
const MEAL_KEY_ALIASES = { snacks: 'snack', snack: 'snacks' };

const Planner = {

  // ==========================================================
  // TOTALES Y RESTANTE
  // ==========================================================

  /** Suma de todo lo registrado en un día. */
  dayTotals(fecha) {
    const log = Store.getNutritionLog(fecha);
    return (log.entries || []).reduce((acc, e) => ({
      kcal:  acc.kcal  + (e.kcal  || 0),
      prot:  acc.prot  + (e.prot  || 0),
      carbs: acc.carbs + (e.carbs || 0),
      fat:   acc.fat   + (e.fat   || 0),
      sat:   acc.sat   + (e.sat   || 0),
      fiber: acc.fiber + (e.fiber || 0),
    }), { kcal: 0, prot: 0, carbs: 0, fat: 0, sat: 0, fiber: 0 });
  },

  /** Lo que falta para llegar a los targets (puede ser negativo). */
  remaining(fecha) {
    const t = NutritionConfig.targets();
    const totals = this.dayTotals(fecha);
    return {
      kcal:  t.kcal      - totals.kcal,
      prot:  t.protein_g - totals.prot,
      carbs: t.carbs_g   - totals.carbs,
      fat:   t.fat_g     - totals.fat,
    };
  },

  /** Comidas del día que aún no tienen nada registrado. */
  mealsLogged(fecha) {
    const log = Store.getNutritionLog(fecha);
    const logged = new Set();
    for (const e of (log.entries || [])) {
      const key = e.meal === 'snacks' ? 'snack' : e.meal;
      logged.add(key);
    }
    return logged;
  },

  pendingMeals(fecha) {
    const logged = this.mealsLogged(fecha);
    return MEAL_TYPES.map(m => m.key).filter(k => !logged.has(k));
  },

  /**
   * Cuánto "le toca" a una comida del restante del día.
   * Si es la última comida pendiente, le toca todo lo que queda.
   */
  shareForMeal(fecha, mealType) {
    const mealKey = mealType === 'snacks' ? 'snack' : mealType;
    const rem = this.remaining(fecha);
    const pending = this.pendingMeals(fecha);
    const pool = pending.indexOf(mealKey) >= 0 ? pending : pending.concat([mealKey]);
    const totalWeight = pool.reduce((s, k) => s + (MEAL_WEIGHTS[k] || 0.25), 0) || 1;
    const share = (MEAL_WEIGHTS[mealKey] || 0.25) / totalWeight;
    return {
      kcal:  rem.kcal  * share,
      prot:  rem.prot  * share,
      carbs: rem.carbs * share,
      fat:   rem.fat   * share,
      isLastMeal: pool.length === 1,
      share,
    };
  },

  // ==========================================================
  // ALERTAS DE SALUD
  // ==========================================================

  /**
   * Reglas de §4 del spec. `closed` = el día ya está cerrado
   * (fecha pasada); en el día en curso las alertas de mínimos
   * se muestran como aviso de "vas corto", no como fallo.
   */
  alerts(fecha) {
    const t = NutritionConfig.targets();
    const totals = this.dayTotals(fecha);
    const todayStr = new Date().toISOString().split('T')[0];
    const closed = fecha < todayStr;
    const out = [];

    // Grasa saturada > 20% del total de grasa diaria
    const satLimit = NutritionConfig.satFatLimitG(t);
    if (totals.sat > satLimit) {
      out.push({
        level: 'warning',
        icon: '🧈',
        title: 'Grasa saturada alta',
        detail: `${totals.sat.toFixed(1)}g de ${satLimit}g (20% del objetivo de grasa).`,
      });
    }

    // Subconsumo: el riesgo documentado
    if (totals.kcal > 0 && totals.kcal < HEALTH_RULES.kcal_min) {
      out.push({
        level: closed ? 'danger' : 'info',
        icon: '⚠️',
        title: closed ? 'Día por debajo de 1500 kcal' : `Te faltan ${Math.round(HEALTH_RULES.kcal_min - totals.kcal)} kcal para el mínimo`,
        detail: closed
          ? `${Math.round(totals.kcal)} kcal. El riesgo aquí es comer de menos.`
          : `Mínimo diario ${HEALTH_RULES.kcal_min} kcal.`,
      });
    }

    // Piso de proteína
    if (totals.prot < HEALTH_RULES.protein_min_g) {
      const falta = HEALTH_RULES.protein_min_g - totals.prot;
      out.push({
        level: closed ? 'danger' : 'info',
        icon: '🥩',
        title: closed ? 'Proteína por debajo del piso' : `Faltan ${Math.round(falta)}g de proteína`,
        detail: `${Math.round(totals.prot)}g de ${HEALTH_RULES.protein_min_g}g.`,
      });
    }

    return out;
  },

  // ==========================================================
  // DENSIDAD NUTRICIONAL (story #11)
  // ==========================================================

  /**
   * Densidad proteica de una receta: g de proteína por kcal.
   * Criterio de RANKING, nunca filtro: una receta densa en kcal
   * puntúa peor pero sigue disponible.
   */
  recipeProteinDensity(recipe) {
    const m = recipe.total_macros || Recipes.computeMacros(recipe);
    if (!m.kcal) return 0;
    return m.prot / m.kcal;
  },

  /**
   * Ingredientes sueltos para tapar el hueco que queda, con la
   * cantidad exacta en gramos. Se ordenan por densidad proteica:
   * primero lo que aporta proteína sin cargar de kcal.
   */
  suggestIngredientsToClose(fecha, limit = 3) {
    const rem = this.remaining(fecha);
    if (rem.prot <= 3) return [];

    const satLeft = Math.max(0, NutritionConfig.satFatLimitG() - this.dayTotals(fecha).sat);

    const trained = this.trainedOn(fecha);

    return FoodDB.all()
      .filter(f => f.kcal100 > 0 && f.prot100 >= 10)
      // La Evolate whey solo se propone los días de entreno
      .filter(f => !FoodDB.hasTag(f, 'post_entreno') || trained)
      // La Garden of Life es para recetas, no para comerla suelta
      .filter(f => !FoodDB.hasTag(f, 'solo_recetas'))
      .map(f => {
        // Gramos necesarios para cerrar la proteína que falta,
        // redondeados a 5g y con un tope de ración razonable.
        const raw = (rem.prot / f.prot100) * 100;
        const grams = Math.min(400, Math.max(15, Math.round(raw / 5) * 5));
        const m = FoodDB.macrosFor(f, grams);
        return { food: f, grams, macros: m, density: FoodDB.proteinDensity(f) };
      })
      // Que quepa en las kcal y en el margen de saturadas que queda
      .filter(x => rem.kcal <= 0 ? false : x.macros.kcal <= rem.kcal * 1.1 && x.macros.sat <= satLeft + 0.5)
      .sort((a, b) => b.density - a.density)
      .slice(0, limit);
  },

  /**
   * Ingredientes ordenados por densidad proteica — para sugerir
   * "con qué cierro" cuando falta proteína.
   */
  rankIngredientsByDensity(limit = 12, opts = {}) {
    const minProt = opts.minProt100 != null ? opts.minProt100 : 8;
    return FoodDB.all()
      .filter(f => f.kcal100 > 0 && f.prot100 >= minProt)
      .map(f => ({ food: f, density: FoodDB.proteinDensity(f) }))
      .sort((a, b) => b.density - a.density)
      .slice(0, limit);
  },

  // ==========================================================
  // AJUSTE DE PORCIÓN
  // ==========================================================

  /**
   * Factor por el que escalar una receta para acercarse al hueco.
   * Prioriza cuadrar proteína y kcal; se limita a un rango
   * razonable para no proponer porciones absurdas.
   */
  fitFactor(recipe, target) {
    const m = recipe.total_macros || Recipes.computeMacros(recipe);
    const fProt = (m.prot > 0 && target.prot > 0) ? target.prot / m.prot : null;
    const fKcal = (m.kcal > 0 && target.kcal > 0) ? target.kcal / m.kcal : null;
    if (fProt == null && fKcal == null) return 1;
    if (fProt == null) return this.clampFactor(fKcal);
    if (fKcal == null) return this.clampFactor(fProt);

    // Si cuadrando las kcal ya se cubre la proteína, mandan las kcal.
    // Si no, la proteína es el piso — pero sin dispararse de kcal.
    const factor = fKcal >= fProt ? fKcal : Math.min(fProt, fKcal * 1.15);
    return this.clampFactor(factor);
  },

  clampFactor(f) {
    return Math.max(0.6, Math.min(1.6, Math.round(f * 20) / 20));
  },

  /** Receta escalada: cantidades redondeadas a 5g/ml. */
  scaleRecipe(recipe, factor) {
    if (!factor || factor === 1) return recipe;
    const scaled = Object.assign({}, recipe, {
      ingredients: (recipe.ingredients || []).map(i => ({
        ingredient_id: i.ingredient_id,
        amount_g: Math.max(1, Math.round((i.amount_g * factor) / 5) * 5),
      })),
    });
    scaled.total_macros = Recipes.computeMacros(scaled);
    scaled._scaled_from = factor;
    return scaled;
  },

  // ==========================================================
  // SUGERENCIA: ¿QUÉ COMO PARA CERRAR EL DÍA? (story #6)
  // ==========================================================

  /**
   * Puntúa una receta contra un hueco de macros.
   * Devuelve { score 0-100, reasons[], warnings[] }.
   */
  scoreRecipe(recipe, target, ctx = {}) {
    const m = recipe.total_macros || Recipes.computeMacros(recipe);
    const reasons = [];
    const warnings = [];

    // --- Proteína: es un piso. Quedarse corto penaliza mucho;
    //     pasarse no penaliza apenas.
    let protScore;
    if (target.prot <= 0) {
      protScore = m.prot <= 5 ? 100 : Math.max(0, 100 - (m.prot - 5) * 1.5);
    } else {
      const ratio = m.prot / target.prot;
      protScore = ratio >= 1
        ? Math.max(60, 100 - (ratio - 1) * 25)
        : Math.max(0, 100 - (1 - ratio) * 110);
      if (ratio >= 0.85 && ratio <= 1.25) reasons.push('cuadra la proteína que falta');
    }

    // --- kcal: desviarse en cualquier dirección es malo, pero
    //     pasarse pesa algo más.
    let kcalScore;
    if (target.kcal <= 0) {
      kcalScore = m.kcal <= 120 ? 80 : Math.max(0, 80 - (m.kcal - 120) / 6);
      if (m.kcal > 120) warnings.push('ya has llegado a las kcal del día');
    } else {
      const diff = m.kcal - target.kcal;
      const rel = Math.abs(diff) / Math.max(target.kcal, 120);
      kcalScore = Math.max(0, 100 - rel * (diff > 0 ? 95 : 70));
      if (rel <= 0.12) reasons.push('encaja en las kcal restantes');
    }

    // --- Grasa saturada: control de colesterol.
    // El presupuesto se reparte con las comidas que faltan, para que
    // una sola comida no se coma todo el margen del día.
    const satLeft = Math.max(0, NutritionConfig.satFatLimitG() - (ctx.satSoFar || 0));
    const satBudget = satLeft * (ctx.satShare != null ? ctx.satShare : 1);
    let satScore = 100;
    if (m.sat > satBudget) {
      satScore = Math.max(0, 100 - ((m.sat - satBudget) / Math.max(satBudget, 3)) * 60);
      warnings.push(`aporta ${m.sat.toFixed(1)}g de saturadas (quedan ${satBudget.toFixed(1)}g)`);
    }

    // --- Grasa total.
    let fatScore = 100;
    if (target.fat > 0 && m.fat > target.fat * 1.35) {
      fatScore = Math.max(30, 100 - ((m.fat - target.fat) / target.fat) * 55);
    }

    // --- Carbohidratos: la variable más flexible.
    let carbScore = 100;
    if (target.carbs > 0) {
      const rel = Math.abs(m.carbs - target.carbs) / Math.max(target.carbs, 25);
      carbScore = Math.max(35, 100 - rel * 45);
    }

    let score =
      protScore * 0.34 +
      kcalScore * 0.28 +
      satScore  * 0.14 +
      fatScore  * 0.12 +
      carbScore * 0.12;

    // --- Bonus: densidad proteica (story #11).
    const density = this.recipeProteinDensity(recipe);
    if (density >= 0.09) { score += 6; reasons.push('alta proteína por caloría'); }
    else if (density >= 0.06) { score += 3; }
    else if (density < 0.03 && m.kcal > 250) {
      score -= 5;
      warnings.push('muchas kcal para poca proteína');
    }

    // --- Bonus: grasas insaturadas / pescado azul cuando hay
    //     margen de grasa en el día (§4).
    const fatMargin = ctx.fatRemaining != null ? ctx.fatRemaining : target.fat;
    if (fatMargin >= HEALTH_RULES.fat_margin_g_for_healthy_fats) {
      if (Recipes.hasTag(recipe, 'pescado_azul') || this.hasHealthyFats(recipe)) {
        score += 7;
        reasons.push('grasas insaturadas / pescado azul y hay margen de grasa');
      }
    }

    // --- Bonus: recetas que ya usa habitualmente (story #8).
    if (Recipes.isHabitual(recipe)) { score += 4; reasons.push('la haces a menudo'); }

    // --- Penalización por repetición: crece con cada repetición
    //     para que el menú no degenere en el mismo ciclo de días.
    if (ctx.recentlyUsed) {
      const repeats = ctx.recentlyUsed.filter(id => id === recipe.id).length;
      if (repeats) score -= 14 + (repeats - 1) * 12;
    }

    return {
      // `score` se muestra acotado 0-100; `raw` conserva la señal
      // completa para ordenar sin que se empaten todos en 100.
      score: Math.max(0, Math.min(100, Math.round(score))),
      raw: score,
      reasons,
      warnings,
    };
  },

  /** ¿Entrenó ese día? (para el batido post-entreno) */
  trainedOn(fecha) {
    return Store.getWorkouts().some(w => w.completado && w.fecha === fecha);
  },

  /**
   * La Evolate whey es solo post-entreno: las recetas marcadas como
   * post_entreno únicamente se proponen los días que hay entreno.
   */
  postWorkoutAllowed(recipe, fecha) {
    if (!Recipes.hasTag(recipe, 'post_entreno')) return true;
    return this.trainedOn(fecha);
  },

  hasHealthyFats(recipe) {
    return (recipe.ingredients || []).some(i => {
      const f = FoodDB.byId(i.ingredient_id);
      return FoodDB.hasTag(f, 'pescado_azul') || FoodDB.hasTag(f, 'grasa_insaturada');
    });
  },

  /**
   * LA función: qué comer en `mealType` para cerrar el día.
   * Devuelve sugerencias ordenadas, cada una con la porción ya
   * ajustada al hueco real.
   */
  suggestForMeal(mealType, fecha, opts = {}) {
    const mealKey = mealType === 'snacks' ? 'snack' : mealType;
    const limit = opts.limit || 5;
    const target = this.shareForMeal(fecha, mealKey);
    const totals = this.dayTotals(fecha);
    const rem = this.remaining(fecha);
    const ctx = {
      satSoFar: totals.sat,
      fatRemaining: rem.fat,
      satShare: target.share,
      recentlyUsed: opts.recentlyUsed || this.recentlyUsedRecipeIds(fecha, 3),
    };

    const candidates = Recipes.byMealType(mealKey)
      .filter(r => !Recipes.violatesProfile(r, mealKey))
      .filter(r => this.postWorkoutAllowed(r, fecha));

    const scored = candidates.map(recipe => {
      // Primero ajustamos la porción al hueco, luego puntuamos
      // la versión ajustada: es lo que realmente se va a comer.
      const factor = opts.allowScaling === false ? 1 : this.fitFactor(recipe, target);
      const adjusted = this.scaleRecipe(recipe, factor);
      const result = this.scoreRecipe(adjusted, target, ctx);
      return {
        recipe,
        adjusted,
        factor,
        macros: adjusted.total_macros,
        score: result.score,
        raw: result.raw,
        reasons: result.reasons,
        warnings: result.warnings,
      };
    });

    scored.sort((a, b) => b.raw - a.raw);

    // `fit` es el encaje relativo al mejor candidato: con los bonus,
    // varias opciones saturan en 100 y dejarían de distinguirse.
    const best = scored.length ? Math.max(scored[0].raw, 1) : 1;
    for (const s of scored) s.fit = Math.max(1, Math.round((s.raw / best) * 100));

    return {
      target,
      remaining: rem,
      suggestions: scored.slice(0, limit),
    };
  },

  /** Recetas usadas en los últimos N días (para no repetir). */
  recentlyUsedRecipeIds(fecha, days = 3) {
    const ids = [];
    const base = new Date(fecha + 'T12:00:00');
    for (let i = 1; i <= days; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() - i);
      const log = Store.getNutritionLog(d.toISOString().split('T')[0]);
      for (const e of (log.entries || [])) {
        if (e.recipe_id) ids.push(e.recipe_id);
      }
    }
    return ids;
  },

  // ==========================================================
  // MENÚ SEMANAL (story #7)
  // ==========================================================

  /** Lunes de la semana que contiene `date` (YYYY-MM-DD). */
  weekStartOf(date) {
    const [y, m, d] = (date || new Date().toISOString().split('T')[0]).split('-').map(Number);
    const ms = Date.UTC(y, m - 1, d);
    const dow = new Date(ms).getUTCDay();
    const monday = new Date(ms + (dow === 0 ? -6 : 1 - dow) * 86400000);
    return monday.toISOString().split('T')[0];
  },

  weekDates(weekStart) {
    const [y, m, d] = weekStart.split('-').map(Number);
    const base = Date.UTC(y, m - 1, d);
    return Array.from({ length: 7 }, (_, i) =>
      new Date(base + i * 86400000).toISOString().split('T')[0]);
  },

  /**
   * Genera un menú semanal contra los targets fijos.
   * Respeta los huecos bloqueados del menú existente y evita
   * repetir la misma receta en días seguidos.
   */
  generateWeeklyMenu(weekStart, opts = {}) {
    const existing = Store.getWeeklyMenu(weekStart);
    const targets = NutritionConfig.targets();
    const dates = this.weekDates(weekStart);
    const mealKeys = MEAL_TYPES.map(m => m.key);
    const usageWindow = opts.noRepeatDays != null ? opts.noRepeatDays : 2;
    const history = [];   // [{date, recipeId}]

    const days = dates.map(date => {
      const prevDay = existing && existing.days.find(d => d.date === date);
      const slots = [];
      // Restante del día que vamos consumiendo comida a comida
      let left = {
        kcal: targets.kcal,
        prot: targets.protein_g,
        carbs: targets.carbs_g,
        fat: targets.fat_g,
      };
      let satSoFar = 0;

      for (const mealKey of mealKeys) {
        const prevSlot = prevDay && prevDay.meal_slots.find(s => s.meal_type === mealKey);

        // Hueco bloqueado: se respeta tal cual
        if (prevSlot && prevSlot.is_locked && prevSlot.recipe_id) {
          const locked = Recipes.get(prevSlot.recipe_id);
          if (locked) {
            const factor = prevSlot.factor || 1;
            const m = this.scaleRecipe(locked, factor).total_macros;
            left = this.subtractMacros(left, m);
            satSoFar += m.sat || 0;
            slots.push({ meal_type: mealKey, recipe_id: locked.id, factor, is_locked: true });
            history.push({ date, recipeId: locked.id });
            continue;
          }
        }

        // Reparto de lo que queda entre las comidas que faltan
        const pendingKeys = mealKeys.slice(mealKeys.indexOf(mealKey));
        const totalWeight = pendingKeys.reduce((s, k) => s + MEAL_WEIGHTS[k], 0);
        const share = MEAL_WEIGHTS[mealKey] / totalWeight;
        const slotTarget = {
          kcal:  left.kcal  * share,
          prot:  left.prot  * share,
          carbs: left.carbs * share,
          fat:   left.fat   * share,
        };

        // Repeticiones recientes + las de toda la semana, para que
        // no salga siempre el mismo desayuno.
        const recentIds = history
          .filter(h => this.daysBetween(h.date, date) <= usageWindow)
          .map(h => h.recipeId)
          .concat(history.map(h => h.recipeId));

        const pool = Recipes.byMealType(mealKey)
          .filter(r => !Recipes.violatesProfile(r, mealKey))
          .filter(r => this.postWorkoutAllowed(r, date));
        if (!pool.length) {
          slots.push({ meal_type: mealKey, recipe_id: null, factor: 1, is_locked: false });
          continue;
        }

        // Igual que al sugerir: se ajusta la porción al hueco y se
        // puntúa lo que realmente se va a comer. Sin esto el menú
        // se queda muy por debajo de las kcal objetivo.
        const ranked = pool.map(recipe => {
          const factor = this.fitFactor(recipe, slotTarget);
          const adjusted = this.scaleRecipe(recipe, factor);
          const res = this.scoreRecipe(adjusted, slotTarget, {
            satSoFar,
            fatRemaining: left.fat,
            satShare: share,
            recentlyUsed: recentIds,
          });
          return { recipe, factor, adjusted, raw: res.raw };
        }).sort((a, b) => b.raw - a.raw);

        const best = ranked[0];
        const m = best.adjusted.total_macros;
        left = this.subtractMacros(left, m);
        satSoFar += m.sat || 0;
        slots.push({ meal_type: mealKey, recipe_id: best.recipe.id, factor: best.factor, is_locked: false });
        history.push({ date, recipeId: best.recipe.id });
      }

      return { date, meal_slots: slots };
    });

    const menu = { week_start: weekStart, days, generated_at: new Date().toISOString() };
    Store.saveWeeklyMenu(menu);
    return menu;
  },

  subtractMacros(left, m) {
    return {
      kcal:  left.kcal  - (m.kcal  || 0),
      prot:  left.prot  - (m.prot  || 0),
      carbs: left.carbs - (m.carbs || 0),
      fat:   left.fat   - (m.fat   || 0),
    };
  },

  daysBetween(a, b) {
    const [ay, am, ad] = a.split('-').map(Number);
    const [by, bm, bd] = b.split('-').map(Number);
    return Math.abs(Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000;
  },

  /** Receta de un hueco del menú, ya con su porción ajustada. */
  slotRecipe(slot) {
    if (!slot || !slot.recipe_id) return null;
    const r = Recipes.get(slot.recipe_id);
    if (!r) return null;
    return (slot.factor && slot.factor !== 1) ? this.scaleRecipe(r, slot.factor) : r;
  },

  /** Totales de un día del menú, para contrastar con los targets. */
  menuDayTotals(day) {
    const totals = { kcal: 0, prot: 0, carbs: 0, fat: 0, sat: 0, fiber: 0 };
    for (const slot of (day.meal_slots || [])) {
      const r = this.slotRecipe(slot);
      if (!r) continue;
      const m = r.total_macros;
      totals.kcal  += m.kcal  || 0;
      totals.prot  += m.prot  || 0;
      totals.carbs += m.carbs || 0;
      totals.fat   += m.fat   || 0;
      totals.sat   += m.sat   || 0;
      totals.fiber += m.fiber || 0;
    }
    return totals;
  },

  /**
   * Cambia la receta de un hueco (swap manual) y reajusta su
   * porción a lo que le queda al día con las demás comidas puestas.
   */
  setMenuSlot(weekStart, date, mealType, recipeId) {
    const menu = Store.getWeeklyMenu(weekStart);
    if (!menu) return null;
    const day = menu.days.find(d => d.date === date);
    if (!day) return null;

    const recipe = Recipes.get(recipeId);
    const factor = recipe ? this.fitFactor(recipe, this.slotGap(day, mealType)) : 1;

    const slot = day.meal_slots.find(s => s.meal_type === mealType);
    if (slot) { slot.recipe_id = recipeId; slot.factor = factor; }
    else day.meal_slots.push({ meal_type: mealType, recipe_id: recipeId, factor, is_locked: false });
    Store.saveWeeklyMenu(menu);
    return menu;
  },

  /** Hueco de macros que le queda a una comida dentro de su día. */
  slotGap(day, mealType) {
    const t = NutritionConfig.targets();
    const others = { kcal: 0, prot: 0, carbs: 0, fat: 0 };
    for (const slot of (day.meal_slots || [])) {
      if (slot.meal_type === mealType) continue;
      const r = this.slotRecipe(slot);
      if (!r) continue;
      others.kcal  += r.total_macros.kcal  || 0;
      others.prot  += r.total_macros.prot  || 0;
      others.carbs += r.total_macros.carbs || 0;
      others.fat   += r.total_macros.fat   || 0;
    }
    return {
      kcal:  Math.max(0, t.kcal      - others.kcal),
      prot:  Math.max(0, t.protein_g - others.prot),
      carbs: Math.max(0, t.carbs_g   - others.carbs),
      fat:   Math.max(0, t.fat_g     - others.fat),
    };
  },

  toggleMenuLock(weekStart, date, mealType) {
    const menu = Store.getWeeklyMenu(weekStart);
    if (!menu) return null;
    const day = menu.days.find(d => d.date === date);
    if (!day) return null;
    const slot = day.meal_slots.find(s => s.meal_type === mealType);
    if (slot) slot.is_locked = !slot.is_locked;
    Store.saveWeeklyMenu(menu);
    return menu;
  },

  /** Intercambia dos huecos (drag/swap del menú). */
  swapMenuSlots(weekStart, a, b) {
    const menu = Store.getWeeklyMenu(weekStart);
    if (!menu) return null;
    const dayA = menu.days.find(d => d.date === a.date);
    const dayB = menu.days.find(d => d.date === b.date);
    if (!dayA || !dayB) return null;
    const slotA = dayA.meal_slots.find(s => s.meal_type === a.meal_type);
    const slotB = dayB.meal_slots.find(s => s.meal_type === b.meal_type);
    if (!slotA || !slotB) return null;
    const tmp = slotA.recipe_id;
    slotA.recipe_id = slotB.recipe_id;
    slotB.recipe_id = tmp;
    Store.saveWeeklyMenu(menu);
    return menu;
  },

  // ==========================================================
  // LISTA DE LA COMPRA (story #10)
  // ==========================================================

  /**
   * Agrega los ingredientes del menú y resta lo que ya hay en
   * casa. Devuelve las líneas agrupadas por categoría.
   */
  shoppingList(menu, opts = {}) {
    if (!menu) return { groups: [], totalItems: 0 };
    const needed = {};

    for (const day of menu.days) {
      if (opts.fromDate && day.date < opts.fromDate) continue;
      for (const slot of (day.meal_slots || [])) {
        const recipe = this.slotRecipe(slot);
        if (!recipe) continue;
        for (const ing of (recipe.ingredients || [])) {
          needed[ing.ingredient_id] = (needed[ing.ingredient_id] || 0) + ing.amount_g;
        }
      }
    }

    const lines = [];
    for (const [ingredientId, amount] of Object.entries(needed)) {
      const food = FoodDB.byId(ingredientId);
      if (!food) continue;
      const inPantry = Store.getPantryQty(ingredientId);
      const toBuy = Math.max(0, amount - inPantry);
      lines.push({
        ingredient_id: ingredientId,
        nombre: food.nombre,
        cat: food.cat || 'Otros',
        unit: food.unit || 'g',
        needed: Math.round(amount),
        in_pantry: Math.round(inPantry),
        to_buy: Math.round(toBuy),
      });
    }

    const pending = lines.filter(l => l.to_buy > 0);
    const groupsMap = {};
    for (const line of pending) {
      (groupsMap[line.cat] = groupsMap[line.cat] || []).push(line);
    }
    const groups = Object.entries(groupsMap)
      .map(([cat, items]) => ({
        cat,
        items: items.sort((a, b) => a.nombre.localeCompare(b.nombre)),
      }))
      .sort((a, b) => a.cat.localeCompare(b.cat));

    return {
      groups,
      totalItems: pending.length,
      covered: lines.filter(l => l.to_buy === 0).length,
      allLines: lines,
    };
  },

  // ==========================================================
  // RECETAS A PARTIR DE LA DESPENSA (story #9)
  // ==========================================================

  /**
   * Recetas ordenadas por cobertura de la despensa: cuántos de
   * sus ingredientes ya tienes en casa (y en cantidad suficiente).
   */
  recipesFromPantry(opts = {}) {
    const pantryIds = new Set(Store.getPantry().map(p => p.ingredient_id));
    if (!pantryIds.size) return [];
    const minCoverage = opts.minCoverage != null ? opts.minCoverage : 0.5;

    return Recipes.all()
      .map(recipe => {
        const ings = recipe.ingredients || [];
        if (!ings.length) return null;
        const have = ings.filter(i => pantryIds.has(i.ingredient_id));
        const enough = have.filter(i => Store.getPantryQty(i.ingredient_id) >= i.amount_g);
        const missing = ings
          .filter(i => !pantryIds.has(i.ingredient_id))
          .map(i => {
            const f = FoodDB.byId(i.ingredient_id);
            return { ingredient_id: i.ingredient_id, nombre: f ? f.nombre : i.ingredient_id, amount_g: i.amount_g };
          });
        return {
          recipe,
          coverage: have.length / ings.length,
          fullyStocked: enough.length === ings.length,
          missing,
        };
      })
      .filter(r => r && r.coverage >= minCoverage)
      .sort((a, b) => b.coverage - a.coverage || b.recipe.total_macros.prot - a.recipe.total_macros.prot);
  },

  /** Descuenta de la despensa lo que consume una receta. */
  consumeFromPantry(recipe) {
    for (const ing of (recipe.ingredients || [])) {
      const current = Store.getPantryQty(ing.ingredient_id);
      if (current <= 0) continue;
      Store.savePantryItem({
        ingredient_id: ing.ingredient_id,
        estimated_quantity: Math.max(0, current - ing.amount_g),
      });
    }
  },
};

if (typeof window !== 'undefined') {
  window.Planner = Planner;
  window.MEAL_WEIGHTS = MEAL_WEIGHTS;
  window.MEAL_KEY_ALIASES = MEAL_KEY_ALIASES;
}
