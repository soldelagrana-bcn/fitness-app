// ============================================================
// APP.JS — Lógica principal, routing y vistas
// ============================================================

let currentView = 'hoy';
let activeWorkout = null; // workout en progreso
let workoutTimer = null;
let workoutSeconds = 0;

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

  // Card de hoy
  let todayCard = '';
  if (!sesion) {
    todayCard = `
      <div class="card rest-card">
        <div class="rest-icon">🚶‍♀️</div>
        <h3>Día de descanso activo</h3>
        <p class="muted">Caminata, e-bike o tenis. Recupera y disfruta.</p>
        <div class="macro-target rest-macro">
          <span>Objetivo calórico hoy:</span>
          <strong>1.700 kcal</strong>
        </div>
      </div>`;
  } else {
    const zonas = ZONAS_POR_DIA[diaKey] || [];
    const zonasHtml = zonas.map(z => {
      const zona = ZONAS_DISPLAY[z];
      return `<span class="zona-tag" style="background:${zona.color}22;color:${zona.color}">${zona.nombre}</span>`;
    }).join('');

    let btnHtml = '';
    if (todayWorkout && todayWorkout.completado) {
      btnHtml = `<button class="btn btn-success" disabled>✓ Entrenamiento completado</button>`;
    } else if (todayWorkout && !todayWorkout.completado) {
      btnHtml = `<button class="btn btn-primary" data-action="continuar-workout" data-id="${todayWorkout.id}">
        ▶ Continuar entrenamiento
      </button>`;
    } else {
      btnHtml = `<button class="btn btn-primary" data-action="iniciar-workout" data-dia="${diaKey}">
        ▶ Iniciar entrenamiento
      </button>`;
    }

    todayCard = `
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
        ${btnHtml}
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

  return `
    <div class="view">
      <div class="view-header">
        <div>
          <p class="view-date">${today.toLocaleDateString('es-ES', {weekday:'long', day:'numeric', month:'long'})}</p>
          <h2 class="view-title">Buenos días, Sol 👋</h2>
        </div>
        <div class="phase-badge">
          <span class="phase-label">Fase ${config.fase}</span>
          <span class="week-label">Semana ${semana}/4</span>
          ${(() => { const streak = Store.getStreak(); return streak.current > 0 ? `<span class="streak-badge">🔥 ${streak.current} semana${streak.current > 1 ? 's' : ''}</span>` : ''; })()}
        </div>
      </div>

      ${faseNotif}

      <section>
        <h4 class="section-title">Hoy</h4>
        ${todayCard}
      </section>

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
                    ${done ? '<span class="plan-check">✓</span>' : ''}
                    ${isToday && !done ? '<span class="plan-hoy-tag">Hoy</span>' : ''}
                    <span class="plan-arrow">›</span>
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
                    ${actividad ? '<span class="plan-check">✓</span>' : ''}
                    ${isToday ? '<span class="plan-hoy-tag">Hoy</span>' : ''}
                    <span class="plan-arrow">+</span>
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
        <div class="workout-progress-text">${w.bloque_actual + 1}/${totalBloques}</div>
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
            <svg viewBox="0 0 120 250" class="body-svg">
              <circle cx="60" cy="18" r="13" fill="#E8E8F0"/>
              <rect x="54" y="30" width="12" height="10" rx="3" fill="#E8E8F0"/>
              <ellipse class="zone-hombro" cx="35" cy="52" rx="15" ry="9"/>
              <ellipse class="zone-hombro" cx="85" cy="52" rx="15" ry="9"/>
              <ellipse class="zone-pecho" cx="60" cy="59" rx="20" ry="13"/>
              <rect class="zone-biceps" x="16" y="56" width="13" height="28" rx="6"/>
              <rect class="zone-triceps" x="91" y="56" width="13" height="28" rx="6"/>
              <rect x="13" y="87" width="11" height="22" rx="5" fill="#E8E8F0"/>
              <rect x="96" y="87" width="11" height="22" rx="5" fill="#E8E8F0"/>
              <rect class="zone-core" x="43" y="74" width="34" height="38" rx="7"/>
              <rect class="zone-oblicuos" x="28" y="78" width="13" height="26" rx="6"/>
              <rect class="zone-oblicuos" x="79" y="78" width="13" height="26" rx="6"/>
              <ellipse class="zone-gluteo" cx="60" cy="120" rx="22" ry="13"/>
              <rect class="zone-cuadriceps" x="34" y="133" width="19" height="50" rx="9"/>
              <rect class="zone-cuadriceps" x="67" y="133" width="19" height="50" rx="9"/>
              <rect class="zone-isquios" x="38" y="133" width="11" height="46" rx="5" opacity="0.5"/>
              <rect class="zone-isquios" x="71" y="133" width="11" height="46" rx="5" opacity="0.5"/>
              <rect class="zone-gemelos" x="36" y="187" width="17" height="35" rx="8"/>
              <rect class="zone-gemelos" x="67" y="187" width="17" height="35" rx="8"/>
              <ellipse cx="46" cy="226" rx="11" ry="5" fill="#E8E8F0"/>
              <ellipse cx="74" cy="226" rx="11" ry="5" fill="#E8E8F0"/>
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
