// ============================================================
// APP.JS — Lógica principal, routing y vistas
// ============================================================

let currentView = 'hoy';
let activeWorkout = null; // workout en progreso
let workoutTimer = null;
let workoutSeconds = 0;
let nutDate = new Date().toISOString().split('T')[0]; // fecha activa en nutrición
let nutCurrentMeal = null;
let nutSelectedFood = null;
let nutSearchTimeout = null;

// ---- GARMIN DATA (last sync: 2026-03-22 16:12) ----
const GARMIN_SEED = {
  fecha: '2026-03-22',
  syncTime: '16:12',
  bodyBattery: { current: 45, atWake: 85, charged: 61, drained: 40 },
  steps: { value: 15914, goal: 10000 },
  heartRate: { resting: 50, min: 47, max: 134 },
  stress: { avg: 28, qualifier: 'BALANCED' },
  spo2: 94,
  calories: { total: 1331, active: 382 },
  intensityMin: { moderate: 105, vigorous: 5 },
  sleep: { score: 84, durationMin: 530, deepMin: 34, remMin: 116, lightMin: 380 },
  activities: [
    { name: 'Barcelona Walking', type: 'walking', startLocal: '10:45', durationMin: 107, impact: -9 },
    { name: 'Barcelona Walking', type: 'walking', startLocal: '14:39', durationMin: 25, impact: -1 }
  ]
};

// ============================================================
// SUPABASE SYNC
// ============================================================
async function syncToSupabase() {
  const cfg = Store.getSupabaseConfig();
  if (!cfg.url || !cfg.key) return;
  // No subir si no hay datos reales (evita sobreescribir con datos vacíos)
  const workouts = Store.getWorkouts().filter(w => w.completado);
  const weights = Store.getWeightLog();
  if (workouts.length === 0 && weights.length === 0) return;
  const now = new Date().toISOString();
  const data = JSON.parse(Store.exportAll());
  try {
    const res = await fetch(`${cfg.url}/rest/v1/fitness_sync`, {
      method: 'POST',
      headers: {
        'apikey': cfg.key,
        'Authorization': `Bearer ${cfg.key}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({ id: 'sol', data, updated_at: now })
    });
    if (res.ok) Store.saveLastSyncedAt(now);
  } catch(e) { /* silent */ }
}

async function syncFromSupabase() {
  const cfg = Store.getSupabaseConfig();
  if (!cfg.url || !cfg.key) return;
  try {
    const res = await fetch(`${cfg.url}/rest/v1/fitness_sync?id=eq.sol&select=data,updated_at`, {
      headers: {
        'apikey': cfg.key,
        'Authorization': `Bearer ${cfg.key}`
      }
    });
    if (!res.ok) return;
    const rows = await res.json();
    if (!rows || !rows.length) return;
    const row = rows[0];
    // No importar si los datos remotos están vacíos
    if (!row.data || !row.data.workouts || row.data.workouts.length === 0) return;
    const remoteTs = new Date(row.updated_at).getTime();
    const localTs = Store.getLastSyncedAt() ? new Date(Store.getLastSyncedAt()).getTime() : 0;
    if (remoteTs > localTs) {
      // Merge workouts: combinar local + remoto, sin duplicados por ID
      const localWorkouts = Store.getWorkouts();
      const remoteWorkouts = row.data.workouts || [];
      const merged = [...localWorkouts];
      for (const rw of remoteWorkouts) {
        if (!merged.find(lw => lw.id === rw.id)) merged.push(rw);
      }
      row.data.workouts = merged;
      // Merge weight_log por fecha
      const localWeights = Store.getWeightLog();
      const remoteWeights = row.data.weight_log || [];
      const weightMap = {};
      for (const w of [...localWeights, ...remoteWeights]) weightMap[w.fecha] = w;
      row.data.weight_log = Object.values(weightMap);
      const ok = Store.importAll(JSON.stringify(row.data));
      if (ok) {
        Store.saveLastSyncedAt(row.updated_at);
        renderApp();
        showToast('Datos actualizados desde la nube ☁️');
      }
    }
  } catch(e) { /* silent */ }
}

// ---- ROUTER ----
function navigate(view, params) {
  currentView = view;
  renderApp(params);
  // Actualizar nav activo
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  window.scrollTo(0, 0);
}

// ---- RENDER PRINCIPAL ----
function renderApp(params) {
  const container = document.getElementById('view-container');
  switch (currentView) {
    case 'hoy': container.innerHTML = renderHoy(); break;
    case 'workout': container.innerHTML = renderWorkout(params); break;
    case 'progreso': container.innerHTML = renderProgreso(); break;
    case 'historial': container.innerHTML = renderHistorial(); break;
    case 'nutricion': container.innerHTML = renderNutricion(); break;
    case 'ajustes': container.innerHTML = renderAjustes(); break;
    default: container.innerHTML = renderHoy();
  }
  attachEventListeners();
  if (currentView === 'progreso') { renderCharts(); renderMuscleMap(); }
  if (currentView === 'workout') attachSwipeListeners();
}

// ============================================================
// VISTA: HOY
// ============================================================
function renderHoy() {
  const config = Store.getConfig();
  const today = new Date();
  const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const diaKey = dias[today.getDay()];
  const diasNombre = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
    jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo' };
  const fase = FASES[config.fase];
  const sesion = fase ? fase.sesiones[diaKey] : null;
  const semana = Store.getSemanaActual();

  // Workout de hoy (si existe)
  const todayId = `workout_${today.toISOString().split('T')[0]}_${diaKey}`;
  const todayWorkout = Store.getWorkoutById(todayId);

  // Semana completada?
  const workoutsThisWeek = Store.getWorkoutsThisWeek();
  const diasGym = workoutsThisWeek.filter(w => ['lunes','martes','jueves','viernes'].includes(w.dia));

  // Notificación de cambio de fase
  let faseNotif = '';
  if (semana >= 5 && config.fase === 1) {
    faseNotif = `
      <div class="phase-alert">
        <span class="phase-alert-icon">🎉</span>
        <div>
          <strong>¡Fase 1 completada!</strong>
          <p>Es hora de actualizar tu rutina. Ve a Ajustes para importar la Fase 2.</p>
        </div>
      </div>`;
  }

  // Progreso semanal
  const gymDone = diasGym.length;
  const progressHtml = ['lunes','martes','jueves','viernes'].map(d => {
    const done = workoutsThisWeek.find(w => w.dia === d);
    const isToday = d === diaKey;
    return `<div class="week-dot ${done ? 'done' : ''} ${isToday ? 'today' : ''}">
      <span>${d.slice(0,2).toUpperCase()}</span>
      ${done ? '<div class="dot-check">✓</div>' : ''}
    </div>`;
  }).join('');

  // Hero header data
  const hour = today.getHours();
  const greeting = hour < 13 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';
  const streak = Store.getStreak();
  const TIPS = [
    'La consistencia supera a la perfección. Aparecer es la mitad de la batalla.',
    'Cada repetición cuenta. Progreso lento sigue siendo progreso.',
    'Tu cuerpo se adapta a lo que le pides. Pídele más cada semana.',
    'Descansar bien es parte del entrenamiento, no una excusa.',
    'La fuerza no se construye en el gym — se construye en la recuperación.',
    'Confía en el proceso. Los resultados llegan con paciencia y trabajo.',
    'Tú de hoy le agradecerá a tú de ayer haber entrenado.'
  ];
  const tip = TIPS[today.getDay()];
  const todayZonas = sesion ? (ZONAS_POR_DIA[diaKey] || []) : [];

  // Vivid gradients per day
  const HERO_GRADS = {
    lunes:     'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
    martes:    'linear-gradient(135deg,#a855f7 0%,#ec4899 100%)',
    jueves:    'linear-gradient(135deg,#2563eb 0%,#06b6d4 100%)',
    viernes:   'linear-gradient(135deg,#0ea5e9 0%,#7c3aed 100%)',
    miercoles: 'linear-gradient(135deg,#059669 0%,#3b82f6 100%)',
    sabado:    'linear-gradient(135deg,#d97706 0%,#dc2626 100%)',
    domingo:   'linear-gradient(135deg,#7c3aed 0%,#db2777 100%)',
  };
  const heroGrad = HERO_GRADS[diaKey] || 'linear-gradient(135deg,#667eea,#764ba2)';

  // Today's start/continue button for hero
  let heroBtnHtml = '';
  if (sesion) {
    if (todayWorkout && todayWorkout.completado) {
      heroBtnHtml = `<div class="hero-btn-done">✓ ¡Completado!</div>`;
    } else if (todayWorkout) {
      heroBtnHtml = `<button class="hero-btn-start" data-action="continuar-workout" data-id="${todayWorkout.id}">▶ Continuar</button>`;
    } else {
      heroBtnHtml = `<button class="hero-btn-start" data-action="iniciar-workout" data-dia="${diaKey}">▶ Iniciar entrenamiento</button>`;
    }
  }

  // Rest day info map
  const REST_INFO = {
    miercoles: { icon: '🚴‍♀️', title: 'Descanso activo',    sub: 'Caminata · E-bike' },
    sabado:    { icon: '🎾',    title: 'Tenis (opcional)',   sub: 'Partido amistoso ~1h' },
    domingo:   { icon: '😴',    title: 'Descanso completo',  sub: 'Recupera al máximo' },
  };
  const restInfo = REST_INFO[diaKey] || { icon: '🚶‍♀️', title: 'Descanso activo', sub: 'Muévete con calma' };

  return `
    <div class="view">
      <div class="hero-header" style="background:${heroGrad}">
        <div class="hero-top">
          <div class="hero-meta">
            <span class="hero-date">${today.toLocaleDateString('es-ES', {weekday:'long', day:'numeric', month:'long'})}</span>
            <div class="hero-phase-row">
              <span class="hero-phase-chip">Fase ${config.fase} · Sem ${semana}/4</span>
              ${streak.current > 0 ? `<span class="hero-streak-chip">🔥 ${streak.current} sem</span>` : ''}
            </div>
          </div>
          <svg class="hero-mascot" viewBox="0 0 64 60" xmlns="http://www.w3.org/2000/svg">
            <g class="corgi-ear-l">
              <path d="M10,32 L20,6 L30,28" fill="#C8680E" stroke="#A0520A" stroke-width="0.6"/>
              <path d="M13,30 L20,10 L28,27" fill="#FFCCBB" opacity="0.85"/>
            </g>
            <g class="corgi-ear-r">
              <path d="M34,28 L44,6 L54,32" fill="#C8680E" stroke="#A0520A" stroke-width="0.6"/>
              <path d="M36,27 L44,10 L51,30" fill="#FFCCBB" opacity="0.85"/>
            </g>
            <ellipse cx="32" cy="38" rx="24" ry="21" fill="#F0A040"/>
            <ellipse cx="32" cy="46" rx="15" ry="10" fill="#F8C870"/>
            <ellipse cx="24" cy="35" rx="4" ry="4.5" fill="#1A0E00"/>
            <ellipse cx="40" cy="35" rx="4" ry="4.5" fill="#1A0E00"/>
            <circle cx="25.5" cy="33" r="1.6" fill="white" opacity="0.9"/>
            <circle cx="41.5" cy="33" r="1.6" fill="white" opacity="0.9"/>
            <ellipse cx="32" cy="44" rx="5" ry="3.5" fill="#1A0E00"/>
            <ellipse cx="31" cy="43" rx="1.8" ry="1.1" fill="white" opacity="0.35"/>
            <path d="M27,48 Q32,53 37,48" stroke="#1A0E00" stroke-width="1.8" fill="none" stroke-linecap="round"/>
            <ellipse cx="17" cy="41" rx="6" ry="3.5" fill="#E8805A" opacity="0.4"/>
            <ellipse cx="47" cy="41" rx="6" ry="3.5" fill="#E8805A" opacity="0.4"/>
          </svg>
        </div>
        <h2 class="hero-greeting">${greeting}, Sol</h2>

        ${sesion ? `
          <div class="hero-session-block">
            <div class="hero-session-top">
              <span class="hero-session-id">${sesion.id}</span>
              <span class="hero-session-name">${sesion.nombre}</span>
              <span class="hero-duration-chip">⏱ ${sesion.duracion_objetivo}</span>
            </div>
            <div class="hero-zones">${todayZonas.map(z => {
              const zona = ZONAS_DISPLAY[z];
              return `<span class="hero-zone-pill">${zona.nombre}</span>`;
            }).join('')}</div>
            <p class="hero-warmup">🔥 ${sesion.warmup}</p>
            ${heroBtnHtml}
          </div>
        ` : `
          <div class="hero-rest-block">
            <div class="hero-rest-row">
              <span class="hero-rest-emoji">${restInfo.icon}</span>
              <div>
                <p class="hero-rest-title">${restInfo.title}</p>
                <p class="hero-rest-sub">${restInfo.sub} · 1.700 kcal</p>
              </div>
            </div>
          </div>
        `}

        <p class="hero-tip">"${tip}"</p>
      </div>

      ${faseNotif}

      ${(() => {
        const g = Store.getGarminData() || GARMIN_SEED;
        if (!g) return '';
        const stepsK = g.steps.value >= 1000 ? (g.steps.value / 1000).toFixed(1) + 'k' : g.steps.value;
        const stepsPct = Math.min(100, Math.round(g.steps.value / g.steps.goal * 100));
        const bbColor = g.bodyBattery.current >= 70 ? '#3DAA6F' : g.bodyBattery.current >= 40 ? '#E08A2A' : '#D94F4F';
        const stressLabel = { BALANCED: 'Equilibrado', LOW: 'Bajo', MEDIUM: 'Moderado', HIGH: 'Alto' }[g.stress.qualifier] || g.stress.qualifier;
        const sleepH = Math.floor(g.sleep.durationMin / 60);
        const sleepM = g.sleep.durationMin % 60;
        const sleepColor = g.sleep.score >= 80 ? '#3DAA6F' : g.sleep.score >= 60 ? '#E08A2A' : '#D94F4F';
        return `
        <section>
          <h4 class="section-title">Garmin · ${g.syncTime}</h4>
          <div class="card garmin-card">
            <div class="garmin-metrics-row">
              <div class="garmin-tile">
                <div class="garmin-tile-val" style="color:${bbColor}">${g.bodyBattery.current}</div>
                <div class="garmin-tile-sub">↑${g.bodyBattery.atWake} al despertar</div>
                <div class="garmin-tile-label">Body Battery</div>
              </div>
              <div class="garmin-tile">
                <div class="garmin-tile-val">${stepsK}</div>
                <div class="garmin-tile-sub">${stepsPct}% del objetivo</div>
                <div class="garmin-tile-label">Pasos</div>
              </div>
              <div class="garmin-tile">
                <div class="garmin-tile-val" style="color:${sleepColor}">${g.sleep.score}</div>
                <div class="garmin-tile-sub">${sleepH}h ${sleepM > 0 ? sleepM + 'min' : ''}</div>
                <div class="garmin-tile-label">Calidad sueño</div>
              </div>
              <div class="garmin-tile">
                <div class="garmin-tile-val">${g.heartRate.resting}</div>
                <div class="garmin-tile-sub">FC reposo bpm</div>
                <div class="garmin-tile-label">Estrés: ${stressLabel}</div>
              </div>
            </div>
            <div class="garmin-steps-track">
              <div class="garmin-steps-fill" style="width:${stepsPct}%"></div>
            </div>
            <div class="garmin-sleep-phases">
              <span class="sleep-phase-dot deep">🌑 ${g.sleep.deepMin}m profundo</span>
              <span class="sleep-phase-dot rem">💜 ${g.sleep.remMin}m REM</span>
              <span class="sleep-phase-dot light">💤 ${g.sleep.lightMin}m ligero</span>
            </div>
            ${g.activities.length > 0 ? `<div class="garmin-activities">${g.activities.map(a =>
              `<span class="garmin-act-tag">🚶‍♀️ ${a.name} · ${a.durationMin}min · ${a.impact}⚡</span>`
            ).join('')}</div>` : ''}
          </div>
        </section>`;
      })()}

      <section>
        <h4 class="section-title">Semana actual</h4>
        <div class="card">
          <div class="rings-row">
            ${[
              { dia: 'lunes',   label: 'LU', color: '#5B63D4' },
              { dia: 'martes',  label: 'MA', color: '#7455C8' },
              { dia: 'jueves',  label: 'JU', color: '#4A82D4' },
              { dia: 'viernes', label: 'VI', color: '#5B9BD4' },
            ].map(({ dia, label, color }) => {
              const done = workoutsThisWeek.find(w => w.dia === dia);
              const offset = done ? 0 : 113.1;
              return `
                <div class="ring-container">
                  <svg viewBox="0 0 44 44" class="ring-svg">
                    <circle cx="22" cy="22" r="18" fill="none" stroke="#EDEDF5" stroke-width="4"/>
                    <circle cx="22" cy="22" r="18" fill="none" stroke="${color}" stroke-width="4"
                      stroke-linecap="round" stroke-dasharray="113.1"
                      stroke-dashoffset="${offset}" transform="rotate(-90 22 22)"
                      class="ring-arc"/>
                  </svg>
                  <div class="ring-label">${label}</div>
                  <div class="ring-check">${done ? '✓' : ''}</div>
                </div>`;
            }).join('')}
          </div>
          <div class="rings-summary">${gymDone}/4 entrenamientos esta semana${gymDone >= 4 ? ' 🔥' : ''}</div>
        </div>
      </section>

      <section>
        <h4 class="section-title">Plan semanal</h4>
        <div class="card plan-semanal">
          ${['lunes','martes','miercoles','jueves','viernes','sabado','domingo'].map(d => {
            const s = fase ? fase.sesiones[d] : null;
            const isToday = d === diaKey;
            const done = workoutsThisWeek.find(w => w.dia === d);
            const actividad = Store.getActividadDia(d);
            const diasLabel = {lunes:'Lunes',martes:'Martes',miercoles:'Miércoles',jueves:'Jueves',viernes:'Viernes',sabado:'Sábado',domingo:'Domingo'};
            const descansoInfo = {
              miercoles: { icon:'🚴‍♀️', label:'Descanso activo', sub:'Caminata · E-bike' },
              sabado:    { icon:'🎾',   label:'Tenis (opcional)', sub:'Partido amistoso ~1h' },
              domingo:   { icon:'😴',   label:'Descanso',         sub:'Actividad espontánea' }
            };

            if (s) {
              // Día de gym
              const zonas = ZONAS_POR_DIA[d] || [];
              const zonasStr = zonas.slice(0,3).map(z => ZONAS_DISPLAY[z].nombre).join(' · ');
              const extraTag = d === 'martes' ? '<span class="plan-extra-tag">🎾 Tenis 19:00</span>' : '';
              const gymColor = {'d1':'#5B63D4','d2':'#7455C8','d3':'#4A82D4','d4':'#5B9BD4'}[s.id.toLowerCase()] || '#5B63D4';
              return `
                <div class="plan-row ${isToday ? 'plan-today' : ''} ${done ? 'plan-done' : ''}"
                     data-action="ver-sesion" data-dia="${d}">
                  <div class="plan-left">
                    <div class="plan-dia-badge gym ${s.id.toLowerCase()} ${done ? 'done' : ''}">${diasLabel[d].slice(0,2).toUpperCase()}</div>
                    <div>
                      <div class="plan-nombre">${s.nombre}</div>
                      <div class="plan-zonas muted">${zonasStr}</div>
                      ${extraTag}
                    </div>
                  </div>
                  <div class="plan-right">
                    ${isToday && !done ? '<span class="plan-hoy-tag">Hoy</span>' : done ? '<span class="plan-done-tag">✓</span>' : ''}
                  </div>
                </div>`;
            } else {
              // Día de descanso / flexible
              const info = descansoInfo[d] || { icon:'😴', label:'Descanso', sub:'' };
              const actHtml = actividad
                ? `<span class="actividad-logged">${actividad.icon} ${actividad.nombre}</span>`
                : `<span class="plan-zonas muted">${info.sub}</span>`;
              return `
                <div class="plan-row plan-rest ${isToday ? 'plan-today' : ''} ${actividad ? 'plan-done' : ''}"
                     data-action="log-actividad-dia" data-dia="${d}">
                  <div class="plan-left">
                    <div class="plan-dia-badge rest">${diasLabel[d].slice(0,2).toUpperCase()}</div>
                    <div>
                      <div class="plan-nombre">${info.icon} ${info.label}</div>
                      ${actHtml}
                    </div>
                  </div>
                  <div class="plan-right">
                    ${isToday ? '<span class="plan-hoy-tag">Hoy</span>' : actividad ? '<span class="plan-done-tag">✓</span>' : ''}
                  </div>
                </div>`;
            }
          }).join('')}
        </div>
      </section>

      <section>
        <h4 class="section-title">Accesos rápidos</h4>
        <div class="quick-grid">
          <button class="quick-btn" data-action="nav" data-view="progreso">
            <span class="quick-icon">📈</span>
            <span>Progresión</span>
          </button>
          <button class="quick-btn" data-action="nav" data-view="historial">
            <span class="quick-icon">📋</span>
            <span>Historial</span>
          </button>
          <button class="quick-btn" data-action="nav" data-view="nutricion">
            <span class="quick-icon">🥗</span>
            <span>Nutrición</span>
          </button>
          <button class="quick-btn" data-action="nav" data-view="ajustes">
            <span class="quick-icon">⚙️</span>
            <span>Ajustes</span>
          </button>
        </div>
      </section>
    </div>`;
}

// ============================================================
// VISTA: ENTRENAMIENTO ACTIVO
// ============================================================
function renderWorkout(params) {
  if (!activeWorkout) return renderHoy();
  const w = activeWorkout;
  const bloqueActual = w.bloques[w.bloque_actual];
  if (!bloqueActual) return renderWorkoutFinish();

  const totalBloques = w.bloques.length;
  const progressPct = Math.round((w.bloque_actual / totalBloques) * 100);
  const timerDisplay = formatTimer(workoutSeconds);

  // Progress ring calculation
  const totalSets = w.bloques.reduce((acc, b) => acc + b.ejercicios.reduce((a, e) => a + e.series, 0), 0);
  const doneSets = w.bloques.reduce((acc, b) => acc + b.ejercicios.reduce((a, e) => a + e.reps_completadas.filter(r => r !== null).length, 0), 0);
  const ringPct = totalSets > 0 ? doneSets / totalSets : 0;
  const ringCirc = 2 * Math.PI * 18; // ≈ 113.1
  const ringOffset = ringCirc * (1 - ringPct);
  const ringPctDisplay = Math.round(ringPct * 100);

  // Ejercicios del bloque actual
  const ejHtml = bloqueActual.ejercicios.map((ej, ejIdx) => {
    const isActive = ejIdx === w.ejercicio_actual && bloqueActual.formato !== 'secuencial';
    const allDone = ej.reps_completadas.every(r => r !== null);
    const doneSetsEj = ej.reps_completadas.filter(r => r !== null).length;
    const totalSetsEj = ej.series;
    return `
      <div class="exercise-card ${allDone ? 'done' : ''} ${isActive ? 'active' : ''}" data-ej="${ejIdx}" data-ej-idx="${ejIdx}">
        <div class="exercise-header">
          <div class="exercise-id-badge">${ej.id}</div>
          <div class="exercise-info">
            <h4 class="exercise-name">${ej.nombre}</h4>
            <p class="exercise-desc">${ej.descripcion}</p>
            ${ej.fallo_ultimo_set ? '<span class="fallo-badge">💥 Fallo en último set</span>' : ''}
          </div>
          <div class="ej-check-circle ${allDone ? 'done' : doneSetsEj > 0 ? 'partial' : ''}">
            ${allDone
              ? `<svg viewBox="0 0 36 36" fill="none"><circle cx="18" cy="18" r="17" fill="#22c55e"/><path d="M10 18.5 L15.5 24 L26 12" stroke="white" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`
              : doneSetsEj > 0
                ? `<svg viewBox="0 0 36 36" fill="none"><circle cx="18" cy="18" r="17" fill="#dcfce7" stroke="#22c55e" stroke-width="2.2"/><text x="18" y="22" text-anchor="middle" font-size="11" font-weight="800" fill="#16a34a">${doneSetsEj}/${totalSetsEj}</text></svg>`
                : `<svg viewBox="0 0 36 36" fill="none"><circle cx="18" cy="18" r="17" fill="#F3F4F6" stroke="#D1D5DB" stroke-width="2"/><line x1="18" y1="11" x2="18" y2="25" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round"/><line x1="11" y1="18" x2="25" y2="18" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round"/></svg>`
            }
          </div>
        </div>

        <div class="sets-row">
          ${ej.reps_completadas.map((r, sIdx) => `
            <div class="set-item ${r !== null ? 'done' : ''}" data-ej="${ejIdx}" data-set="${sIdx}">
              <div class="set-num">Set ${sIdx + 1}</div>
              <div class="set-val">${r !== null ? r + ' reps' : '—'}</div>
            </div>
          `).join('')}
        </div>

        <div class="exercise-controls">
          <div class="carga-row">
            <label>Carga</label>
            <div class="carga-input-group">
              <button class="carga-btn" data-action="carga-minus" data-ej="${ejIdx}">−</button>
              <span class="carga-value" id="carga-${ejIdx}">${ej.carga_kg !== null ? ej.carga_kg + ' kg' : 'Sin carga'}</span>
              <button class="carga-btn" data-action="carga-plus" data-ej="${ejIdx}">+</button>
            </div>
          </div>
          ${renderSetLogger(ej, ejIdx)}
        </div>
      </div>`;
  }).join('');

  const isLastBloque = w.bloque_actual === w.bloques.length - 1;
  const bloqueCompleto = bloqueActual.ejercicios.every(e => e.reps_completadas.every(r => r !== null));

  return `
    <div class="view workout-view">
      <div class="workout-topbar">
        <button class="back-btn" data-action="pause-workout">← Pausar</button>
        <div class="workout-timer" id="workout-timer">${timerDisplay}</div>
        <div class="workout-ring-wrap">
          <svg viewBox="0 0 44 44" class="workout-ring-svg">
            <circle cx="22" cy="22" r="18" fill="none" stroke="#EDEDF5" stroke-width="4"/>
            <circle cx="22" cy="22" r="18" fill="none" stroke="#5B63D4" stroke-width="4"
              stroke-linecap="round" stroke-dasharray="${ringCirc.toFixed(1)}"
              stroke-dashoffset="${ringOffset.toFixed(1)}" transform="rotate(-90 22 22)"
              class="ring-arc"/>
          </svg>
          <span class="workout-ring-pct">${ringPctDisplay}%</span>
        </div>
      </div>

      <div class="workout-progress-bar">
        <div class="workout-progress-fill" style="width:${progressPct}%"></div>
      </div>

      <div class="workout-session-name">${w.tipo}</div>

      <div class="bloque-header">
        <h3 class="bloque-nombre">${bloqueActual.nombre}</h3>
        ${bloqueActual.formato === 'descanso_activo' ? '<span class="descanso-badge">↔ Descanso activo</span>' : ''}
      </div>

      <div class="exercises-list">
        ${ejHtml}
      </div>

      <div class="workout-footer">
        ${bloqueCompleto
          ? isLastBloque
            ? `<button class="btn btn-success" data-action="finish-workout">🏁 Finalizar entrenamiento</button>`
            : `<button class="btn btn-primary" data-action="next-bloque">Siguiente bloque →</button>`
          : `<p class="muted center">Completa todos los sets para continuar</p>`
        }
      </div>
    </div>`;
}

function renderSetLogger(ej, ejIdx) {
  if (ej.reps_completadas.every(r => r !== null)) {
    return '<p class="set-complete-msg">✓ Ejercicio completado</p>';
  }
  return `
    <div class="set-logger" id="logger-${ejIdx}">
      <div class="set-logger-header">
        <span>${ej.series} series · objetivo ${ej.reps_objetivo} reps</span>
        ${ej.fallo_ultimo_set ? '<span class="fallo-hint">💥 Último set al fallo</span>' : ''}
      </div>
      <div class="reps-input-row">
        <button class="reps-btn" data-action="reps-minus" data-ej="${ejIdx}">−</button>
        <input type="number" class="reps-input" id="reps-${ejIdx}"
          value="${ej.reps_objetivo}" min="1" max="50" inputmode="numeric">
        <button class="reps-btn" data-action="reps-plus" data-ej="${ejIdx}">+</button>
      </div>
      <div class="rir-row">
        <label>RIR último set:</label>
        <div class="rir-buttons">
          ${[0,1,2,3,4].map(r => `
            <button class="rir-btn ${r === 2 ? 'selected' : ''}"
              data-action="set-rir" data-ej="${ejIdx}" data-rir="${r}">${r}</button>
          `).join('')}
        </div>
      </div>
      <button class="btn btn-complete-set" data-action="complete-exercise" data-ej="${ejIdx}">
        ✓ Completar ejercicio
      </button>
    </div>`;
}

function renderWorkoutFinish() {
  const w = activeWorkout;
  const timerDisplay = formatTimer(workoutSeconds);
  return `
    <div class="view finish-view">
      <div class="finish-hero">
        <div class="finish-trophy">🏆</div>
        <h2>¡Entrenamiento completado!</h2>
        <p class="finish-time">Duración: ${timerDisplay}</p>
      </div>

      <div class="card">
        <h4>Resumen</h4>
        ${w.bloques.map(b => `
          <div class="summary-bloque">
            <strong>${b.nombre}</strong>
            ${b.ejercicios.map(ej => `
              <div class="summary-ej">
                <span>${ej.nombre}</span>
                <span class="muted">${ej.reps_completadas.filter(r => r !== null).join(' / ')} reps${ej.carga_kg ? ' · ' + ej.carga_kg + ' kg' : ''}</span>
              </div>
            `).join('')}
          </div>
        `).join('')}
      </div>

      <div class="card">
        <h4>¿Cómo te sentiste?</h4>
        <div class="sensation-buttons">
          ${['😴 Fácil','💪 Bien','🔥 Duro','💀 Al límite'].map((s, i) => `
            <button class="sensation-btn" data-action="set-sensation" data-val="${i}">${s}</button>
          `).join('')}
        </div>
      </div>

      <button class="btn btn-secondary" data-action="share-workout">📤 Compartir entrenamiento</button>
      <button class="btn btn-primary" data-action="save-finish-workout">Guardar y continuar</button>
    </div>`;
}

// ============================================================
// VISTA: PROGRESO
// ============================================================
function renderProgreso() {
  const cargas = Store.getCargas();
  const workouts = Store.getWorkouts().filter(w => w.completado);

  // Ejercicios compuestos clave
  const compuestos = [
    'Hip thrust con mancuerna',
    'RDL con kettlebell',
    'Goblet squat con KB',
    'Remo con mancuerna',
    'Press de hombro con mancuernas',
    'Press de pecho con mancuernas',
  ];

  const listosParaSubir = compuestos.filter(e => Store.listoParaSubir(e));

  const compuestosHtml = compuestos.map(nombre => {
    const carga = cargas[nombre];
    const listo = Store.listoParaSubir(nombre);
    return `
      <div class="progreso-row ${listo ? 'listo' : ''}">
        <div class="progreso-info">
          <span class="progreso-nombre">${nombre}</span>
          <span class="progreso-carga">${carga !== null && carga !== undefined ? carga + ' kg' : 'Sin asignar'}</span>
        </div>
        ${listo ? '<span class="listo-badge">⬆️ Sube peso</span>' : ''}
      </div>`;
  }).join('');

  // Zonas trabajadas esta semana
  const weekWorkouts = Store.getWorkoutsThisWeek();
  const zonasThisWeek = new Set();
  weekWorkouts.forEach(w => {
    const zonas = ZONAS_POR_DIA[w.dia] || [];
    zonas.forEach(z => zonasThisWeek.add(z));
  });

  const zonasLegendHtml = Object.entries(ZONAS_DISPLAY).map(([key, zona]) => {
    const worked = zonasThisWeek.has(key);
    return `
      <div class="muscle-legend-item ${worked ? 'worked' : ''}">
        <div class="legend-dot" style="background:${worked ? zona.color : '#DDDDE8'}"></div>
        <span style="${worked ? 'color:' + zona.color + ';font-weight:700' : 'color:var(--text-muted)'}">${zona.nombre}</span>
      </div>`;
  }).join('');

  // Weekly summary data
  const allWorkouts = Store.getWorkouts().filter(w => w.completado);
  const weekSets = weekWorkouts.reduce((acc, w) =>
    acc + w.bloques.reduce((a, b) => a + b.ejercicios.reduce((c, e) => c + e.reps_completadas.filter(r => r !== null).length, 0), 0), 0);
  const streak = Store.getStreak();
  const zonasArray = Array.from(zonasThisWeek);
  const mostWorked = zonasArray.length > 0 ? ZONAS_DISPLAY[zonasArray[0]]?.nombre || '—' : '—';
  const motivMsg = weekWorkouts.length >= 4 ? '🔥 ¡Semana perfecta! Eres una máquina.' :
    weekWorkouts.length >= 2 ? '💪 Buen ritmo, sigue así.' :
    weekWorkouts.length === 1 ? '🌱 Buen comienzo. ¡A por más!' :
    '😴 Esta semana empieza ahora.';

  // Last measurements
  const medidas = Store.getMedidas().sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  const lastMedida = medidas[0] || null;
  const todayFecha = new Date().toISOString().split('T')[0];

  return `
    <div class="view">
      <div class="view-header">
        <h2 class="view-title">Progreso</h2>
      </div>

      ${listosParaSubir.length > 0 ? `
        <div class="alert-card">
          <span>⬆️</span>
          <div>
            <strong>${listosParaSubir.length} ejercicio${listosParaSubir.length > 1 ? 's' : ''} listo${listosParaSubir.length > 1 ? 's' : ''} para subir peso</strong>
            <p class="muted">Cumpliste la regla de doble progresión</p>
          </div>
        </div>` : ''}

      <section>
        <h4 class="section-title">Resumen de la semana</h4>
        <div class="card weekly-summary-card">
          <button class="summary-toggle" data-action="toggle-weekly-summary">
            <span class="summary-toggle-title">📊 Ver resumen semanal</span>
            <span class="summary-toggle-arrow" id="summary-arrow">›</span>
          </button>
          <div class="weekly-summary-body hidden" id="weekly-summary-body">
            <div class="summary-stats-grid">
              <div class="summary-stat">
                <span class="summary-stat-val">${weekWorkouts.length}</span>
                <span class="summary-stat-label">Entrenos</span>
              </div>
              <div class="summary-stat">
                <span class="summary-stat-val">${weekSets}</span>
                <span class="summary-stat-label">Sets totales</span>
              </div>
              <div class="summary-stat">
                <span class="summary-stat-val">${streak.current}</span>
                <span class="summary-stat-label">Racha (sem)</span>
              </div>
              <div class="summary-stat">
                <span class="summary-stat-val">${streak.best}</span>
                <span class="summary-stat-label">Mejor racha</span>
              </div>
            </div>
            <div class="summary-zona-row">
              <span class="muted" style="font-size:13px">Zona más trabajada:</span>
              <strong style="font-size:13px;margin-left:6px">${mostWorked}</strong>
            </div>
            <div class="summary-motivation">${motivMsg}</div>
          </div>
        </div>
      </section>

      <section>
        <h4 class="section-title">Cargas actuales</h4>
        <div class="card">
          ${compuestosHtml}
        </div>
      </section>

      <section>
        <h4 class="section-title">Evolución de cargas</h4>
        <div class="card">
          <div class="chart-select-row">
            <select id="chart-ejercicio-select" class="chart-select">
              ${compuestos.map(e => `<option value="${e}">${e}</option>`).join('')}
            </select>
          </div>
          <div class="chart-wrap">
            <canvas id="chart-cargas" height="200"></canvas>
          </div>
        </div>
      </section>

      <section>
        <h4 class="section-title">Zonas trabajadas esta semana</h4>
        <div class="card">
          <div class="muscle-map">
            <svg viewBox="0 0 80 222" class="body-svg" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="sg" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stop-color="#C8845A"/>
                  <stop offset="50%" stop-color="#E09A6A"/>
                  <stop offset="100%" stop-color="#C8845A"/>
                </linearGradient>
                <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#7A3A14"/>
                  <stop offset="100%" stop-color="#3C1A06"/>
                </linearGradient>
                <!-- Unified body clip — all shapes union seamlessly -->
                <clipPath id="bc">
                  <ellipse cx="40" cy="16" rx="12" ry="14"/>
                  <!-- Torso: smooth female silhouette — wider hips than shoulders -->
                  <path d="M35,27 C28,27 17,30 14,37 C10,44 12,54 15,63 C17,72 20,80 20,89 C16,98 10,106 10,112 C16,118 28,122 40,124 C52,122 64,118 70,112 C70,106 64,98 60,89 C60,80 63,72 65,63 C68,54 70,44 66,37 C63,30 52,27 45,27 Z"/>
                  <!-- Left upper arm -->
                  <path d="M6,36 C4,48 3,62 4,76 C5,86 8,92 12,92 L18,90 C16,78 15,62 16,48 C16,40 14,34 6,36 Z"/>
                  <!-- Left forearm -->
                  <path d="M4,92 C2,104 2,116 4,126 L14,126 C14,116 14,104 12,92 Z"/>
                  <ellipse cx="8" cy="130" rx="6" ry="4"/>
                  <!-- Right upper arm -->
                  <path d="M74,36 C76,48 77,62 76,76 C75,86 72,92 68,92 L62,90 C64,78 65,62 64,48 C64,40 66,34 74,36 Z"/>
                  <!-- Right forearm -->
                  <path d="M76,92 C78,104 78,116 76,126 L66,126 C66,116 66,104 68,92 Z"/>
                  <ellipse cx="72" cy="130" rx="6" ry="4"/>
                  <!-- Left thigh -->
                  <path d="M10,112 C6,126 5,142 6,156 C7,166 11,172 15,174 L23,174 C25,164 25,148 24,134 C23,122 19,112 13,110 Z"/>
                  <!-- Right thigh -->
                  <path d="M70,112 C74,126 75,142 74,156 C73,166 69,172 65,174 L57,174 C55,164 55,148 56,134 C57,122 61,112 67,110 Z"/>
                  <!-- Left calf -->
                  <path d="M6,174 C3,188 3,200 6,208 L18,208 C20,200 20,188 23,174 Z"/>
                  <!-- Right calf -->
                  <path d="M74,174 C77,188 77,200 74,208 L62,208 C60,200 60,188 57,174 Z"/>
                  <!-- Left foot -->
                  <path d="M4,208 C2,213 3,218 8,220 L22,220 C26,218 26,213 22,208 Z"/>
                  <!-- Right foot -->
                  <path d="M76,208 C78,213 77,218 72,220 L58,220 C54,218 54,213 58,208 Z"/>
                </clipPath>
              </defs>

              <!-- Hair behind head -->
              <ellipse cx="40" cy="12" rx="13" ry="16" fill="url(#hg)"/>
              <rect x="27" y="14" width="4" height="24" rx="2" fill="#3C1A06"/>
              <rect x="49" y="14" width="4" height="24" rx="2" fill="#3C1A06"/>

              <!-- Skin fill, clipped to unified body shape -->
              <g clip-path="url(#bc)">
                <rect x="0" y="0" width="80" height="225" fill="url(#sg)"/>
              </g>

              <!-- MUSCLE ZONES — clipped, no stroke, semi-transparent by default -->
              <g clip-path="url(#bc)">
                <!-- zone-hombro: deltoid cap -->
                <path class="zone-hombro" d="M4,38 C3,52 3,66 5,78 L14,76 C13,62 13,48 14,36 Z"/>
                <path class="zone-hombro" d="M76,38 C77,52 77,66 75,78 L66,76 C67,62 67,48 66,36 Z"/>
                <!-- zone-pecho: pectorals (fan shape) -->
                <path class="zone-pecho" d="M17,38 C13,46 14,56 16,66 L40,66 L40,36 Z"/>
                <path class="zone-pecho" d="M63,38 C67,46 66,56 64,66 L40,66 L40,36 Z"/>
                <!-- zone-espalda: trapezius (shoulder slope) -->
                <path class="zone-espalda" d="M22,30 C18,32 14,36 14,42 C20,38 30,34 36,32 Z"/>
                <path class="zone-espalda" d="M58,30 C62,32 66,36 66,42 C60,38 50,34 44,32 Z"/>
                <!-- zone-biceps: front of upper arm -->
                <path class="zone-biceps" d="M4,46 C3,60 3,74 5,86 L12,84 C11,70 11,56 12,44 Z"/>
                <path class="zone-biceps" d="M76,46 C77,60 77,74 75,86 L68,84 C69,70 69,56 68,44 Z"/>
                <!-- zone-triceps: side edge of upper arm -->
                <path class="zone-triceps" d="M16,40 C15,54 15,70 16,84 L19,84 C18,70 18,54 19,40 Z"/>
                <path class="zone-triceps" d="M64,40 C65,54 65,70 64,84 L61,84 C62,70 62,54 61,40 Z"/>
                <!-- zone-core: rectus abdominis 6-pack -->
                <path class="zone-core" d="M31,66 L39,66 L39,77 C36,78 31,77 31,75 Z"/>
                <path class="zone-core" d="M49,66 L41,66 L41,77 C44,78 49,77 49,75 Z"/>
                <path class="zone-core" d="M30,79 L39,79 L39,90 L30,89 Z"/>
                <path class="zone-core" d="M50,79 L41,79 L41,90 L50,89 Z"/>
                <path class="zone-core" d="M31,92 L39,92 L39,103 C36,106 31,104 31,101 Z"/>
                <path class="zone-core" d="M49,92 L41,92 L41,103 C44,106 49,104 49,101 Z"/>
                <!-- zone-oblicuos: external obliques (sides) -->
                <path class="zone-oblicuos" d="M15,66 C12,78 12,92 14,104 C16,112 20,116 24,117 C23,106 22,90 22,78 C22,68 18,62 15,66 Z"/>
                <path class="zone-oblicuos" d="M65,66 C68,78 68,92 66,104 C64,112 60,116 56,117 C57,106 58,90 58,78 C58,68 62,62 65,66 Z"/>
                <!-- zone-gluteo: hip/glute area front view -->
                <path class="zone-gluteo" d="M12,106 C8,116 8,126 12,132 C20,138 30,140 40,142 C50,140 60,138 68,132 C72,126 72,116 68,106 C60,112 50,115 40,115 C30,115 20,112 12,106 Z"/>
                <!-- zone-abductores: outer hip/thigh -->
                <path class="zone-abductores" d="M8,114 C5,128 5,144 7,156 C9,164 13,168 17,168 C17,156 15,140 15,128 C15,118 12,112 8,114 Z"/>
                <path class="zone-abductores" d="M72,114 C75,128 75,144 73,156 C71,164 67,168 63,168 C63,156 65,140 65,128 C65,118 68,112 72,114 Z"/>
                <!-- zone-cuadriceps: front of thigh -->
                <path class="zone-cuadriceps" d="M14,122 C10,136 10,152 12,164 C14,172 18,176 22,176 C22,164 20,148 21,136 C21,126 18,120 14,122 Z"/>
                <path class="zone-cuadriceps" d="M66,122 C70,136 70,152 68,164 C66,172 62,176 58,176 C58,164 60,148 59,136 C59,126 62,120 66,122 Z"/>
                <path class="zone-cuadriceps" d="M24,122 C20,136 20,152 22,164 C24,170 28,173 31,172 C31,160 30,144 31,132 C31,122 28,120 24,122 Z"/>
                <path class="zone-cuadriceps" d="M56,122 C60,136 60,152 58,164 C56,170 52,173 49,172 C49,160 50,144 49,132 C49,122 52,120 56,122 Z"/>
                <!-- zone-isquios: hamstrings (inner thigh visible) -->
                <path class="zone-isquios" d="M27,118 C24,132 24,148 26,162 C28,170 32,174 36,174 C36,162 35,146 36,134 C36,124 32,118 27,118 Z"/>
                <path class="zone-isquios" d="M53,118 C56,132 56,148 54,162 C52,170 48,174 44,174 C44,162 45,146 44,134 C44,124 48,118 53,118 Z"/>
                <!-- zone-gemelos: calves -->
                <path class="zone-gemelos" d="M6,178 C4,192 4,204 7,210 L19,210 C21,204 21,192 23,178 Z"/>
                <path class="zone-gemelos" d="M74,178 C76,192 76,204 73,210 L61,210 C59,204 59,192 57,178 Z"/>
              </g>

              <!-- Face drawn on top -->
              <ellipse cx="40" cy="16" rx="12" ry="14" fill="url(#sg)"/>
              <path d="M33,11 Q36,9 39,11" stroke="#4A2008" stroke-width="1.2" fill="none" stroke-linecap="round"/>
              <path d="M41,11 Q44,9 47,11" stroke="#4A2008" stroke-width="1.2" fill="none" stroke-linecap="round"/>
              <ellipse cx="35.5" cy="15.5" rx="2.5" ry="2.5" fill="#1A0A00"/>
              <ellipse cx="44.5" cy="15.5" rx="2.5" ry="2.5" fill="#1A0A00"/>
              <circle cx="36.5" cy="14" r="1" fill="white" opacity="0.7"/>
              <circle cx="45.5" cy="14" r="1" fill="white" opacity="0.7"/>
              <path d="M36,22 Q40,25 44,22" stroke="#B07050" stroke-width="1.1" fill="none" stroke-linecap="round"/>
              <ellipse cx="31" cy="18" rx="4" ry="2.5" fill="#E8805A" opacity="0.22"/>
              <ellipse cx="49" cy="18" rx="4" ry="2.5" fill="#E8805A" opacity="0.22"/>
            </svg>
            <div class="muscle-legend">${zonasLegendHtml}</div>
          </div>
        </div>
      </section>

      <section>
        <h4 class="section-title">Peso corporal</h4>
        <div class="card">
          <div class="chart-wrap">
            <canvas id="chart-peso" height="180"></canvas>
          </div>
          <div class="peso-input-row">
            <input type="number" id="peso-input" class="peso-input" placeholder="ej: 48.5" step="0.1" inputmode="decimal">
            <button class="btn btn-sm" data-action="save-peso">Registrar</button>
          </div>
        </div>
      </section>

      <section>
        <h4 class="section-title">Medidas corporales</h4>
        <div class="card">
          ${lastMedida ? `
            <p class="muted" style="font-size:12px;margin-bottom:12px">Última medición: ${new Date(lastMedida.fecha).toLocaleDateString('es-ES', {day:'numeric', month:'short', year:'numeric'})}</p>
            <div class="medidas-last-row">
              ${lastMedida.cintura ? `<div class="medida-last-item"><span class="medida-last-val">${lastMedida.cintura}</span><span class="medida-last-label">Cintura (cm)</span></div>` : ''}
              ${lastMedida.caderas ? `<div class="medida-last-item"><span class="medida-last-val">${lastMedida.caderas}</span><span class="medida-last-label">Caderas (cm)</span></div>` : ''}
              ${lastMedida.brazo ? `<div class="medida-last-item"><span class="medida-last-val">${lastMedida.brazo}</span><span class="medida-last-label">Brazo D (cm)</span></div>` : ''}
              ${lastMedida.muslo ? `<div class="medida-last-item"><span class="medida-last-val">${lastMedida.muslo}</span><span class="medida-last-label">Muslo (cm)</span></div>` : ''}
            </div>
          ` : '<p class="muted" style="font-size:13px;margin-bottom:12px">Aún no hay medidas registradas.</p>'}
          <div class="medidas-form">
            <div class="medidas-inputs-grid">
              <div class="medida-input-group">
                <label>Cintura</label>
                <input type="number" id="med-cintura" class="medida-input" placeholder="cm" step="0.1" inputmode="decimal" value="${lastMedida ? lastMedida.cintura || '' : ''}">
              </div>
              <div class="medida-input-group">
                <label>Caderas</label>
                <input type="number" id="med-caderas" class="medida-input" placeholder="cm" step="0.1" inputmode="decimal" value="${lastMedida ? lastMedida.caderas || '' : ''}">
              </div>
              <div class="medida-input-group">
                <label>Brazo D</label>
                <input type="number" id="med-brazo" class="medida-input" placeholder="cm" step="0.1" inputmode="decimal" value="${lastMedida ? lastMedida.brazo || '' : ''}">
              </div>
              <div class="medida-input-group">
                <label>Muslo</label>
                <input type="number" id="med-muslo" class="medida-input" placeholder="cm" step="0.1" inputmode="decimal" value="${lastMedida ? lastMedida.muslo || '' : ''}">
              </div>
            </div>
            <button class="btn btn-sm btn-primary" style="margin-top:12px;width:100%" data-action="save-medidas">Guardar medidas</button>
          </div>
        </div>
      </section>
    </div>`;
}

// ============================================================
// VISTA: HISTORIAL
// ============================================================
function renderHistorial() {
  const workouts = Store.getWorkouts()
    .filter(w => w.completado)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  if (workouts.length === 0) {
    return `
      <div class="view">
        <div class="view-header"><h2 class="view-title">Historial</h2></div>
        <div class="empty-state">
          <p>Aún no has completado ningún entrenamiento.</p>
          <p class="muted">¡Empieza hoy!</p>
        </div>
      </div>`;
  }

  const html = workouts.map(w => {
    const fecha = new Date(w.fecha).toLocaleDateString('es-ES', {weekday:'long', day:'numeric', month:'short'});
    const totalSets = w.bloques.reduce((acc, b) =>
      acc + b.ejercicios.reduce((a, e) => a + e.reps_completadas.filter(r => r !== null).length, 0), 0);
    const duracion = w.duracion_min ? w.duracion_min + ' min' : '—';
    return `
      <div class="card history-card" data-action="toggle-history" data-id="${w.id}">
        <div class="history-header">
          <div>
            <span class="history-tipo">${w.tipo}</span>
            <span class="history-fecha muted">${fecha}</span>
          </div>
          <div class="history-meta">
            <span class="meta-tag">⏱ ${duracion}</span>
            <span class="meta-tag">${totalSets} sets</span>
          </div>
        </div>
        <div class="history-detail hidden" id="detail-${w.id}">
          ${w.bloques.map(b => `
            <div class="history-bloque">
              <strong>${b.nombre}</strong>
              ${b.ejercicios.map(ej => `
                <div class="history-ej">
                  <span>${ej.nombre}</span>
                  <span class="muted">${ej.carga_kg ? ej.carga_kg + ' kg · ' : ''}${ej.reps_completadas.filter(r=>r!==null).join(' / ')} reps</span>
                </div>
              `).join('')}
            </div>
          `).join('')}
        </div>
      </div>`;
  }).join('');

  return `
    <div class="view">
      <div class="view-header">
        <h2 class="view-title">Historial</h2>
        <span class="muted">${workouts.length} sesiones</span>
      </div>
      ${html}
    </div>`;
}

// ============================================================
// VISTA: NUTRICIÓN
// ============================================================
function renderNutricion() {
  const fecha = nutDate;
  const todayStr = new Date().toISOString().split('T')[0];
  const dateObj = new Date(fecha + 'T12:00:00');
  const dayOfWeek = dateObj.getDay();
  const tipoDia = TIPO_DIA_SEMANA[dayOfWeek];
  const targets = MACROS_POR_DIA[tipoDia];

  const log = Store.getNutritionLog(fecha);
  const entries = log.entries || [];

  // Totales del día
  const totals = entries.reduce((acc, e) => ({
    kcal:  acc.kcal  + (e.kcal  || 0),
    prot:  acc.prot  + (e.prot  || 0),
    carbs: acc.carbs + (e.carbs || 0),
    fat:   acc.fat   + (e.fat   || 0),
  }), { kcal: 0, prot: 0, carbs: 0, fat: 0 });

  const isToday = fecha === todayStr;
  const dateLabel = isToday
    ? 'Hoy'
    : dateObj.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });

  // Anillo de calorías
  const pctKcal = Math.min(totals.kcal / targets.kcal, 1);
  const R = 38;
  const circ = +(2 * Math.PI * R).toFixed(1);
  const offset = +(circ * (1 - pctKcal)).toFixed(1);
  const ringColor = totals.kcal > targets.kcal * 1.05 ? 'var(--danger)' : 'var(--primary)';

  // Barra de macros helper
  const macroBar = (label, val, target, color) => {
    const pct = Math.min((val / (target || 1)) * 100, 100).toFixed(1);
    const over = val > target * 1.05;
    return `
      <div class="nut-bar-row">
        <span class="nut-bar-label">${label}</span>
        <div class="nut-bar-track">
          <div class="nut-bar-fill" style="width:${pct}%;background:${over ? 'var(--danger)' : color}"></div>
        </div>
        <span class="nut-bar-val">${Math.round(val)}<span class="muted">/${target}g</span></span>
      </div>`;
  };

  // Secciones de comidas
  const meals = [
    { key: 'desayuno', icon: '☀️', nombre: 'Desayuno' },
    { key: 'almuerzo', icon: '🍽️', nombre: 'Almuerzo' },
    { key: 'cena',     icon: '🌙', nombre: 'Cena' },
    { key: 'snacks',   icon: '🍎', nombre: 'Snacks' },
  ];

  const mealsHtml = meals.map(meal => {
    const mealEntries = entries.filter(e => e.meal === meal.key);
    const mealKcal = mealEntries.reduce((a, e) => a + (e.kcal || 0), 0);
    const entriesHtml = mealEntries.map(entry => `
      <div class="nut-entry">
        <div class="nut-entry-info">
          <span class="nut-entry-name">${entry.nombre}</span>
          <span class="nut-entry-qty muted">${entry.qty}${entry.unit} · P:${Math.round(entry.prot)}g C:${Math.round(entry.carbs)}g G:${Math.round(entry.fat)}g</span>
        </div>
        <div class="nut-entry-right">
          <span class="nut-entry-kcal">${Math.round(entry.kcal)}</span>
          <button class="nut-entry-del" data-action="nut-remove-entry" data-id="${entry.id}" data-fecha="${fecha}">✕</button>
        </div>
      </div>`).join('');
    return `
      <div class="nut-meal-section">
        <div class="nut-meal-header">
          <span class="nut-meal-icon">${meal.icon}</span>
          <span class="nut-meal-nombre">${meal.nombre}</span>
          <span class="nut-meal-kcal muted">${Math.round(mealKcal)} kcal</span>
          <button class="nut-add-btn" data-action="nut-add-food" data-meal="${meal.key}">+</button>
        </div>
        ${entriesHtml ? `<div class="nut-entries">${entriesHtml}</div>` : ''}
      </div>`;
  }).join('');

  return `
    <div class="view">
      <div class="view-header">
        <h2 class="view-title">Nutrición</h2>
      </div>

      <div class="nut-date-bar">
        <button class="nut-date-btn" data-action="nut-prev-day">‹</button>
        <span class="nut-date-label">${dateLabel}</span>
        <button class="nut-date-btn${isToday ? ' disabled' : ''}" data-action="nut-next-day"${isToday ? ' disabled' : ''}>›</button>
      </div>

      <div class="card nut-summary-card">
        <div class="nut-summary-inner">
          <div class="nut-ring-wrap">
            <svg viewBox="0 0 100 100" class="nut-ring-svg">
              <circle cx="50" cy="50" r="${R}" fill="none" stroke="var(--border)" stroke-width="9"/>
              <circle cx="50" cy="50" r="${R}" fill="none" stroke="${ringColor}" stroke-width="9"
                stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${offset}"
                transform="rotate(-90 50 50)" style="transition:stroke-dashoffset 0.6s ease"/>
            </svg>
            <div class="nut-ring-center">
              <span class="nut-ring-val">${Math.round(totals.kcal)}</span>
              <span class="nut-ring-label">/ ${targets.kcal} kcal</span>
              <span class="nut-ring-sub">${targets.label}</span>
            </div>
          </div>
          <div class="nut-macro-bars">
            ${macroBar('Prot', totals.prot, targets.proteina, 'var(--success)')}
            ${macroBar('Carbos', totals.carbs, targets.carbos, 'var(--warning)')}
            ${macroBar('Grasas', totals.fat, targets.grasa, '#8B5CF6')}
          </div>
        </div>
        <div class="nut-remaining-row">
          <span>Restante</span>
          <strong style="color:${totals.kcal > targets.kcal ? 'var(--danger)' : 'var(--success)'}">
            ${totals.kcal > targets.kcal ? '+' : ''}${Math.round(totals.kcal - targets.kcal)} kcal
          </strong>
        </div>
      </div>

      <div class="nut-meals">
        ${mealsHtml}
      </div>

      <section>
        <h4 class="section-title">Suplementación activa</h4>
        <div class="card">
          <div class="suplement-row">
            <span class="sup-icon">🐟</span>
            <div><strong>Omega-3</strong><p class="muted">2 cápsulas con el desayuno</p></div>
          </div>
          <div class="suplement-row">
            <span class="sup-icon">🧘‍♀️</span>
            <div><strong>Magnesio bisglicinato</strong><p class="muted">1 cápsula antes de dormir</p></div>
          </div>
          <div class="suplement-row pending">
            <span class="sup-icon">☀️</span>
            <div><strong>Vitamina D3+K2</strong><p class="muted">Pendiente de incorporar</p></div>
          </div>
        </div>
      </section>
    </div>`;
}

// ============================================================
// VISTA: AJUSTES
// ============================================================
function renderAjustes() {
  const config = Store.getConfig();
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return `
    <div class="view">
      <div class="view-header">
        <h2 class="view-title">Ajustes</h2>
      </div>

      <section>
        <h4 class="section-title">Apariencia</h4>
        <div class="card">
          <div class="config-row">
            <span>Modo oscuro</span>
            <button class="toggle-switch ${isDark ? 'on' : ''}" data-action="toggle-theme">
              <div class="toggle-knob"></div>
            </button>
          </div>
        </div>
      </section>

      <section>
        <h4 class="section-title">Estado actual</h4>
        <div class="card">
          <div class="config-row">
            <span>Fase actual</span>
            <strong>Fase ${config.fase} — ${config.fase === 1 ? 'Base' : config.fase === 2 ? 'Consolidación' : 'Intensificación'}</strong>
          </div>
          <div class="config-row">
            <span>Semana</span>
            <strong>Semana ${Store.getSemanaActual()} de 4</strong>
          </div>
          <div class="config-row">
            <span>Inicio del ciclo</span>
            <strong>${config.fecha_inicio || '—'}</strong>
          </div>
        </div>
      </section>

      <section>
        <h4 class="section-title">Importar nueva fase</h4>
        <div class="card">
          <p class="muted">Cuando Claude te pase la rutina de la siguiente fase, pégala aquí.</p>
          <textarea id="import-textarea" class="import-textarea"
            placeholder="Pega aquí el JSON de la nueva fase o los datos que te dé Claude..."></textarea>
          <button class="btn btn-primary" data-action="import-fase">Importar</button>
        </div>
      </section>

      <section>
        <h4 class="section-title">Sync con la nube ☁️</h4>
        <div class="card">
          <p class="muted" style="font-size:13px;margin-bottom:12px">Conecta tu proyecto de Supabase para sincronizar automáticamente entre todos tus dispositivos.</p>
          <label style="font-size:12px;font-weight:700;color:var(--text-mid);display:block;margin-bottom:6px">URL del proyecto</label>
          <input type="text" id="sb-url-input" class="medida-input" style="font-size:13px;font-weight:400;width:100%;margin-bottom:10px"
            value="${Store.getSupabaseConfig().url}" placeholder="https://xxxx.supabase.co">
          <label style="font-size:12px;font-weight:700;color:var(--text-mid);display:block;margin-bottom:6px">Anon key</label>
          <input type="password" id="sb-key-input" class="medida-input" style="font-size:13px;font-weight:400;font-family:monospace;width:100%;margin-bottom:12px"
            value="${Store.getSupabaseConfig().key}" placeholder="eyJ...">
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary" style="flex:1" data-action="save-supabase-config">Guardar</button>
            <button class="btn btn-secondary" style="flex:1" data-action="sync-now">Sincronizar ahora</button>
          </div>
          ${Store.getLastSyncedAt() ? `<p style="font-size:11px;color:var(--text-mid);margin-top:8px">Última sync: ${new Date(Store.getLastSyncedAt()).toLocaleString('es-ES')}</p>` : ''}
        </div>
      </section>

      <section>
        <h4 class="section-title">Datos</h4>
        <div class="card">
          <button class="btn btn-secondary" data-action="export-data">📤 Exportar mis datos (archivo)</button>
          <div class="import-file-row">
            <label class="btn btn-secondary" for="import-file-input">📥 Importar backup (archivo)</label>
            <input type="file" id="import-file-input" accept=".json" style="display:none">
          </div>
        </div>
      </section>

      <section>
        <h4 class="section-title">Inteligencia artificial</h4>
        <div class="card">
          <p class="muted" style="font-size:13px;margin-bottom:10px">Tu clave de Anthropic se usa solo en tu dispositivo para calcular macros de recetas caseras en el log de nutrición.</p>
          <label style="font-size:12px;font-weight:700;color:var(--text-mid);display:block;margin-bottom:6px">Clave API Anthropic</label>
          <div style="display:flex;gap:8px">
            <input type="password" id="anthropic-key-input" class="medida-input"
              style="font-size:13px;font-weight:400;font-family:monospace;flex:1"
              value="${Store.getAnthropicKey()}"
              placeholder="sk-ant-api03-...">
            <button class="btn btn-primary" style="flex-shrink:0;padding:0 14px" data-action="save-anthropic-key">Guardar</button>
          </div>
          ${Store.getAnthropicKey() ? '<p style="font-size:11px;color:var(--success);margin-top:6px">✓ Clave configurada</p>' : ''}
        </div>
      </section>

      <section>
        <h4 class="section-title">Reglas de entrenamiento</h4>
        <div class="card rules-card">
          <ul class="rules-list">
            <li>🦴 Escoliosis: sin cargas axiales pesadas ni flexión lumbar bajo fatiga</li>
            <li>⚡ Fallo solo en último set de aislamientos (nunca en compuestos)</li>
            <li>📊 Compuestos a RIR 1–2 siempre</li>
            <li>🔢 Máximo 3 sets por ejercicio</li>
            <li>🧠 Core siempre: anti-extensión + anti-rotación + lateral</li>
            <li>🎾 No destrozar piernas antes del tenis (martes)</li>
            <li>⏱ Sesión máx. 45–60 min</li>
          </ul>
        </div>
      </section>
    </div>`;
}

// ============================================================
// CHARTS (Chart.js)
// ============================================================
let chartCargas = null;
let chartPeso = null;

function renderCharts() {
  renderChartCargas('Hip thrust con mancuerna');
  renderChartPeso();

  const select = document.getElementById('chart-ejercicio-select');
  if (select) {
    select.addEventListener('change', (e) => renderChartCargas(e.target.value));
  }
}

function renderChartCargas(ejercicioNombre) {
  const workouts = Store.getWorkouts().filter(w => w.completado)
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  const labels = [];
  const data = [];

  workouts.forEach(w => {
    w.bloques.forEach(b => {
      b.ejercicios.forEach(ej => {
        if (ej.nombre === ejercicioNombre && ej.carga_kg !== null) {
          labels.push(new Date(w.fecha).toLocaleDateString('es-ES', {day:'numeric', month:'short'}));
          data.push(ej.carga_kg);
        }
      });
    });
  });

  const canvas = document.getElementById('chart-cargas');
  if (!canvas) return;

  if (chartCargas) chartCargas.destroy();
  chartCargas = new Chart(canvas, {
    type: 'line',
    data: {
      labels: labels.length ? labels : ['—'],
      datasets: [{
        label: 'kg',
        data: data.length ? data : [0],
        borderColor: '#6c63ff',
        backgroundColor: '#6c63ff22',
        tension: 0.3,
        fill: true,
        pointBackgroundColor: '#6c63ff',
        pointRadius: 5,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: false, grid: { color: '#ffffff11' }, ticks: { color: '#94a3b8' } },
        x: { grid: { color: '#ffffff11' }, ticks: { color: '#94a3b8' } }
      }
    }
  });
}

function renderChartPeso() {
  const log = Store.getWeightLog().sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  const labels = log.map(e => new Date(e.fecha).toLocaleDateString('es-ES', {day:'numeric', month:'short'}));
  const data = log.map(e => e.kg);

  const canvas = document.getElementById('chart-peso');
  if (!canvas) return;

  if (chartPeso) chartPeso.destroy();
  chartPeso = new Chart(canvas, {
    type: 'line',
    data: {
      labels: labels.length ? labels : ['—'],
      datasets: [{
        label: 'kg',
        data: data.length ? data : [null],
        borderColor: '#22c55e',
        backgroundColor: '#22c55e22',
        tension: 0.3,
        fill: true,
        pointBackgroundColor: '#22c55e',
        pointRadius: 5,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { grid: { color: '#ffffff11' }, ticks: { color: '#94a3b8' } },
        x: { grid: { color: '#ffffff11' }, ticks: { color: '#94a3b8' } }
      }
    }
  });
}

// ============================================================
// EVENT LISTENERS
// ============================================================
function attachEventListeners() {
  const container = document.getElementById('view-container');

  container.onclick = (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    handleAction(btn.dataset.action, btn.dataset, e);
  };

  container.oninput = (e) => {
    if (e.target.id === 'reps-0' || e.target.classList.contains('reps-input')) {
      // handled on complete-set click
    }
  };
}

function handleAction(action, dataset, e) {
  switch (action) {
    case 'nav': navigate(dataset.view); break;

    case 'iniciar-workout': {
      activeWorkout = Store.createTodayWorkout();
      if (!activeWorkout) return;
      startTimer();
      navigate('workout');
      break;
    }

    case 'continuar-workout': {
      activeWorkout = Store.getWorkoutById(dataset.id);
      if (!activeWorkout) return;
      startTimer();
      navigate('workout');
      break;
    }

    case 'pause-workout': {
      stopTimer();
      activeWorkout = null;
      navigate('hoy');
      break;
    }

    case 'complete-exercise': {
      const ejIdx = parseInt(dataset.ej);
      const repsInput = document.getElementById(`reps-${ejIdx}`);
      const ej = activeWorkout.bloques[activeWorkout.bloque_actual].ejercicios[ejIdx];
      const reps = (repsInput ? parseInt(repsInput.value) : null) || ej.reps_objetivo;

      // Marcar todas las series de golpe
      ej.reps_completadas = ej.reps_completadas.map(() => reps);

      // Guardar RIR
      const rirBtn = document.querySelector('.rir-btn.selected');
      if (rirBtn) ej.rir_ultimo_set = parseInt(rirBtn.dataset.rir);

      // Actualizar carga en store
      if (ej.carga_kg !== null) Store.saveCarga(ej.nombre, ej.carga_kg);

      // Verificar récord personal
      if (ej.carga_kg && Store.checkAndSavePR(ej.nombre, ej.carga_kg)) {
        showToast('🏆 ¡Nuevo récord personal! ' + ej.nombre, 'pr');
      }

      Store.saveWorkout(activeWorkout);
      navigate('workout');
      break;
    }

    case 'set-rir': {
      document.querySelectorAll('.rir-btn').forEach(b => b.classList.remove('selected'));
      e.target.classList.add('selected');
      break;
    }

    case 'carga-plus': {
      const ejIdx = parseInt(dataset.ej);
      const ej = activeWorkout.bloques[activeWorkout.bloque_actual].ejercicios[ejIdx];
      ej.carga_kg = (ej.carga_kg || 0) + 2.5;
      Store.saveWorkout(activeWorkout);
      document.getElementById(`carga-${ejIdx}`).textContent = ej.carga_kg + ' kg';
      break;
    }

    case 'carga-minus': {
      const ejIdx = parseInt(dataset.ej);
      const ej = activeWorkout.bloques[activeWorkout.bloque_actual].ejercicios[ejIdx];
      ej.carga_kg = Math.max(0, (ej.carga_kg || 0) - 2.5);
      Store.saveWorkout(activeWorkout);
      document.getElementById(`carga-${ejIdx}`).textContent = ej.carga_kg + ' kg';
      break;
    }

    case 'reps-plus': {
      const input = document.getElementById(`reps-${dataset.ej}`);
      if (input) input.value = parseInt(input.value) + 1;
      break;
    }

    case 'reps-minus': {
      const input = document.getElementById(`reps-${dataset.ej}`);
      if (input) input.value = Math.max(1, parseInt(input.value) - 1);
      break;
    }

    case 'next-bloque': {
      activeWorkout.bloque_actual++;
      activeWorkout.ejercicio_actual = 0;
      Store.saveWorkout(activeWorkout);
      navigate('workout');
      break;
    }

    case 'finish-workout': {
      skipRest();
      navigate('workout', { finish: true });
      // Re-render finish screen
      document.getElementById('view-container').innerHTML = renderWorkoutFinish();
      attachEventListeners();
      // Confetti!
      if (typeof confetti !== 'undefined') {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#5B63D4','#7B82E0','#4A82D4','#3DAA6F'] });
      }
      break;
    }

    case 'set-sensation': {
      if (activeWorkout) {
        activeWorkout.sensacion = parseInt(dataset.val);
        document.querySelectorAll('.sensation-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
      }
      break;
    }

    case 'save-finish-workout': {
      if (activeWorkout) {
        activeWorkout.completado = true;
        activeWorkout.duracion_min = Math.round(workoutSeconds / 60);
        Store.saveWorkout(activeWorkout);
        stopTimer();
        activeWorkout = null;
        navigate('hoy');
        syncToSupabase();
      }
      break;
    }

    case 'save-peso': {
      const input = document.getElementById('peso-input');
      if (input && input.value) {
        const today = new Date().toISOString().split('T')[0];
        Store.saveWeight(today, parseFloat(input.value));
        input.value = '';
        renderChartPeso();
        showToast('Peso registrado ✓');
        syncToSupabase();
      }
      break;
    }

    case 'save-supabase-config': {
      const url = document.getElementById('sb-url-input')?.value.trim();
      const key = document.getElementById('sb-key-input')?.value.trim();
      if (url && key) {
        Store.saveSupabaseConfig({ url, key });
        showToast('Configuración de Supabase guardada ✓');
        syncFromSupabase();
      } else {
        showToast('Rellena la URL y la anon key', 'error');
      }
      break;
    }

    case 'sync-now': {
      showToast('Sincronizando...');
      syncFromSupabase().then(() => syncToSupabase());
      break;
    }

    case 'export-data': {
      const data = Store.exportAll();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sol-fitness-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      break;
    }

    case 'import-fase': {
      const textarea = document.getElementById('import-textarea');
      if (textarea && textarea.value) {
        const ok = Store.importAll(textarea.value);
        if (ok) { showToast('Importado correctamente ✓'); navigate('hoy'); }
        else showToast('Error al importar. Revisa el formato.', 'error');
      }
      break;
    }

    case 'log-actividad-dia': {
      const dia = dataset.dia;
      const ACTIVIDADES = [
        { id:'caminata',  icon:'🚶‍♀️', nombre:'Caminata',          tipo:'cardio' },
        { id:'ebike',     icon:'🚴‍♀️', nombre:'E-bike',             tipo:'cardio' },
        { id:'tenis',     icon:'🎾',   nombre:'Tenis',              tipo:'deporte' },
        { id:'gym_extra', icon:'🏋️',  nombre:'Gym (extra)',        tipo:'fuerza' },
        { id:'yoga',      icon:'🧘‍♀️', nombre:'Yoga / Movilidad',  tipo:'recuperacion' },
        { id:'natacion',  icon:'🏊‍♀️', nombre:'Natación',           tipo:'cardio' },
        { id:'otro',      icon:'⚡',   nombre:'Otra actividad',     tipo:'otro' },
      ];
      // Mostrar modal
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal">
          <div class="modal-header">
            <h3>¿Qué hiciste ${dia === 'hoy' ? 'hoy' : 'el ' + dia}?</h3>
            <button class="modal-close" id="modal-close">✕</button>
          </div>
          <div class="actividades-grid">
            ${ACTIVIDADES.map(a => `
              <button class="actividad-btn" data-act-id="${a.id}" data-act-icon="${a.icon}" data-act-nombre="${a.nombre}" data-act-dia="${dia}">
                <span class="act-icon">${a.icon}</span>
                <span class="act-nombre">${a.nombre}</span>
              </button>`).join('')}
          </div>
          <div class="modal-duracion">
            <label>Duración (opcional)</label>
            <div class="dur-options">
              ${['30 min','45 min','1h','1h 30min','2h'].map(d =>
                `<button class="dur-btn" data-dur="${d}">${d}</button>`).join('')}
            </div>
          </div>
        </div>`;
      document.body.appendChild(modal);
      let selectedDur = null;
      modal.querySelector('#modal-close').onclick = () => modal.remove();
      modal.querySelector('.dur-options').onclick = (ev) => {
        const btn = ev.target.closest('.dur-btn');
        if (!btn) return;
        modal.querySelectorAll('.dur-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedDur = btn.dataset.dur;
      };
      modal.querySelector('.actividades-grid').onclick = (ev) => {
        const btn = ev.target.closest('.actividad-btn');
        if (!btn) return;
        const today = new Date().toISOString().split('T')[0];
        Store.saveActividad(today, btn.dataset.actDia, {
          id: btn.dataset.actId,
          icon: btn.dataset.actIcon,
          nombre: btn.dataset.actNombre,
          duracion: selectedDur
        });
        modal.remove();
        showToast(`${btn.dataset.actIcon} ${btn.dataset.actNombre} registrado ✓`);
        navigate('hoy');
      };
      modal.onclick = (ev) => { if (ev.target === modal) modal.remove(); };
      break;
    }

    case 'ver-sesion': {
      const diaVer = dataset.dia;
      const fase = FASES[Store.getConfig().fase];
      const sesion = fase ? fase.sesiones[diaVer] : null;
      if (!sesion) return;
      const dias = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
      const diaKey = dias[new Date().getDay()];
      const isToday = diaVer === diaKey;
      const zonas = ZONAS_POR_DIA[diaVer] || [];
      const zonasHtml = zonas.map(z => {
        const zona = ZONAS_DISPLAY[z];
        return `<span class="zona-tag" style="background:${zona.color}22;color:${zona.color}">${zona.nombre}</span>`;
      }).join('');
      const ejerciciosHtml = sesion.bloques.map(b => `
        <div class="sesion-bloque">
          <div class="sesion-bloque-header">
            <strong>${b.nombre}</strong>
            ${b.formato === 'descanso_activo' ? '<span class="descanso-badge">↔ Descanso activo</span>' : ''}
          </div>
          ${b.ejercicios.map(ej => `
            <div class="sesion-ej">
              <span class="sesion-ej-id">${ej.id}</span>
              <div class="sesion-ej-info">
                <span class="sesion-ej-nombre">${ej.nombre}</span>
                <span class="sesion-ej-meta muted">${ej.series}×${ej.reps_objetivo || (ej.duracion_seg+'seg')} ${ej.reps_por ? '/ '+ej.reps_por : ''} ${ej.carga_inicial_kg ? '· '+ej.carga_inicial_kg+'kg' : ''}</span>
                <span class="sesion-ej-desc muted">${ej.descripcion}</span>
              </div>
            </div>
          `).join('')}
        </div>
      `).join('');
      const container = document.getElementById('view-container');
      container.innerHTML = `
        <div class="view">
          <div class="view-header">
            <button class="back-btn" data-action="nav" data-view="hoy">← Volver</button>
          </div>
          <div class="card workout-today-card">
            <div class="card-header">
              <span class="session-badge">${sesion.id}</span>
              <span class="duration-badge">⏱ ${sesion.duracion_objetivo}</span>
            </div>
            <h3>${sesion.nombre}</h3>
            <div class="zonas-wrap">${zonasHtml}</div>
            <div class="warmup-info">
              <span class="warmup-label">🔥 Warm-up:</span>
              <span class="muted">${sesion.warmup}</span>
            </div>
            ${isToday ? `<button class="btn btn-primary" data-action="iniciar-workout" data-dia="${diaVer}">▶ Iniciar entrenamiento</button>` : ''}
          </div>
          <div class="card">${ejerciciosHtml}</div>
        </div>`;
      // Estilos inline para sesion-bloque
      attachEventListeners();
      break;
    }

    case 'toggle-theme': {
      const html = document.documentElement;
      const isDark = html.getAttribute('data-theme') === 'dark';
      html.setAttribute('data-theme', isDark ? 'light' : 'dark');
      localStorage.setItem('sol_theme', isDark ? 'light' : 'dark');
      // Re-render ajustes para actualizar el toggle
      navigate('ajustes');
      break;
    }

    case 'toggle-history': {
      const detail = document.getElementById(`detail-${dataset.id}`);
      if (detail) detail.classList.toggle('hidden');
      break;
    }

    case 'share-workout': {
      if (activeWorkout) generateShareCard(activeWorkout);
      break;
    }

    case 'save-medidas': {
      const cintura = document.getElementById('med-cintura')?.value;
      const caderas = document.getElementById('med-caderas')?.value;
      const brazo   = document.getElementById('med-brazo')?.value;
      const muslo   = document.getElementById('med-muslo')?.value;
      if (cintura || caderas || brazo || muslo) {
        const today = new Date().toISOString().split('T')[0];
        Store.saveMedida(today, {
          cintura: cintura ? parseFloat(cintura) : null,
          caderas: caderas ? parseFloat(caderas) : null,
          brazo:   brazo   ? parseFloat(brazo)   : null,
          muslo:   muslo   ? parseFloat(muslo)   : null,
        });
        showToast('Medidas guardadas ✓');
        syncToSupabase();
        navigate('progreso');
      }
      break;
    }

    case 'toggle-weekly-summary': {
      const body  = document.getElementById('weekly-summary-body');
      const arrow = document.getElementById('summary-arrow');
      if (body) {
        body.classList.toggle('hidden');
        if (arrow) arrow.textContent = body.classList.contains('hidden') ? '›' : '˅';
      }
      break;
    }

    case 'nut-prev-day': {
      const d = new Date(nutDate + 'T12:00:00');
      d.setDate(d.getDate() - 1);
      nutDate = d.toISOString().split('T')[0];
      navigate('nutricion');
      break;
    }

    case 'nut-next-day': {
      const todayStr = new Date().toISOString().split('T')[0];
      const d = new Date(nutDate + 'T12:00:00');
      d.setDate(d.getDate() + 1);
      const next = d.toISOString().split('T')[0];
      if (next <= todayStr) { nutDate = next; navigate('nutricion'); }
      break;
    }

    case 'nut-add-food': {
      openAddFoodModal(dataset.meal);
      break;
    }

    case 'nut-remove-entry': {
      Store.removeNutritionEntry(dataset.fecha, dataset.id);
      navigate('nutricion');
      break;
    }

    case 'save-anthropic-key': {
      const input = document.getElementById('anthropic-key-input');
      if (input) {
        Store.saveAnthropicKey(input.value.trim());
        showToast('Clave guardada ✓');
        navigate('ajustes');
      }
      break;
    }
  }
}

// ============================================================
// TIMER
// ============================================================
function startTimer() {
  workoutSeconds = 0;
  clearInterval(workoutTimer);
  workoutTimer = setInterval(() => {
    workoutSeconds++;
    const el = document.getElementById('workout-timer');
    if (el) el.textContent = formatTimer(workoutSeconds);
  }, 1000);
}

function stopTimer() {
  clearInterval(workoutTimer);
  workoutTimer = null;
}

function formatTimer(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ============================================================
// TOAST
// ============================================================
function showToast(msg, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('visible'), 10);
  setTimeout(() => { toast.classList.remove('visible'); setTimeout(() => toast.remove(), 300); }, 2500);
}

// ============================================================
// REST TIMER
// ============================================================
let restTimerInterval = null;
let restSeconds = 60;
let restTotal = 60;

function startRestTimer(seconds) {
  skipRest(); // clear any existing
  restSeconds = seconds;
  restTotal = seconds;

  // Remove existing overlay if any
  const existing = document.getElementById('rest-timer');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'rest-timer-overlay';
  overlay.id = 'rest-timer';
  overlay.innerHTML = `
    <div class="rest-timer-content">
      <svg class="rest-ring" viewBox="0 0 60 60">
        <circle class="rest-ring-bg" cx="30" cy="30" r="26" fill="none" stroke-width="4"/>
        <circle class="rest-ring-progress" id="rest-ring-arc" cx="30" cy="30" r="26" fill="none" stroke-width="4" stroke-linecap="round"
          stroke-dasharray="163.4" stroke-dashoffset="0" transform="rotate(-90 30 30)"/>
      </svg>
      <div class="rest-timer-number" id="rest-countdown">${seconds}</div>
      <div class="rest-timer-label">Descanso</div>
    </div>
    <div class="rest-timer-actions">
      <button class="rest-btn" onclick="setRestDuration(90)">90s</button>
      <button class="rest-btn" onclick="setRestDuration(120)">2min</button>
      <button class="rest-btn rest-btn-skip" onclick="skipRest()">Saltar →</button>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));

  restTimerInterval = setInterval(() => {
    restSeconds--;
    const el = document.getElementById('rest-countdown');
    const arc = document.getElementById('rest-ring-arc');
    if (el) el.textContent = restSeconds;
    if (arc) {
      const pct = restSeconds / restTotal;
      arc.style.strokeDashoffset = (163.4 * (1 - pct)).toString();
    }
    if (restSeconds <= 0) {
      clearInterval(restTimerInterval);
      restTimerInterval = null;
      navigator.vibrate && navigator.vibrate([200, 100, 200]);
      setTimeout(() => skipRest(), 800);
    }
  }, 1000);
}

function skipRest() {
  clearInterval(restTimerInterval);
  restTimerInterval = null;
  const overlay = document.getElementById('rest-timer');
  if (overlay) {
    overlay.classList.remove('visible');
    setTimeout(() => overlay.remove(), 300);
  }
}

function setRestDuration(s) {
  startRestTimer(s);
}

// ============================================================
// SWIPE TO COMPLETE SET
// ============================================================
function attachSwipeListeners() {
  let startX = 0;
  document.querySelectorAll('.exercise-card:not(.done)').forEach((card, cardIdx) => {
    card.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    card.addEventListener('touchend', e => {
      const diff = e.changedTouches[0].clientX - startX;
      if (diff > 70) {
        const ejIdx = parseInt(card.dataset.ejIdx || cardIdx);
        const nextSetBtn = card.querySelector('[data-action="complete-set"]');
        if (nextSetBtn) nextSetBtn.click();
      }
    }, { passive: true });
  });
}

// ============================================================
// MUSCLE MAP COLORING
// ============================================================
function renderMuscleMap() {
  const weekWorkouts = Store.getWorkoutsThisWeek();
  const zonasThisWeek = new Set();
  weekWorkouts.forEach(w => {
    const zonas = ZONAS_POR_DIA[w.dia] || [];
    zonas.forEach(z => zonasThisWeek.add(z));
  });

  // Reset all zones to default
  document.querySelectorAll('.body-svg [class^="zone-"]').forEach(el => {
    el.style.fill = '';
    el.style.opacity = '';
  });

  zonasThisWeek.forEach(z => {
    const zona = ZONAS_DISPLAY[z];
    if (!zona) return;
    document.querySelectorAll(`.zone-${z}`).forEach(el => {
      el.style.fill = zona.color;
      el.style.opacity = '0.85';
    });
  });
}

// ============================================================
// SHARE CARD
// ============================================================
function generateShareCard(workout) {
  const canvas = document.createElement('canvas');
  canvas.width = 800; canvas.height = 800;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 800, 800);
  grad.addColorStop(0, '#5B63D4');
  grad.addColorStop(1, '#1A1B3A');
  ctx.fillStyle = grad;
  if (ctx.roundRect) {
    ctx.roundRect(0, 0, 800, 800, 40);
  } else {
    ctx.rect(0, 0, 800, 800);
  }
  ctx.fill();

  ctx.globalAlpha = 0.1;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(680, 120, 180, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(100, 650, 120, 0, Math.PI*2); ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SOL FITNESS', 400, 80);

  ctx.font = '100px serif';
  ctx.fillText('🏆', 400, 260);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 48px sans-serif';
  ctx.fillText(workout.tipo, 400, 350);

  const dur = workout.duracion_min ? workout.duracion_min + ' min' : '—';
  const sets = workout.bloques.reduce((a,b) => a + b.ejercicios.reduce((c,e) => c + e.reps_completadas.filter(r=>r!==null).length, 0), 0);
  ctx.font = '32px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(`${dur}  ·  ${sets} sets`, 400, 430);

  ctx.font = '26px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText(new Date(workout.fecha).toLocaleDateString('es-ES', {weekday:'long', day:'numeric', month:'long'}), 400, 500);

  ctx.font = 'bold 36px sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText('Entrenamiento completado', 400, 660);

  const link = document.createElement('a');
  link.download = `sol-fitness-${workout.fecha}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// ============================================================
// NUTRITION — MODAL DE AÑADIR ALIMENTO
// ============================================================

function openAddFoodModal(meal) {
  nutCurrentMeal = meal;
  nutSelectedFood = null;
  const mealNames = { desayuno: 'Desayuno', almuerzo: 'Almuerzo', cena: 'Cena', snacks: 'Snacks' };

  const recent = Store.getRecentFoods().slice(0, 6);
  const custom = Store.getFoodsDB();

  const buildFoodRow = (f) => {
    const safeData = JSON.stringify(f).replace(/'/g, '&#39;');
    return `
      <button class="nut-food-row" data-food='${safeData}' data-action="nut-select-food">
        <div class="nut-food-info">
          <span class="nut-food-name">${f.nombre}${f.source === 'custom' ? ' <span class="nut-custom-badge">propio</span>' : ''}</span>
          <span class="nut-food-meta">${f.kcal100} kcal/100g · P:${f.prot100}g C:${f.carbs100}g G:${f.fat100}g</span>
        </div>
        <span class="nut-food-kcal-badge">${f.kcal100}</span>
      </button>`;
  };

  const recentHtml = recent.length
    ? `<div class="nut-modal-section-title">Recientes</div>${recent.map(buildFoodRow).join('')}`
    : '';
  const customHtml = custom.length
    ? `<div class="nut-modal-section-title">Mis alimentos</div>${custom.map(buildFoodRow).join('')}`
    : '';
  const emptyHint = !recentHtml && !customHtml
    ? '<p class="nut-empty-hint muted">Busca un alimento o escanea el código de barras</p>'
    : '';

  const modal = document.createElement('div');
  modal.id = 'nut-add-modal';
  modal.className = 'nut-modal-overlay';
  modal.innerHTML = `
    <div class="nut-modal">
      <div class="nut-modal-header">
        <span>Añadir a ${mealNames[meal]}</span>
        <button class="modal-close" data-action="nut-close-modal">✕</button>
      </div>
      <div class="nut-modal-search-bar">
        <input type="text" id="nut-search-input" class="nut-search-input" placeholder="Buscar alimento..." autocomplete="off">
        <button class="nut-barcode-btn" id="nut-barcode-btn" title="Escanear código de barras">📷</button>
      </div>
      <div id="nut-search-results" class="nut-search-results">
        ${recentHtml}${customHtml}${emptyHint}
      </div>
      <button class="nut-create-btn" data-action="nut-open-custom">+ Crear alimento propio</button>
    </div>`;
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('visible'));

  // Event handlers
  modal.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'nut-close-modal') { closeNutModal(); return; }
    if (btn.dataset.action === 'nut-open-custom') { openCustomFoodModal(); return; }
    if (btn.dataset.action === 'nut-select-food') {
      try { nutSelectedFood = JSON.parse(btn.dataset.food); } catch { return; }
      openPortionModal(nutSelectedFood);
    }
  });

  const searchInput = modal.querySelector('#nut-search-input');
  searchInput.addEventListener('input', (ev) => {
    clearTimeout(nutSearchTimeout);
    const q = ev.target.value.trim();
    const resultsEl = document.getElementById('nut-search-results');
    if (q.length < 2) {
      if (resultsEl) resultsEl.innerHTML = recentHtml + customHtml + emptyHint;
      return;
    }
    nutSearchTimeout = setTimeout(() => doFoodSearch(q), 500);
  });

  modal.querySelector('#nut-barcode-btn').addEventListener('click', openBarcodeScanner);
  setTimeout(() => searchInput.focus(), 300);
}

function closeNutModal() {
  ['nut-add-modal', 'nut-portion-modal', 'nut-custom-modal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('visible'); setTimeout(() => el.remove(), 300); }
  });
}

async function doFoodSearch(query) {
  const resultsEl = document.getElementById('nut-search-results');
  if (!resultsEl) return;
  resultsEl.innerHTML = '<div class="nut-loading">Buscando...</div>';

  const custom = Store.getFoodsDB().filter(f => f.nombre.toLowerCase().includes(query.toLowerCase()));

  const buildRow = (f) => {
    const safeData = JSON.stringify(f).replace(/'/g, '&#39;');
    return `<button class="nut-food-row" data-food='${safeData}' data-action="nut-select-food">
      <div class="nut-food-info">
        <span class="nut-food-name">${f.nombre}${f.source === 'custom' ? ' <span class="nut-custom-badge">propio</span>' : ''}</span>
        <span class="nut-food-meta">${f.kcal100} kcal/100g · P:${f.prot100}g C:${f.carbs100}g G:${f.fat100}g</span>
      </div>
      <span class="nut-food-kcal-badge">${f.kcal100}</span>
    </button>`;
  };

  const customHtml = custom.map(buildRow).join('');

  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&action=process&page_size=25&sort_by=unique_scans_n&fields=product_name,brands,nutriments,code`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    const data = await resp.json();
    const products = (data.products || []).filter(p =>
      p.product_name &&
      p.nutriments &&
      (p.nutriments['energy-kcal_100g'] || p.nutriments['energy-kcal']) > 0
    );

    const offHtml = products.map(p => {
      const n = p.nutriments;
      const kcal = Math.round(n['energy-kcal_100g'] || n['energy-kcal'] || 0);
      const food = {
        id: 'off_' + (p.code || Date.now()),
        nombre: p.product_name + (p.brands ? ` — ${p.brands}` : ''),
        kcal100: kcal,
        prot100:  Math.round((n.proteins_100g        || 0) * 10) / 10,
        carbs100: Math.round((n.carbohydrates_100g   || 0) * 10) / 10,
        fat100:   Math.round((n.fat_100g             || 0) * 10) / 10,
        source: 'off'
      };
      return buildRow(food);
    }).join('');

    if (!offHtml && !customHtml) {
      resultsEl.innerHTML = '<p class="nut-empty-hint muted">Sin resultados. Prueba en inglés o con otro nombre.</p>';
    } else {
      resultsEl.innerHTML = (customHtml ? `<div class="nut-modal-section-title">Mis alimentos</div>${customHtml}` : '')
        + (offHtml ? `<div class="nut-modal-section-title">Resultados</div>${offHtml}` : '');
    }
  } catch {
    resultsEl.innerHTML = customHtml
      ? `<div class="nut-modal-section-title">Mis alimentos</div>${customHtml}`
      : '<p class="nut-empty-hint muted">Error de red. Comprueba tu conexión.</p>';
  }
}

function openPortionModal(food) {
  const existing = document.getElementById('nut-portion-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'nut-portion-modal';
  modal.className = 'nut-portion-modal';
  modal.innerHTML = `
    <div class="nut-portion-header">
      <span class="nut-portion-title">${food.nombre}</span>
      <button class="modal-close" onclick="document.getElementById('nut-portion-modal').remove()">✕</button>
    </div>
    <div class="nut-portion-body">
      <div class="nut-portion-qty-row">
        <button class="nut-qty-btn" onclick="adjustQty(-10)">−</button>
        <input type="number" id="nut-qty-input" class="nut-qty-input" value="100" min="1" max="9999">
        <button class="nut-qty-btn" onclick="adjustQty(10)">+</button>
        <select id="nut-unit-select" class="nut-unit-select">
          <option value="g">g</option>
          <option value="ml">ml</option>
          <option value="uds">uds</option>
        </select>
      </div>
      <div class="nut-portion-preview" id="nut-portion-preview">
        ${calcPortionPreview(food, 100)}
      </div>
      <button class="btn btn-primary nut-confirm-btn" onclick="confirmAddFood()">Añadir a ${nutCurrentMeal}</button>
    </div>`;
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('visible'));

  modal.querySelector('#nut-qty-input').addEventListener('input', (ev) => {
    const qty = parseFloat(ev.target.value) || 0;
    const preview = document.getElementById('nut-portion-preview');
    if (preview) preview.innerHTML = calcPortionPreview(food, qty);
  });
}

function calcPortionPreview(food, qty) {
  const f = qty / 100;
  const kcal  = Math.round((food.kcal100  || 0) * f);
  const prot  = Math.round((food.prot100  || 0) * f * 10) / 10;
  const carbs = Math.round((food.carbs100 || 0) * f * 10) / 10;
  const fat   = Math.round((food.fat100   || 0) * f * 10) / 10;
  return `
    <div class="nut-preview-row">
      <span class="nut-preview-big">${kcal}<small> kcal</small></span>
      <span>P <strong>${prot}g</strong></span>
      <span>C <strong>${carbs}g</strong></span>
      <span>G <strong>${fat}g</strong></span>
    </div>`;
}

function adjustQty(delta) {
  const input = document.getElementById('nut-qty-input');
  if (!input) return;
  input.value = Math.max(1, (parseFloat(input.value) || 0) + delta);
  if (nutSelectedFood) {
    const preview = document.getElementById('nut-portion-preview');
    if (preview) preview.innerHTML = calcPortionPreview(nutSelectedFood, parseFloat(input.value));
  }
}

function confirmAddFood() {
  if (!nutSelectedFood || !nutCurrentMeal) return;
  const qty  = parseFloat(document.getElementById('nut-qty-input')?.value) || 100;
  const unit = document.getElementById('nut-unit-select')?.value || 'g';
  const f = qty / 100;

  const entry = {
    id: 'e_' + Date.now(),
    meal: nutCurrentMeal,
    nombre: nutSelectedFood.nombre,
    qty, unit,
    kcal:  Math.round((nutSelectedFood.kcal100  || 0) * f),
    prot:  Math.round((nutSelectedFood.prot100  || 0) * f * 10) / 10,
    carbs: Math.round((nutSelectedFood.carbs100 || 0) * f * 10) / 10,
    fat:   Math.round((nutSelectedFood.fat100   || 0) * f * 10) / 10,
    food_id: nutSelectedFood.id,
    source: nutSelectedFood.source || 'manual'
  };

  Store.addNutritionEntry(nutDate, entry);
  Store.addRecentFood(nutSelectedFood);
  closeNutModal();
  navigate('nutricion');
  showToast(`${nutSelectedFood.nombre} añadido ✓`);
}

// ============================================================
// NUTRITION — ESCÁNER DE CÓDIGO DE BARRAS
// ============================================================

async function openBarcodeScanner() {
  if ('BarcodeDetector' in window) {
    openLiveBarcodeScanner();
  } else {
    // Fallback para iOS Safari < 17 y otros navegadores sin BarcodeDetector nativo
    openFileBarcodeCapture();
  }
}

async function openLiveBarcodeScanner() {
  const overlay = document.createElement('div');
  overlay.id = 'barcode-overlay';
  overlay.className = 'barcode-overlay';
  overlay.innerHTML = `
    <div class="barcode-ui">
      <button class="barcode-close" onclick="closeBarcodeScanner()">✕ Cerrar</button>
      <video id="barcode-video" class="barcode-video" autoplay playsinline muted></video>
      <div class="barcode-frame"></div>
      <p class="barcode-hint">Apunta al código de barras</p>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    const video = document.getElementById('barcode-video');
    video.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
    video.srcObject = stream;
    overlay._stream = stream;
    await new Promise((resolve) => {
      video.addEventListener('loadedmetadata', resolve, { once: true });
    });
    await video.play();

    const detector = new BarcodeDetector({ formats: ['ean_8', 'ean_13', 'code_128', 'upc_a', 'upc_e'] });
    let scanning = true;
    let lastScan = 0;
    const scan = async () => {
      if (!scanning || !document.getElementById('barcode-overlay')) return;
      const now = Date.now();
      if (now - lastScan < 200) { requestAnimationFrame(scan); return; }
      lastScan = now;
      try {
        const codes = await detector.detect(video);
        if (codes.length) {
          scanning = false;
          navigator.vibrate && navigator.vibrate(100);
          closeBarcodeScanner();
          await fetchProductByBarcode(codes[0].rawValue);
        } else { requestAnimationFrame(scan); }
      } catch { requestAnimationFrame(scan); }
    };
    requestAnimationFrame(scan);
  } catch {
    closeBarcodeScanner();
    // Fallback: abrir cámara como captura de imagen
    showToast('Abriendo cámara...', 'info');
    openFileBarcodeCapture();
  }
}

function openFileBarcodeCapture() {
  // Funciona en todos los móviles incluyendo iOS Safari
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.setAttribute('capture', 'environment');

  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;

    showToast('Analizando imagen...', 'info');
    const objectURL = URL.createObjectURL(file);

    try {
      // Cargar ZXing dinámicamente solo cuando se necesita
      if (!window.ZXing) {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js';
          s.onload = resolve; s.onerror = reject;
          document.head.appendChild(s);
        });
      }
      const reader = new ZXing.BrowserMultiFormatReader();
      const result = await reader.decodeFromImageUrl(objectURL);
      URL.revokeObjectURL(objectURL);
      navigator.vibrate && navigator.vibrate(100);
      await fetchProductByBarcode(result.getText());
    } catch {
      URL.revokeObjectURL(objectURL);
      showToast('No se detectó código. Busca el producto por nombre.', 'error');
    }
  };

  input.click();
}

function closeBarcodeScanner() {
  const overlay = document.getElementById('barcode-overlay');
  if (overlay) {
    if (overlay._stream) overlay._stream.getTracks().forEach(t => t.stop());
    overlay.classList.remove('visible');
    setTimeout(() => overlay.remove(), 300);
  }
}

async function fetchProductByBarcode(code) {
  showToast('Buscando producto...', 'info');
  try {
    const resp = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json?fields=product_name,brands,nutriments`);
    const data = await resp.json();
    if (data.status !== 1 || !data.product) { showToast('Producto no encontrado', 'error'); return; }
    const p = data.product;
    const n = p.nutriments;
    nutSelectedFood = {
      id: 'off_' + code,
      nombre: p.product_name + (p.brands ? ` — ${p.brands}` : ''),
      kcal100:  Math.round(n['energy-kcal_100g'] || n['energy-kcal'] || 0),
      prot100:  Math.round((n.proteins_100g        || 0) * 10) / 10,
      carbs100: Math.round((n.carbohydrates_100g   || 0) * 10) / 10,
      fat100:   Math.round((n.fat_100g             || 0) * 10) / 10,
      source: 'off'
    };
    openPortionModal(nutSelectedFood);
  } catch { showToast('Error al buscar producto', 'error'); }
}

// ============================================================
// NUTRITION — CREAR ALIMENTO PROPIO
// ============================================================

function openCustomFoodModal() {
  const existing = document.getElementById('nut-custom-modal');
  if (existing) existing.remove();

  const hasKey = !!Store.getAnthropicKey();
  const modal = document.createElement('div');
  modal.id = 'nut-custom-modal';
  modal.className = 'nut-modal-overlay';
  modal.innerHTML = `
    <div class="nut-modal nut-custom-modal-inner">
      <div class="nut-modal-header">
        <span>Crear alimento propio</span>
        <button class="modal-close" onclick="document.getElementById('nut-custom-modal').remove()">✕</button>
      </div>
      <div class="nut-custom-body">
        <div class="form-group" style="margin-bottom:12px">
          <label class="form-label">Nombre del alimento</label>
          <input type="text" id="cf-nombre" class="form-input" placeholder="Ej: Carrot cake proteico">
        </div>
        <p class="muted" style="font-size:12px;margin-bottom:8px">Valores por 100g / 100ml</p>
        <div class="nut-macro-inputs">
          <div class="form-group">
            <label class="form-label">Calorías</label>
            <input type="number" id="cf-kcal" class="form-input" placeholder="kcal" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">Proteína (g)</label>
            <input type="number" id="cf-prot" class="form-input" placeholder="g" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">Carbos (g)</label>
            <input type="number" id="cf-carbs" class="form-input" placeholder="g" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">Grasas (g)</label>
            <input type="number" id="cf-fat" class="form-input" placeholder="g" min="0">
          </div>
        </div>
        ${hasKey ? `
          <div class="nut-claude-section">
            <p class="nut-claude-title">✨ Calcular con Claude</p>
            <p class="muted" style="font-size:12px;margin-bottom:8px">Describe los ingredientes y Claude calculará los macros por 100g del resultado final.</p>
            <textarea id="cf-claude-desc" class="import-textarea" style="min-height:80px;font-family:inherit" placeholder="Ej: 200g harina de avena, 3 huevos, 2 zanahorias, 50g proteína whey vainilla, 100ml leche, canela, levadura — receta para 8 porciones"></textarea>
            <button class="btn btn-secondary" id="cf-claude-btn" onclick="calcWithClaude()">✨ Calcular macros</button>
          </div>` : `
          <p class="muted" style="font-size:12px;margin-top:12px">💡 Configura tu clave de Anthropic en <strong>Ajustes → IA</strong> para calcular macros automáticamente.</p>`}
        <button class="btn btn-primary" style="margin-top:16px;width:100%" onclick="saveCustomFoodFromModal()">Guardar alimento</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('visible'));
}

async function calcWithClaude() {
  const desc = document.getElementById('cf-claude-desc')?.value.trim();
  if (!desc) { showToast('Describe la receta primero', 'error'); return; }
  const key = Store.getAnthropicKey();
  if (!key) { showToast('Falta la clave de Anthropic en Ajustes', 'error'); return; }

  const btn = document.getElementById('cf-claude-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Calculando...'; }

  try {
    const prompt = `Eres nutricionista experto. Calcula los macronutrientes por 100g del producto FINAL a partir de esta receta casera:\n\n${desc}\n\nResponde SOLO con JSON válido sin texto adicional:\n{"kcal":0,"prot":0,"carbs":0,"fat":0}`;
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 100,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    const macros = JSON.parse(data.content[0].text.trim());
    if (document.getElementById('cf-kcal'))  document.getElementById('cf-kcal').value  = macros.kcal  || '';
    if (document.getElementById('cf-prot'))  document.getElementById('cf-prot').value  = macros.prot  || '';
    if (document.getElementById('cf-carbs')) document.getElementById('cf-carbs').value = macros.carbs || '';
    if (document.getElementById('cf-fat'))   document.getElementById('cf-fat').value   = macros.fat   || '';
    showToast('Macros calculados ✓');
  } catch (err) {
    showToast('Error: ' + (err.message || 'intenta de nuevo'), 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '✨ Calcular macros'; }
  }
}

function saveCustomFoodFromModal() {
  const nombre = document.getElementById('cf-nombre')?.value.trim();
  const kcal   = parseFloat(document.getElementById('cf-kcal')?.value);
  const prot   = parseFloat(document.getElementById('cf-prot')?.value);
  const carbs  = parseFloat(document.getElementById('cf-carbs')?.value);
  const fat    = parseFloat(document.getElementById('cf-fat')?.value);

  if (!nombre || isNaN(kcal)) { showToast('Nombre y calorías son obligatorios', 'error'); return; }

  const food = {
    id: 'custom_' + Date.now(),
    nombre, kcal100: kcal,
    prot100:  isNaN(prot)  ? 0 : prot,
    carbs100: isNaN(carbs) ? 0 : carbs,
    fat100:   isNaN(fat)   ? 0 : fat,
    source: 'custom',
    created: new Date().toISOString()
  };
  Store.saveCustomFood(food);
  document.getElementById('nut-custom-modal')?.remove();
  nutSelectedFood = food;
  openPortionModal(food);
  showToast(`${nombre} guardado ✓`);
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Seed Garmin data if today's data not yet stored
  const storedGarmin = Store.getGarminData();
  if (!storedGarmin || storedGarmin.fecha !== GARMIN_SEED.fecha) {
    Store.saveGarminData(GARMIN_SEED);
  }

  // Aplicar tema guardado
  const savedTheme = localStorage.getItem('sol_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  // Registrar Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/fitness-app/sw.js').catch(() => {});
  }

  // Sync desde Supabase al arrancar
  syncFromSupabase();

  // Nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.view));
  });

  // Import file
  document.addEventListener('change', (e) => {
    if (e.target.id === 'import-file-input') {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const ok = Store.importAll(ev.target.result);
        if (ok) { showToast('Backup importado ✓'); navigate('hoy'); }
        else showToast('Error al importar', 'error');
      };
      reader.readAsText(file);
    }
  });

  // Render inicial
  navigate('hoy');
});
