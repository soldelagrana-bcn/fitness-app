// ============================================================
// STORE.JS — Gestión de datos en localStorage
// ============================================================

const Store = {
  keys: {
    config: 'sol_fitness_config',
    workouts: 'sol_fitness_workouts',
    cargas: 'sol_fitness_cargas',
    nutrition_log: 'sol_fitness_nutrition',
    weight_log: 'sol_fitness_weight',
  },

  // ---- CONFIG (fase, semana, fecha inicio) ----
  getConfig() {
    const d = localStorage.getItem(this.keys.config);
    if (d) return JSON.parse(d);
    return {
      fase: 1,
      semana: 1,
      fecha_inicio: new Date().toISOString().split('T')[0],
      nombre: 'Sol'
    };
  },
  saveConfig(config) {
    localStorage.setItem(this.keys.config, JSON.stringify(config));
  },

  // ---- CARGAS ACTUALES ----
  getCargas() {
    const d = localStorage.getItem(this.keys.cargas);
    if (d) return JSON.parse(d);
    // Cargas iniciales de Fase 1
    return {
      'Hip thrust con mancuerna': 15,
      'Hip thrust con mancuerna (variante)': 15,
      'Goblet squat con KB': 12,
      'RDL con kettlebell': 16,
      'Remo con mancuerna': 7.5,
      'Press de hombro con mancuernas': 3,
      'Press de pecho con mancuernas': 3,
      'Curl de bíceps con mancuernas': null,
      'Extensión de tríceps sobre la cabeza': null,
      'Side plank con mancuerna + pulses': 5,
      'Zancada reversa con mancuernas': 0,
      'Step-up con mancuernas': 0,
      'Jalón al pecho agarre neutro (polea)': null,
      'Curl de bíceps en polea baja': null,
      'Press de tríceps en polea alta': null,
      'Extensión de cuádriceps en máquina': null,
    };
  },
  saveCarga(ejercicioNombre, kg) {
    const cargas = this.getCargas();
    cargas[ejercicioNombre] = kg;
    localStorage.setItem(this.keys.cargas, JSON.stringify(cargas));
  },

  // ---- HISTORIAL DE ENTRENAMIENTOS ----
  getWorkouts() {
    const d = localStorage.getItem(this.keys.workouts);
    return d ? JSON.parse(d) : [];
  },
  saveWorkout(workout) {
    const workouts = this.getWorkouts();
    const idx = workouts.findIndex(w => w.id === workout.id);
    if (idx >= 0) {
      workouts[idx] = workout;
    } else {
      workouts.push(workout);
    }
    localStorage.setItem(this.keys.workouts, JSON.stringify(workouts));
  },
  getWorkoutById(id) {
    return this.getWorkouts().find(w => w.id === id) || null;
  },
  getWorkoutsThisWeek() {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1); // Lunes
    weekStart.setHours(0, 0, 0, 0);
    return this.getWorkouts().filter(w => {
      const d = new Date(w.fecha);
      return d >= weekStart && d <= today && w.completado;
    });
  },
  getLastWorkoutForDia(diaKey) {
    const workouts = this.getWorkouts()
      .filter(w => w.dia === diaKey && w.completado)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    return workouts[0] || null;
  },

  // ---- LÓGICA DE DOBLE PROGRESIÓN ----
  // Retorna true si un ejercicio está listo para subir peso
  listoParaSubir(ejercicioNombre) {
    const workouts = this.getWorkouts().filter(w => w.completado);
    // Buscar los últimos 2 registros de este ejercicio
    const registros = [];
    for (const w of workouts.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))) {
      for (const bloque of w.bloques || []) {
        for (const ej of bloque.ejercicios || []) {
          if (ej.nombre === ejercicioNombre && ej.reps_completadas) {
            registros.push(ej);
          }
        }
      }
      if (registros.length >= 1) break;
    }
    if (registros.length === 0) return false;
    const ultimo = registros[0];
    const todasCompletas = ultimo.reps_completadas.every(
      (r, i) => r !== null && r >= (ultimo.reps_objetivo || 15)
    );
    const rir = ultimo.rir_ultimo_set;
    return todasCompletas && (rir === null || rir >= 2);
  },

  // ---- REGISTRO DE PESO CORPORAL ----
  getWeightLog() {
    const d = localStorage.getItem(this.keys.weight_log);
    return d ? JSON.parse(d) : [];
  },
  saveWeight(fecha, kg) {
    const log = this.getWeightLog();
    const idx = log.findIndex(e => e.fecha === fecha);
    if (idx >= 0) log[idx].kg = kg;
    else log.push({ fecha, kg });
    localStorage.setItem(this.keys.weight_log, JSON.stringify(log));
  },

  // ---- ACTIVIDADES EXTRA (tenis, e-bike, caminata, gym no planificado) ----
  getActividades() {
    const d = localStorage.getItem('sol_fitness_actividades');
    return d ? JSON.parse(d) : [];
  },
  saveActividad(fecha, dia, actividad) {
    const acts = this.getActividades();
    const idx = acts.findIndex(a => a.fecha === fecha && a.dia === dia);
    if (idx >= 0) acts[idx] = { fecha, dia, ...actividad };
    else acts.push({ fecha, dia, ...actividad });
    localStorage.setItem('sol_fitness_actividades', JSON.stringify(acts));
  },
  deleteActividad(fecha, dia) {
    const acts = this.getActividades().filter(a => !(a.fecha === fecha && a.dia === dia));
    localStorage.setItem('sol_fitness_actividades', JSON.stringify(acts));
  },
  getActividadDia(dia) {
    // Busca actividad para este día en la semana actual
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1);
    weekStart.setHours(0,0,0,0);
    const acts = this.getActividades().filter(a => {
      const d = new Date(a.fecha);
      return d >= weekStart && d <= today && a.dia === dia;
    });
    return acts[0] || null;
  },

  // ---- REGISTRO DE NUTRICIÓN (últimos N días) ----
  getNutritionLogs(days = 60) {
    const result = {};
    const today = new Date();
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const fecha = d.toISOString().split('T')[0];
      const raw = localStorage.getItem(`sol_nutlog_${fecha}`);
      if (raw) { try { result[fecha] = JSON.parse(raw); } catch(e) {} }
    }
    return result;
  },
  // Merge aditivo: solo añade entradas que no existen localmente (nunca borra)
  mergeNutritionLogs(remoteLogsObj) {
    if (!remoteLogsObj || typeof remoteLogsObj !== 'object') return;
    for (const [fecha, remoteLog] of Object.entries(remoteLogsObj)) {
      if (!remoteLog || !Array.isArray(remoteLog.entries)) continue;
      const local = this.getNutritionLog(fecha);
      const localIds = new Set((local.entries || []).map(e => e.id));
      const newEntries = remoteLog.entries.filter(e => e.id && !localIds.has(e.id));
      if (newEntries.length > 0) {
        this.saveNutritionLog(fecha, { entries: [...(local.entries || []), ...newEntries] });
      }
    }
  },

  // ---- RECETAS PROPIAS ----
  getRecipes() {
    const d = localStorage.getItem('sol_recipes');
    return d ? JSON.parse(d) : [];
  },
  saveRecipe(recipe) {
    const list = this.getRecipes();
    const idx = list.findIndex(r => r.id === recipe.id);
    if (idx >= 0) list[idx] = recipe; else list.push(recipe);
    localStorage.setItem('sol_recipes', JSON.stringify(list));
  },
  deleteRecipe(id) {
    const list = this.getRecipes().filter(r => r.id !== id);
    localStorage.setItem('sol_recipes', JSON.stringify(list));
  },

  // Ediciones sobre recetas semilla: se guardan aparte para no
  // perder la receta original cuando se actualiza la app.
  getRecipeOverrides() {
    const d = localStorage.getItem('sol_recipe_overrides');
    return d ? JSON.parse(d) : {};
  },
  saveRecipeOverride(id, recipe) {
    const ov = this.getRecipeOverrides();
    ov[id] = recipe;
    localStorage.setItem('sol_recipe_overrides', JSON.stringify(ov));
  },
  getDeletedSeedRecipes() {
    const d = localStorage.getItem('sol_recipes_deleted');
    return d ? JSON.parse(d) : [];
  },
  deleteSeedRecipe(id) {
    const del = this.getDeletedSeedRecipes();
    if (del.indexOf(id) < 0) del.push(id);
    localStorage.setItem('sol_recipes_deleted', JSON.stringify(del));
  },

  // ---- USO DE RECETAS (para priorizar las habituales) ----
  getRecipeUsage() {
    const d = localStorage.getItem('sol_recipe_usage');
    return d ? JSON.parse(d) : {};
  },
  bumpRecipeUsage(id) {
    const usage = this.getRecipeUsage();
    usage[id] = (usage[id] || 0) + 1;
    localStorage.setItem('sol_recipe_usage', JSON.stringify(usage));
  },

  // ---- DESPENSA ----
  // { ingredient_id, estimated_quantity (g/ml), last_purchased, habitual }
  getPantry() {
    const d = localStorage.getItem('sol_pantry');
    return d ? JSON.parse(d) : [];
  },
  savePantryItem(item) {
    const list = this.getPantry();
    const idx = list.findIndex(p => p.ingredient_id === item.ingredient_id);
    if (idx >= 0) list[idx] = Object.assign(list[idx], item);
    else list.push(item);
    localStorage.setItem('sol_pantry', JSON.stringify(list));
  },
  removePantryItem(ingredientId) {
    const list = this.getPantry().filter(p => p.ingredient_id !== ingredientId);
    localStorage.setItem('sol_pantry', JSON.stringify(list));
  },
  getPantryQty(ingredientId) {
    const item = this.getPantry().find(p => p.ingredient_id === ingredientId);
    return item ? (item.estimated_quantity || 0) : 0;
  },

  // ---- MENÚ SEMANAL ----
  getWeeklyMenu(weekStart) {
    const d = localStorage.getItem(`sol_menu_${weekStart}`);
    return d ? JSON.parse(d) : null;
  },
  saveWeeklyMenu(menu) {
    localStorage.setItem(`sol_menu_${menu.week_start}`, JSON.stringify(menu));
  },
  getAllWeeklyMenus() {
    const result = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('sol_menu_')) {
        try { result[k.replace('sol_menu_', '')] = JSON.parse(localStorage.getItem(k)); } catch (e) {}
      }
    }
    return result;
  },

  // ---- LISTA DE LA COMPRA (items marcados como comprados) ----
  getShoppingChecked(weekStart) {
    const d = localStorage.getItem(`sol_shopping_${weekStart}`);
    return d ? JSON.parse(d) : [];
  },
  toggleShoppingChecked(weekStart, ingredientId) {
    const checked = this.getShoppingChecked(weekStart);
    const idx = checked.indexOf(ingredientId);
    if (idx >= 0) checked.splice(idx, 1); else checked.push(ingredientId);
    localStorage.setItem(`sol_shopping_${weekStart}`, JSON.stringify(checked));
    return checked;
  },

  // ---- EXPORT / IMPORT ----
  exportAll() {
    return JSON.stringify({
      config: this.getConfig(),
      workouts: this.getWorkouts(),
      cargas: this.getCargas(),
      weight_log: this.getWeightLog(),
      nutrition: this.getNutritionLogs(60),
      targets: (typeof NutritionConfig !== 'undefined') ? NutritionConfig.targets() : null,
      recipes: this.getRecipes(),
      recipe_overrides: this.getRecipeOverrides(),
      recipes_deleted: this.getDeletedSeedRecipes(),
      recipe_usage: this.getRecipeUsage(),
      pantry: this.getPantry(),
      menus: this.getAllWeeklyMenus(),
      exported_at: new Date().toISOString()
    }, null, 2);
  },
  // importAll solo actualiza workouts y weight_log (config y cargas siempre locales)
  importAll(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (data.workouts) localStorage.setItem(this.keys.workouts, JSON.stringify(data.workouts));
      if (data.weight_log) localStorage.setItem(this.keys.weight_log, JSON.stringify(data.weight_log));
      if (data.nutrition) this.mergeNutritionLogs(data.nutrition);
      if (data.targets && typeof NutritionConfig !== 'undefined') NutritionConfig.saveTargets(data.targets);
      if (Array.isArray(data.recipes)) this.mergeRecipes(data.recipes);
      if (data.recipe_overrides) {
        localStorage.setItem('sol_recipe_overrides',
          JSON.stringify(Object.assign(this.getRecipeOverrides(), data.recipe_overrides)));
      }
      if (Array.isArray(data.recipes_deleted)) {
        const merged = Array.from(new Set(this.getDeletedSeedRecipes().concat(data.recipes_deleted)));
        localStorage.setItem('sol_recipes_deleted', JSON.stringify(merged));
      }
      if (data.recipe_usage) {
        const local = this.getRecipeUsage();
        for (const [id, n] of Object.entries(data.recipe_usage)) {
          local[id] = Math.max(local[id] || 0, n);
        }
        localStorage.setItem('sol_recipe_usage', JSON.stringify(local));
      }
      if (Array.isArray(data.pantry)) this.mergePantry(data.pantry);
      if (data.menus) {
        for (const [week, menu] of Object.entries(data.menus)) {
          if (menu && menu.week_start) this.saveWeeklyMenu(menu);
        }
      }
      return true;
    } catch (e) {
      return false;
    }
  },

  // Merge aditivo de recetas: nunca borra las locales
  mergeRecipes(remoteRecipes) {
    const local = this.getRecipes();
    const byId = {};
    for (const r of local) byId[r.id] = r;
    for (const r of remoteRecipes) {
      if (r && r.id && !byId[r.id]) byId[r.id] = r;
    }
    localStorage.setItem('sol_recipes', JSON.stringify(Object.values(byId)));
  },

  // Merge de despensa: gana la compra más reciente
  mergePantry(remotePantry) {
    const local = this.getPantry();
    const byId = {};
    for (const p of local) byId[p.ingredient_id] = p;
    for (const p of remotePantry) {
      if (!p || !p.ingredient_id) continue;
      const existing = byId[p.ingredient_id];
      if (!existing || (p.last_purchased || '') > (existing.last_purchased || '')) {
        byId[p.ingredient_id] = p;
      }
    }
    localStorage.setItem('sol_pantry', JSON.stringify(Object.values(byId)));
  },

  // ---- GENERAR WORKOUT DE HOY ----
  createTodayWorkout() {
    const today = new Date();
    const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const diaKey = dias[today.getDay()];
    const config = this.getConfig();
    const fase = FASES[config.fase];
    if (!fase) return null;
    const sesion = fase.sesiones[diaKey];
    if (!sesion) return null;

    const cargas = this.getCargas();
    const id = `workout_${today.toISOString().split('T')[0]}_${diaKey}`;

    // Check si ya existe
    const existing = this.getWorkoutById(id);
    if (existing) return existing;

    // Clonar sesión con cargas actuales
    const workout = {
      id,
      fase: config.fase,
      semana: config.semana,
      dia: diaKey,
      tipo: sesion.nombre,
      fecha: today.toISOString().split('T')[0],
      completado: false,
      duracion_min: null,
      bloque_actual: 0,
      ejercicio_actual: 0,
      bloques: sesion.bloques.map(bloque => ({
        ...bloque,
        ejercicios: bloque.ejercicios.map(ej => ({
          ...ej,
          carga_kg: cargas[ej.nombre] !== undefined ? cargas[ej.nombre] : ej.carga_inicial_kg,
          reps_completadas: Array(ej.series).fill(null),
          rir_ultimo_set: null,
          completado: false
        }))
      }))
    };

    this.saveWorkout(workout);
    return workout;
  },

  // ---- SEMANA ACTUAL (número 1-4) ----
  getSemanaActual() {
    // Usar Date.UTC para evitar problemas con cambio de horario (DST)
    const workouts = this.getWorkouts().filter(w => w.completado);
    let startDateStr;
    if (workouts.length > 0) {
      const dates = workouts.map(w =>
        w.fecha || ((w.id || '').match(/workout_(\d{4}-\d{2}-\d{2})/) || [])[1]
      ).filter(Boolean).sort();
      if (dates.length === 0) return 1;
      const [fy, fm, fd] = dates[0].split('-').map(Number);
      const firstMs = Date.UTC(fy, fm - 1, fd);
      const dow = new Date(firstMs).getUTCDay();
      const monMs = firstMs + (dow === 0 ? -6 : 1 - dow) * 86400000;
      const mon = new Date(monMs);
      startDateStr = `${mon.getUTCFullYear()}-${String(mon.getUTCMonth()+1).padStart(2,'0')}-${String(mon.getUTCDate()).padStart(2,'0')}`;
    } else {
      const config = this.getConfig();
      startDateStr = config.fecha_inicio;
      if (!startDateStr) return 1;
    }
    const [sy, sm, sd] = startDateStr.split('-').map(Number);
    const now = new Date();
    const diffDays = Math.round(
      (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(sy, sm - 1, sd)) / 86400000
    );
    return Math.min(Math.max(Math.floor(diffDays / 7) + 1, 1), 4);
  },

  // ---- RÉCORDS PERSONALES ----
  getPRs() {
    const d = localStorage.getItem('sol_fitness_prs');
    return d ? JSON.parse(d) : {};
  },
  checkAndSavePR(ejercicioNombre, kg) {
    if (!kg || kg <= 0) return false;
    const prs = this.getPRs();
    if (!prs[ejercicioNombre] || kg > prs[ejercicioNombre]) {
      prs[ejercicioNombre] = kg;
      localStorage.setItem('sol_fitness_prs', JSON.stringify(prs));
      return true;
    }
    return false;
  },

  // ---- RACHA SEMANAL ----
  getStreak() {
    const workouts = this.getWorkouts().filter(w => w.completado).sort((a,b) => new Date(b.fecha)-new Date(a.fecha));
    if (!workouts.length) return { current: 0, best: 0 };
    const weekMap = {};
    workouts.forEach(w => {
      const d = new Date(w.fecha);
      const weekKey = `${d.getFullYear()}-W${Math.ceil(d.getDate()/7)}`;
      weekMap[weekKey] = (weekMap[weekKey] || 0) + 1;
    });
    let current = 0;
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i * 7);
      const key = `${d.getFullYear()}-W${Math.ceil(d.getDate()/7)}`;
      if ((weekMap[key] || 0) >= 3) current++;
      else break;
    }
    const best = parseInt(localStorage.getItem('sol_best_streak') || '0');
    if (current > best) localStorage.setItem('sol_best_streak', current.toString());
    return { current, best: Math.max(current, best) };
  },

  // ---- GARMIN DATA ----
  getGarminData() {
    const d = localStorage.getItem('sol_garmin_data');
    return d ? JSON.parse(d) : null;
  },
  saveGarminData(data) {
    localStorage.setItem('sol_garmin_data', JSON.stringify(data));
  },

  // ---- MEDIDAS CORPORALES ----
  getMedidas() { return JSON.parse(localStorage.getItem('sol_medidas') || '[]'); },
  saveMedida(fecha, data) {
    const arr = this.getMedidas();
    const idx = arr.findIndex(m => m.fecha === fecha);
    if (idx >= 0) arr[idx] = { fecha, ...data };
    else arr.push({ fecha, ...data });
    localStorage.setItem('sol_medidas', JSON.stringify(arr));
  },

  // ---- REGISTRO DE NUTRICIÓN DIARIA ----
  getNutritionLog(fecha) {
    const d = localStorage.getItem(`sol_nutlog_${fecha}`);
    return d ? JSON.parse(d) : { entries: [] };
  },
  saveNutritionLog(fecha, log) {
    localStorage.setItem(`sol_nutlog_${fecha}`, JSON.stringify(log));
  },
  addNutritionEntry(fecha, entry) {
    const log = this.getNutritionLog(fecha);
    log.entries.push(entry);
    this.saveNutritionLog(fecha, log);
  },
  removeNutritionEntry(fecha, entryId) {
    const log = this.getNutritionLog(fecha);
    log.entries = log.entries.filter(e => e.id !== entryId);
    this.saveNutritionLog(fecha, log);
  },

  // ---- BASE DE DATOS DE ALIMENTOS PROPIOS ----
  getFoodsDB() {
    const d = localStorage.getItem('sol_foods_db');
    return d ? JSON.parse(d) : [];
  },
  saveCustomFood(food) {
    const db = this.getFoodsDB();
    const idx = db.findIndex(f => f.id === food.id);
    if (idx >= 0) db[idx] = food; else db.push(food);
    localStorage.setItem('sol_foods_db', JSON.stringify(db));
  },
  deleteCustomFood(id) {
    const db = this.getFoodsDB().filter(f => f.id !== id);
    localStorage.setItem('sol_foods_db', JSON.stringify(db));
  },

  // ---- ALIMENTOS RECIENTES ----
  getRecentFoods() {
    const d = localStorage.getItem('sol_recent_foods');
    return d ? JSON.parse(d) : [];
  },
  addRecentFood(food) {
    let recent = this.getRecentFoods().filter(f => f.id !== food.id);
    recent.unshift(food);
    localStorage.setItem('sol_recent_foods', JSON.stringify(recent.slice(0, 20)));
  },

  // ---- CLAVE ANTHROPIC ----
  getAnthropicKey() { return localStorage.getItem('sol_anthropic_key') || ''; },
  saveAnthropicKey(key) { localStorage.setItem('sol_anthropic_key', key); },

  // ---- SUPABASE SYNC ----
  getSupabaseConfig() {
    const d = localStorage.getItem('sol_supabase_cfg');
    return d ? JSON.parse(d) : { url: '', key: '' };
  },
  saveSupabaseConfig(cfg) { localStorage.setItem('sol_supabase_cfg', JSON.stringify(cfg)); },
  getLastSyncedAt() { return localStorage.getItem('sol_last_synced') || null; },
  saveLastSyncedAt(ts) { localStorage.setItem('sol_last_synced', ts); },
};
