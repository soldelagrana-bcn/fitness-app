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
          <span class="hero-mascot">🐞</span>
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
                    ${isToday && !done ? '<span class="plan-hoy-tag">Hoy</span>' : ''}
                    <div class="plan-checkbox${done ? ' checked' : ''}">
                      <svg viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                        ${done
                          ? `<circle cx="11" cy="11" r="10" fill="${gymColor}"/><path d="M6 11.5 L9.5 15 L16 8" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`
                          : `<circle cx="11" cy="11" r="10" stroke="var(--border)" stroke-width="2"/>`
                        }
                      </svg>
                    </div>
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
                    ${isToday ? '<span class="plan-hoy-tag">Hoy</span>' : ''}
                    <div class="plan-checkbox${actividad ? ' checked rest-check' : ''}">
                      <svg viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                        ${actividad
                          ? `<circle cx="11" cy="11" r="10" fill="#8E8EA8"/><path d="M6 11.5 L9.5 15 L16 8" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`
                          : `<circle cx="11" cy="11" r="10" stroke="var(--border)" stroke-width="2"/><line x1="11" y1="7" x2="11" y2="15" stroke="var(--text-muted)" stroke-width="1.8" stroke-linecap="round"/><line x1="7" y1="11" x2="15" y2="11" stroke="var(--text-muted)" stroke-width="1.8" stroke-linecap="round"/>`
                        }
                      </svg>
                    </div>
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
    return `
      <div class="exercise-card ${allDone ? 'done' : ''} ${isActive ? 'active' : ''}" data-ej="${ejIdx}" data-ej-idx="${ejIdx}">
        <div class="exercise-header">
          <div class="exercise-id-badge">${ej.id}</div>
          <div class="exercise-info">
            <h4 class="exercise-name">${ej.nombre}</h4>
            <p class="exercise-desc">${ej.descripcion}</p>
            ${ej.fallo_ultimo_set ? '<span class="fallo-badge">💥 Fallo en último set</span>' : ''}
          </div>
          ${allDone ? '<div class="done-check">✓</div>' : ''}
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
            <svg viewBox="0 0 200 420" class="body-svg" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="skinGrad" x1="0.2" y1="0" x2="0.8" y2="1">
                  <stop offset="0%" stop-color="#FDDCBE"/>
                  <stop offset="100%" stop-color="#EEBF9A"/>
                </linearGradient>
                <linearGradient id="hairGrad" x1="0" y1="0" x2="0.1" y2="1">
                  <stop offset="0%" stop-color="#7B4A20"/>
                  <stop offset="100%" stop-color="#3E1F08"/>
                </linearGradient>
              </defs>
              <!-- HAIR -->
              <ellipse cx="100" cy="24" rx="22" ry="26" fill="url(#hairGrad)"/>
              <path d="M78,18 C75,32 74,50 76,64 C73,55 72,40 74,27Z" fill="#3E1F08"/>
              <path d="M122,18 C125,32 126,50 124,64 C127,55 128,40 126,27Z" fill="#3E1F08"/>
              <!-- HEAD -->
              <ellipse cx="100" cy="27" rx="19" ry="22" fill="url(#skinGrad)"/>
              <!-- Eyebrows -->
              <path d="M88,21 Q92,18 96,21" stroke="#6B3010" stroke-width="1.6" fill="none" stroke-linecap="round"/>
              <path d="M104,21 Q108,18 112,21" stroke="#6B3010" stroke-width="1.6" fill="none" stroke-linecap="round"/>
              <!-- Eyes -->
              <ellipse cx="92" cy="25" rx="3" ry="2.2" fill="#3A2010"/>
              <ellipse cx="108" cy="25" rx="3" ry="2.2" fill="#3A2010"/>
              <circle cx="93.2" cy="24.2" r="0.9" fill="white" opacity="0.8"/>
              <circle cx="109.2" cy="24.2" r="0.9" fill="white" opacity="0.8"/>
              <!-- Lips -->
              <path d="M94,37 Q100,41 106,37" stroke="#C08870" stroke-width="1.5" fill="none" stroke-linecap="round"/>
              <!-- NECK -->
              <path d="M91,48 C89,55 88,62 88,68 L112,68 C112,62 111,55 109,48 Q104,45 100,45 Q96,45 91,48Z" fill="url(#skinGrad)"/>
              <!-- TORSO (hourglass: shoulder ~76px, waist ~64px, hip ~100px) -->
              <path d="M88,68 C80,68 72,70 64,74 C58,78 54,84 52,93 C50,103 52,114 56,122 C58,128 62,134 64,141 C65,148 66,154 66,161 C64,167 58,173 52,181 C46,190 44,202 44,212 C48,219 58,224 72,226 L72,210 C72,205 74,201 78,198 C84,195 92,193 100,193 C108,193 116,195 122,198 C126,201 128,205 128,210 L128,226 C142,224 152,219 156,212 C156,202 154,190 148,181 C142,173 136,167 134,161 C134,154 135,148 136,141 C138,134 142,128 144,122 C148,114 150,103 148,93 C146,84 142,78 136,74 C128,70 120,68 112,68Z" fill="url(#skinGrad)" stroke="#DCB090" stroke-width="0.5"/>
              <!-- LEFT ARM -->
              <path d="M64,74 C58,78 52,87 48,99 C44,111 44,125 46,137 C48,147 52,158 52,168 L60,168 C60,158 58,146 58,136 C58,124 58,110 62,98 C64,89 66,80 66,74Z" fill="url(#skinGrad)" stroke="#DCB090" stroke-width="0.5"/>
              <!-- RIGHT ARM -->
              <path d="M136,74 C142,78 148,87 152,99 C156,111 156,125 154,137 C152,147 148,158 148,168 L140,168 C140,158 142,146 142,136 C142,124 142,110 138,98 C136,89 134,80 134,74Z" fill="url(#skinGrad)" stroke="#DCB090" stroke-width="0.5"/>
              <!-- HANDS -->
              <ellipse cx="56" cy="172" rx="7" ry="5" fill="url(#skinGrad)" stroke="#DCB090" stroke-width="0.4"/>
              <ellipse cx="144" cy="172" rx="7" ry="5" fill="url(#skinGrad)" stroke="#DCB090" stroke-width="0.4"/>
              <!-- LEFT LEG -->
              <path d="M44,212 C40,224 38,240 38,256 C38,272 42,286 44,300 C46,314 48,328 50,342 C52,354 56,364 60,372 L76,372 C78,366 78,358 76,344 C74,330 74,316 74,302 C74,288 76,274 80,260 C82,246 84,230 84,216 C80,210 74,208 68,210 C64,214 60,218 58,222 C54,226 50,222 44,212Z" fill="url(#skinGrad)" stroke="#DCB090" stroke-width="0.5"/>
              <!-- RIGHT LEG -->
              <path d="M156,212 C160,224 162,240 162,256 C162,272 158,286 156,300 C154,314 152,328 150,342 C148,354 144,364 140,372 L124,372 C122,366 122,358 124,344 C126,330 126,316 126,302 C126,288 124,274 120,260 C118,246 116,230 116,216 C120,210 126,208 132,210 C136,214 140,218 142,222 C146,226 150,222 156,212Z" fill="url(#skinGrad)" stroke="#DCB090" stroke-width="0.5"/>
              <!-- FEET -->
              <ellipse cx="62" cy="374" rx="16" ry="6" fill="url(#skinGrad)" stroke="#DCB090" stroke-width="0.4"/>
              <ellipse cx="138" cy="374" rx="16" ry="6" fill="url(#skinGrad)" stroke="#DCB090" stroke-width="0.4"/>

              <!-- ======= ZONE OVERLAYS ======= -->
              <!-- zone-hombro -->
              <ellipse class="zone-hombro" cx="60" cy="80" rx="12" ry="8"/>
              <ellipse class="zone-hombro" cx="140" cy="80" rx="12" ry="8"/>
              <!-- zone-pecho -->
              <path class="zone-pecho" d="M72,84 C76,79 90,77 100,77 C110,77 124,79 128,84 C132,93 130,107 122,113 C116,117 108,119 100,119 C92,119 84,117 78,113 C70,107 68,93 72,84Z"/>
              <!-- zone-espalda (trapezius visible from front) -->
              <path class="zone-espalda" d="M68,76 C74,72 86,70 100,70 C114,70 126,72 132,76 C126,80 114,82 100,82 C86,82 74,80 68,76Z"/>
              <!-- zone-biceps -->
              <path class="zone-biceps" d="M48,92 C46,104 46,118 50,130 C54,135 58,136 62,134 C60,122 58,108 58,96 C56,90 52,90 48,92Z"/>
              <path class="zone-biceps" d="M152,92 C154,104 154,118 150,130 C146,135 142,136 138,134 C140,122 142,108 142,96 C144,90 148,90 152,92Z"/>
              <!-- zone-triceps -->
              <path class="zone-triceps" d="M60,78 C62,82 64,92 64,102 C64,114 62,124 60,132 C58,126 56,118 56,110 C56,100 58,88 60,78Z"/>
              <path class="zone-triceps" d="M140,78 C138,82 136,92 136,102 C136,114 138,124 140,132 C142,126 144,118 144,110 C144,100 142,88 140,78Z"/>
              <!-- zone-core -->
              <path class="zone-core" d="M78,120 C76,133 76,147 80,159 C85,166 94,169 100,169 C106,169 115,166 120,159 C124,147 124,133 122,120 C116,116 108,114 100,114 C92,114 84,116 78,120Z"/>
              <!-- zone-oblicuos -->
              <path class="zone-oblicuos" d="M64,112 C60,123 60,137 62,149 C64,157 68,163 74,165 C74,152 72,140 72,128 C72,118 68,110 64,112Z"/>
              <path class="zone-oblicuos" d="M136,112 C140,123 140,137 138,149 C136,157 132,163 126,165 C126,152 128,140 128,128 C128,118 132,110 136,112Z"/>
              <!-- zone-gluteo -->
              <path class="zone-gluteo" d="M54,177 C48,186 44,198 44,210 C52,217 64,221 78,223 L100,225 L122,223 C136,221 148,217 156,210 C156,198 152,186 146,177 C136,184 120,188 100,188 C80,188 64,184 54,177Z"/>
              <!-- zone-abductores -->
              <path class="zone-abductores" d="M40,226 C36,240 36,256 38,270 C40,280 46,288 52,290 C52,276 50,262 50,248 C48,238 44,228 40,226Z"/>
              <path class="zone-abductores" d="M160,226 C164,240 164,256 162,270 C160,280 154,288 148,290 C148,276 150,262 150,248 C152,238 156,228 160,226Z"/>
              <!-- zone-cuadriceps -->
              <path class="zone-cuadriceps" d="M52,228 C48,244 46,260 48,276 C50,286 56,294 64,296 C66,282 66,268 66,254 C66,242 66,232 64,226 C60,226 56,226 52,228Z"/>
              <path class="zone-cuadriceps" d="M148,228 C152,244 154,260 152,276 C150,286 144,294 136,296 C134,282 134,268 134,254 C134,242 134,232 136,226 C140,226 144,226 148,228Z"/>
              <!-- zone-isquios -->
              <path class="zone-isquios" d="M78,228 C74,244 74,260 76,276 C78,286 82,292 86,294 C86,280 86,266 86,252 C86,240 84,230 78,228Z"/>
              <path class="zone-isquios" d="M122,228 C126,244 126,260 124,276 C122,286 118,292 114,294 C114,280 114,266 114,252 C114,240 116,230 122,228Z"/>
              <!-- zone-gemelos -->
              <path class="zone-gemelos" d="M48,304 C46,318 46,332 48,344 C50,352 54,358 60,360 C62,348 62,334 62,322 C60,312 56,304 48,304Z"/>
              <path class="zone-gemelos" d="M152,304 C154,318 154,332 152,344 C150,352 146,358 140,360 C138,348 138,334 138,322 C140,312 144,304 152,304Z"/>
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
