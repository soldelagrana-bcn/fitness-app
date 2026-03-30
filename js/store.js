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

  // ---- EXPORT / IMPORT ----
  exportAll() {
    return JSON.stringify({
      config: this.getConfig(),
      workouts: this.getWorkouts(),
      cargas: this.getCargas(),
      weight_log: this.getWeightLog(),
      nutrition: this.getNutritionLogs(60),
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
      return true;
    } catch (e) {
      return false;
    }
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
    // Calcular desde el primer entreno completado (más fiable que fecha_inicio)
    const workouts = this.getWorkouts().filter(w => w.completado && w.fecha);
    let inicioMs;
    if (workouts.length > 0) {
      const sorted = workouts.map(w => {
        // Usar w.fecha si existe, si no extraer del id (workout_YYYY-MM-DD_dia)
        const dateStr = w.fecha || ((w.id || '').match(/workout_(\d{4}-\d{2}-\d{2})/) || [])[1];
        return dateStr ? new Date(dateStr + 'T12:00:00') : null;
      }).filter(Boolean).sort((a, b) => a - b);
      const first = sorted[0];
      // Normalizar al lunes de esa semana
      const dow = first.getDay(); // 0=dom, 1=lun...
      const diffToMon = dow === 0 ? -6 : 1 - dow;
      const monday = new Date(first);
      monday.setDate(first.getDate() + diffToMon);
      monday.setHours(0, 0, 0, 0);
      inicioMs = monday.getTime();
    } else {
      const config = this.getConfig();
      if (!config.fecha_inicio) return 1;
      inicioMs = new Date(config.fecha_inicio + 'T00:00:00').getTime();
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffWeeks = Math.floor((today.getTime() - inicioMs) / (7 * 24 * 60 * 60 * 1000)) + 1;
    return Math.min(Math.max(diffWeeks, 1), 4);
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
