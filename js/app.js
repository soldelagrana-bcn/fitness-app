// ============================================================
// APP.JS — Lógica principal, routing y vistas
// ============================================================

let currentView = 'hoy';
let activeWorkout = null; // workout en progreso
let workoutTimer = null;
let workoutSeconds = 0;

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
  const nextSet = ej.reps_completadas.findIndex(r => r === null);
  if (nextSet === -1) return '<p class="set-complete-msg">✓ Ejercicio completado</p>';
  const isFirstSet = nextSet === 0;

  const isLastSet = nextSet === ej.series - 1;
  return `
    <div class="set-logger" id="logger-${ejIdx}">
      <div class="set-logger-header">
        <span>Set ${nextSet + 1} de ${ej.series}</span>
        ${isLastSet && ej.fallo_ultimo_set ? '<span class="fallo-hint">💥 ¡Al fallo!</span>' : ''}
      </div>
      <div class="reps-input-row">
        <button class="reps-btn" data-action="reps-minus" data-ej="${ejIdx}">−</button>
        <input type="number" class="reps-input" id="reps-${ejIdx}"
          value="${ej.reps_objetivo}" min="1" max="50" inputmode="numeric">
        <button class="reps-btn" data-action="reps-plus" data-ej="${ejIdx}">+</button>
      </div>
      ${isLastSet ? `
        <div class="rir-row">
          <label>RIR (reps en depósito):</label>
          <div class="rir-buttons">
            ${[0,1,2,3,4].map(r => `
              <button class="rir-btn ${r === 2 ? 'selected' : ''}"
                data-action="set-rir" data-ej="${ejIdx}" data-rir="${r}">${r}</button>
            `).join('')}
          </div>
        </div>` : ''}
      <button class="btn btn-complete-set" data-action="complete-set" data-ej="${ejIdx}" data-set="${nextSet}">
        ✓ Set ${nextSet + 1} completado
      </button>
      ${isFirstSet ? '<p class="swipe-hint">← Desliza para completar</p>' : ''}
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
            <svg viewBox="0 0 160 395" class="body-svg" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="bodyGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stop-color="#D99060"/>
                  <stop offset="50%" stop-color="#F0B080"/>
                  <stop offset="100%" stop-color="#D99060"/>
                </linearGradient>
                <linearGradient id="hairG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#8C4E20"/>
                  <stop offset="100%" stop-color="#3E1E08"/>
                </linearGradient>
              </defs>

              <!-- ═══ HAIR ═══ -->
              <ellipse cx="80" cy="16" rx="17" ry="20" fill="url(#hairG)"/>
              <path d="M63,13 C61,26 61,40 63,54" fill="none" stroke="#3E1E08" stroke-width="4" stroke-linecap="round"/>
              <path d="M97,13 C99,26 99,40 97,54" fill="none" stroke="#3E1E08" stroke-width="4" stroke-linecap="round"/>
              <!-- ═══ HEAD ═══ -->
              <ellipse cx="80" cy="20" rx="14" ry="17" fill="url(#bodyGrad)"/>
              <path d="M73,16 Q77,13 81,16" stroke="#5A2E0A" stroke-width="1.3" fill="none" stroke-linecap="round"/>
              <path d="M79,16 Q83,13 87,16" stroke="#5A2E0A" stroke-width="1.3" fill="none" stroke-linecap="round"/>
              <ellipse cx="74.5" cy="21" rx="2.4" ry="2.2" fill="#1A0E00"/>
              <ellipse cx="85.5" cy="21" rx="2.4" ry="2.2" fill="#1A0E00"/>
              <circle cx="75.6" cy="19.6" r="0.9" fill="white" opacity="0.8"/>
              <circle cx="86.6" cy="19.6" r="0.9" fill="white" opacity="0.8"/>
              <path d="M75.5,30 Q80,34 84.5,30" stroke="#C07858" stroke-width="1.3" fill="none" stroke-linecap="round"/>
              <!-- ═══ NECK ═══ -->
              <path d="M74,36 L73,52 L87,52 L86,36 Q83,33 80,33 Q77,33 74,36Z" fill="url(#bodyGrad)" stroke="#C09060" stroke-width="0.4"/>
              <!-- ═══ TORSO ═══ -->
              <path d="M73,52 C64,52 52,56 44,64 C36,72 34,84 36,96 C38,108 44,116 48,122 C52,128 54,134 56,142 L104,142 C106,134 108,128 112,122 C116,116 122,108 124,96 C126,84 124,72 116,64 C108,56 96,52 87,52Z" fill="url(#bodyGrad)" stroke="#C09060" stroke-width="0.5"/>
              <path d="M56,142 C54,152 54,162 56,172 C60,182 68,188 80,190 C92,188 100,182 104,172 C106,162 106,152 104,142Z" fill="url(#bodyGrad)" stroke="#C09060" stroke-width="0.5"/>
              <path d="M56,172 C48,182 42,196 42,210 C48,218 60,224 74,226 L80,228 L86,226 C100,224 112,218 118,210 C118,196 112,182 104,172 C96,184 88,190 80,190 C72,190 64,184 56,172Z" fill="url(#bodyGrad)" stroke="#C09060" stroke-width="0.5"/>
              <!-- ═══ ARMS ═══ -->
              <path d="M44,64 C36,72 32,86 30,100 C28,114 30,126 32,136 L44,136 C44,124 42,112 42,100 C42,88 44,76 46,64Z" fill="url(#bodyGrad)" stroke="#C09060" stroke-width="0.5"/>
              <path d="M32,136 C30,148 30,160 32,170 L44,170 C44,160 44,148 44,136Z" fill="url(#bodyGrad)" stroke="#C09060" stroke-width="0.5"/>
              <ellipse cx="38" cy="175" rx="7" ry="5.5" fill="url(#bodyGrad)" stroke="#C09060" stroke-width="0.4"/>
              <path d="M116,64 C124,72 128,86 130,100 C132,114 130,126 128,136 L116,136 C116,124 118,112 118,100 C118,88 116,76 114,64Z" fill="url(#bodyGrad)" stroke="#C09060" stroke-width="0.5"/>
              <path d="M128,136 C130,148 130,160 128,170 L116,170 C116,160 116,148 116,136Z" fill="url(#bodyGrad)" stroke="#C09060" stroke-width="0.5"/>
              <ellipse cx="122" cy="175" rx="7" ry="5.5" fill="url(#bodyGrad)" stroke="#C09060" stroke-width="0.4"/>
              <!-- ═══ LEGS ═══ -->
              <path d="M42,210 C38,226 36,244 36,262 C38,276 40,288 44,298 L60,298 C60,286 60,272 62,258 C64,244 66,228 66,214 C60,210 52,210 46,212Z" fill="url(#bodyGrad)" stroke="#C09060" stroke-width="0.5"/>
              <ellipse cx="52" cy="302" rx="10" ry="6" fill="url(#bodyGrad)" stroke="#C09060" stroke-width="0.4"/>
              <path d="M44,306 C42,320 42,334 44,346 C46,356 50,362 54,364 L62,364 C64,356 64,342 62,328 C60,316 56,306 50,306Z" fill="url(#bodyGrad)" stroke="#C09060" stroke-width="0.5"/>
              <ellipse cx="52" cy="368" rx="8" ry="5" fill="url(#bodyGrad)" stroke="#C09060" stroke-width="0.4"/>
              <path d="M44,372 C42,376 42,382 46,384 L60,384 C64,382 64,376 60,372Z" fill="url(#bodyGrad)" stroke="#C09060" stroke-width="0.4"/>
              <path d="M118,210 C122,226 124,244 124,262 C122,276 120,288 116,298 L100,298 C100,286 100,272 98,258 C96,244 94,228 94,214 C100,210 108,210 114,212Z" fill="url(#bodyGrad)" stroke="#C09060" stroke-width="0.5"/>
              <ellipse cx="108" cy="302" rx="10" ry="6" fill="url(#bodyGrad)" stroke="#C09060" stroke-width="0.4"/>
              <path d="M116,306 C118,320 118,334 116,346 C114,356 110,362 106,364 L98,364 C96,356 96,342 98,328 C100,316 104,306 110,306Z" fill="url(#bodyGrad)" stroke="#C09060" stroke-width="0.5"/>
              <ellipse cx="108" cy="368" rx="8" ry="5" fill="url(#bodyGrad)" stroke="#C09060" stroke-width="0.4"/>
              <path d="M116,372 C118,376 118,382 114,384 L100,384 C96,382 96,376 100,372Z" fill="url(#bodyGrad)" stroke="#C09060" stroke-width="0.4"/>

              <!-- ══════════════════════════════════════════════ -->
              <!-- MUSCLE ZONES — fill controlled by CSS only     -->
              <!-- ══════════════════════════════════════════════ -->
              <!-- zone-espalda: Trapezius upper -->
              <path class="zone-espalda" d="M73,52 C68,48 58,48 48,56 L44,64 C52,59 66,54 73,56Z"/>
              <path class="zone-espalda" d="M87,52 C92,48 102,48 112,56 L116,64 C108,59 94,54 87,56Z"/>
              <!-- zone-hombro: Deltoid cap -->
              <path class="zone-hombro" d="M36,68 C32,76 30,88 34,100 C38,108 44,112 48,108 C50,98 50,86 48,76 C44,68 40,64 36,68Z"/>
              <path class="zone-hombro" d="M124,68 C128,76 130,88 126,100 C122,108 116,112 112,108 C110,98 110,86 112,76 C116,68 120,64 124,68Z"/>
              <!-- zone-pecho: Pectoralis major L+R -->
              <path class="zone-pecho" d="M48,66 C56,60 70,58 78,60 L78,94 C70,96 60,94 54,86 C48,78 44,72 48,66Z"/>
              <path class="zone-pecho" d="M112,66 C104,60 90,58 82,60 L82,94 C90,96 100,94 106,86 C112,78 116,72 112,66Z"/>
              <line x1="80" y1="60" x2="80" y2="94" stroke="rgba(140,80,60,0.3)" stroke-width="0.6"/>
              <!-- zone-biceps: Biceps brachii -->
              <path class="zone-biceps" d="M30,82 C28,94 28,108 32,120 C36,128 42,130 46,126 C46,112 44,98 44,86 C42,78 34,76 30,82Z"/>
              <path class="zone-biceps" d="M130,82 C132,94 132,108 128,120 C124,128 118,130 114,126 C114,112 116,98 116,86 C118,78 126,76 130,82Z"/>
              <!-- zone-triceps: Lateral triceps -->
              <path class="zone-triceps" d="M46,68 C48,78 48,94 48,110 C46,120 44,128 44,134 C42,126 40,114 40,102 C40,90 42,78 46,68Z"/>
              <path class="zone-triceps" d="M114,68 C112,78 112,94 112,110 C114,120 116,128 116,134 C118,126 120,114 120,102 C120,90 118,78 114,68Z"/>
              <!-- zone-core: Rectus abdominis 6 segments -->
              <path class="zone-core" d="M72,98 L79,98 L79,111 C76,113 72,112 72,110Z"/>
              <path class="zone-core" d="M88,98 L81,98 L81,111 C84,113 88,112 88,110Z"/>
              <path class="zone-core" d="M72,113 L79,113 L79,126 L72,125Z"/>
              <path class="zone-core" d="M88,113 L81,113 L81,126 L88,125Z"/>
              <path class="zone-core" d="M72,127 L79,127 C79,135 77,141 74,144 L72,142Z"/>
              <path class="zone-core" d="M88,127 L81,127 C81,135 83,141 86,144 L88,142Z"/>
              <line x1="80" y1="98" x2="80" y2="144" stroke="rgba(140,80,60,0.3)" stroke-width="0.6"/>
              <line x1="72" y1="113" x2="88" y2="113" stroke="rgba(140,80,60,0.25)" stroke-width="0.5"/>
              <line x1="72" y1="127" x2="88" y2="127" stroke="rgba(140,80,60,0.25)" stroke-width="0.5"/>
              <!-- zone-oblicuos: External obliques -->
              <path class="zone-oblicuos" d="M52,96 C48,108 48,122 50,134 C52,144 56,150 60,152 C60,138 58,122 58,110 C58,102 56,94 52,96Z"/>
              <path class="zone-oblicuos" d="M108,96 C112,108 112,122 110,134 C108,144 104,150 100,152 C100,138 102,122 102,110 C102,102 104,94 108,96Z"/>
              <!-- zone-gluteo: Glutes front view -->
              <path class="zone-gluteo" d="M42,174 C36,186 34,200 36,212 C42,220 56,226 70,228 L80,230 L90,228 C104,226 118,220 124,212 C126,200 124,186 118,174 C108,186 94,192 80,192 C66,192 52,186 42,174Z"/>
              <!-- zone-abductores: Adductors inner thigh -->
              <path class="zone-abductores" d="M66,216 C64,230 64,246 66,260 C68,272 72,280 76,282 C76,268 74,254 72,240 C70,228 68,220 66,216Z"/>
              <path class="zone-abductores" d="M94,216 C96,230 96,246 94,260 C92,272 88,280 84,282 C84,268 86,254 88,240 C90,228 92,220 94,216Z"/>
              <!-- zone-cuadriceps: Vastus lateralis + rectus femoris + vastus medialis -->
              <path class="zone-cuadriceps" d="M40,218 C36,234 36,252 38,268 C40,280 44,288 48,290 C50,276 48,260 48,246 C48,234 44,222 40,218Z"/>
              <path class="zone-cuadriceps" d="M120,218 C124,234 124,252 122,268 C120,280 116,288 112,290 C110,276 112,260 112,246 C112,234 116,222 120,218Z"/>
              <path class="zone-cuadriceps" d="M52,218 C48,234 48,252 50,268 C52,280 56,288 60,290 C62,276 60,260 58,246 C56,234 54,224 52,218Z"/>
              <path class="zone-cuadriceps" d="M108,218 C112,234 112,252 110,268 C108,280 104,288 100,290 C98,276 100,260 102,246 C104,234 106,224 108,218Z"/>
              <path class="zone-cuadriceps" d="M62,260 C60,270 60,280 64,288 C67,292 71,292 73,288 C73,278 71,268 68,260Z"/>
              <path class="zone-cuadriceps" d="M98,260 C100,270 100,280 96,288 C93,292 89,292 87,288 C87,278 89,268 92,260Z"/>
              <!-- zone-isquios: Hamstrings medial -->
              <path class="zone-isquios" d="M66,218 C64,234 64,250 66,264 C68,276 72,284 76,286 C76,272 74,258 72,244 C70,232 68,224 66,218Z"/>
              <path class="zone-isquios" d="M94,218 C96,234 96,250 94,264 C92,276 88,284 84,286 C84,272 86,258 88,244 C90,232 92,224 94,218Z"/>
              <!-- zone-gemelos: Gastrocnemius -->
              <path class="zone-gemelos" d="M42,310 C40,324 40,338 44,350 C47,358 51,362 55,361 C57,349 57,335 55,322 C53,312 48,306 42,310Z"/>
              <path class="zone-gemelos" d="M118,310 C120,324 120,338 116,350 C113,358 109,362 105,361 C103,349 103,335 105,322 C107,312 112,306 118,310Z"/>
              <line x1="48" y1="314" x2="51" y2="358" stroke="rgba(140,80,60,0.3)" stroke-width="0.5"/>
              <line x1="112" y1="314" x2="109" y2="358" stroke="rgba(140,80,60,0.3)" stroke-width="0.5"/>
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
  const today = new Date();
  const dayOfWeek = today.getDay();
  const tipoDia = TIPO_DIA_SEMANA[dayOfWeek];
  const macros = MACROS_POR_DIA[tipoDia];

  const diasConfig = [
    { key: 'gym', dias: 'Lun / Jue / Vie' },
    { key: 'gym_tenis', dias: 'Martes' },
    { key: 'tenis', dias: 'Sábado' },
    { key: 'descanso', dias: 'Mié / Dom' },
  ];

  const tablaMacros = diasConfig.map(d => {
    const m = MACROS_POR_DIA[d.key];
    const isToday = tipoDia === d.key;
    return `
      <div class="macro-row ${isToday ? 'today-macro' : ''}">
        <div class="macro-row-left">
          <span class="macro-tipo">${m.label}</span>
          <span class="macro-dias muted">${d.dias}</span>
        </div>
        <div class="macro-numbers">
          <span class="macro-kcal">${m.kcal} kcal</span>
          <span class="macro-detail">P:${m.proteina}g C:${m.carbos}g G:${m.grasa}g</span>
        </div>
        ${isToday ? '<span class="today-tag">Hoy</span>' : ''}
      </div>`;
  }).join('');

  return `
    <div class="view">
      <div class="view-header">
        <h2 class="view-title">Nutrición</h2>
      </div>

      <section>
        <h4 class="section-title">Objetivo de hoy — ${macros.label}</h4>
        <div class="card macro-today-card">
          <div class="macro-big-row">
            <div class="macro-big">
              <span class="macro-big-val">${macros.kcal}</span>
              <span class="macro-big-label">kcal</span>
            </div>
            <div class="macro-divider"></div>
            <div class="macro-big">
              <span class="macro-big-val">${macros.proteina}g</span>
              <span class="macro-big-label">Proteína</span>
            </div>
            <div class="macro-big">
              <span class="macro-big-val">${macros.carbos}g</span>
              <span class="macro-big-label">Carbos</span>
            </div>
            <div class="macro-big">
              <span class="macro-big-val">${macros.grasa}g</span>
              <span class="macro-big-label">Grasas</span>
            </div>
          </div>
          <div class="macro-alert">
            ⚠️ La proteína (115g) es fija todos los días, no la reduzcas.
          </div>
        </div>
      </section>

      <section>
        <h4 class="section-title">Distribución sugerida</h4>
        <div class="card">
          ${[
            { comida: 'Desayuno', kcal: 400, icon: '☀️', nota: 'Dulce — porridge, tortitas proteína, bowl de quark...' },
            { comida: 'Snack', kcal: 200, icon: '🍎', nota: '' },
            { comida: 'Almuerzo', kcal: 550, icon: '🍽️', nota: '' },
            { comida: 'Cena', kcal: 500, icon: '🌙', nota: '' },
            { comida: 'Margen / extras', kcal: macros.kcal - 1650, icon: '➕', nota: 'Ajustar según actividad del día' },
          ].map(c => `
            <div class="meal-row">
              <span class="meal-icon">${c.icon}</span>
              <div class="meal-info">
                <span class="meal-nombre">${c.comida}</span>
                ${c.nota ? `<span class="meal-nota muted">${c.nota}</span>` : ''}
              </div>
              <span class="meal-kcal">~${c.kcal} kcal</span>
            </div>
          `).join('')}
        </div>
      </section>

      <section>
        <h4 class="section-title">Objetivos por tipo de día</h4>
        <div class="card">
          ${tablaMacros}
        </div>
      </section>

      <section>
        <h4 class="section-title">Suplementación activa</h4>
        <div class="card">
          <div class="suplement-row">
            <span class="sup-icon">🐟</span>
            <div>
              <strong>Omega-3</strong>
              <p class="muted">2 cápsulas con el desayuno (IFOS certified)</p>
            </div>
          </div>
          <div class="suplement-row">
            <span class="sup-icon">🧘‍♀️</span>
            <div>
              <strong>Magnesio bisglicinato</strong>
              <p class="muted">1 cápsula antes de dormir</p>
            </div>
          </div>
          <div class="suplement-row pending">
            <span class="sup-icon">☀️</span>
            <div>
              <strong>Vitamina D3+K2</strong>
              <p class="muted">Pendiente de incorporar</p>
            </div>
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
        <h4 class="section-title">Datos</h4>
        <div class="card">
          <button class="btn btn-secondary" data-action="export-data">📤 Exportar mis datos</button>
          <div class="import-file-row">
            <label class="btn btn-secondary" for="import-file-input">📥 Importar backup</label>
            <input type="file" id="import-file-input" accept=".json" style="display:none">
          </div>
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

    case 'complete-set': {
      const ejIdx = parseInt(dataset.ej);
      const setIdx = parseInt(dataset.set);
      const repsInput = document.getElementById(`reps-${ejIdx}`);
      const reps = repsInput ? parseInt(repsInput.value) : activeWorkout.bloques[activeWorkout.bloque_actual].ejercicios[ejIdx].reps_objetivo;

      const ej = activeWorkout.bloques[activeWorkout.bloque_actual].ejercicios[ejIdx];
      ej.reps_completadas[setIdx] = reps || ej.reps_objetivo;

      // Guardar RIR si es último set
      const isLastSet = setIdx === ej.series - 1;
      if (isLastSet) {
        const rirBtn = document.querySelector('.rir-btn.selected');
        if (rirBtn) ej.rir_ultimo_set = parseInt(rirBtn.dataset.rir);
      }

      // Actualizar carga en store
      if (ej.carga_kg !== null) Store.saveCarga(ej.nombre, ej.carga_kg);

      // Verificar récord personal
      if (ej.carga_kg && Store.checkAndSavePR(ej.nombre, ej.carga_kg)) {
        showToast('🏆 ¡Nuevo récord personal! ' + ej.nombre, 'pr');
      }

      // Arrancar timer de descanso
      startRestTimer(60);

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
      }
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
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

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
