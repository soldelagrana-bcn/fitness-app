// ============================================================
// DATA.JS — Rutinas completas de Sol (todas las fases)
// ============================================================

const PERFIL = {
  nombre: "Sol",
  edad: 33,
  altura_cm: 156,
  peso_kg: 48.5,
  objetivo: "Recomposición corporal — tono sin volumen excesivo",
  lesion: "Escoliosis lumbar",
  fase_actual: 1,
  semana_actual: 1,
  fecha_inicio: null // se setea al iniciar
};

// ------------------------------------------------------------
// INACTIVO — targets por tipo de día.
// Los objetivos diarios son FIJOS y viven en nutrition-config.js
// (NutritionConfig.targets()). Estas tablas se conservan solo por
// si algún día se reactiva el reparto por tipo de día, detrás del
// toggle DAY_TYPE_TARGETS_ENABLED (desactivado por defecto).
// No usar para calcular objetivos.
// ------------------------------------------------------------
const MACROS_POR_DIA = {
  gym: { kcal: 1900, proteina: 115, carbos: 220, grasa: 60, label: "Día de gym" },
  gym_tenis: { kcal: 2000, proteina: 115, carbos: 235, grasa: 65, label: "Gym + Tenis" },
  tenis: { kcal: 1900, proteina: 115, carbos: 215, grasa: 62, label: "Tenis solo" },
  descanso: { kcal: 1700, proteina: 115, carbos: 185, grasa: 55, label: "Descanso activo" }
};

// Tipo de día por día de la semana (0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb)
// También inactivo para el cálculo de objetivos (ver nota anterior).
const TIPO_DIA_SEMANA = {
  0: "descanso",   // Domingo
  1: "gym",        // Lunes
  2: "gym_tenis",  // Martes (gym + tenis)
  3: "descanso",   // Miércoles
  4: "gym",        // Jueves
  5: "gym",        // Viernes
  6: "tenis"       // Sábado (tenis ocasional)
};

// ============================================================
// FASE 1 — Base (Semanas 1-4)
// ============================================================

const FASE1 = {
  numero: 1,
  nombre: "Base",
  semanas: [1, 4],
  objetivo: "Establecer técnica, cargas de referencia y consistencia. Rango de reps: 15–20.",
  criterio_avance: "Completar las 4 semanas + subir peso en ≥2 ejercicios compuestos",
  notificacion_fin: "¡Fase 1 completada! Es hora de actualizar tu rutina. Pega la Fase 2 en la app para continuar con la progresión.",
  sesiones: {
    lunes: {
      id: "D1",
      nombre: "D1 — Glúteo + Core",
      duracion_objetivo: "45–55 min",
      tipo_macro: "gym",
      warmup: "10 min remo suave (cadencia baja, activación espalda y glúteo) o 5 min movilidad cadera/tobillo",
      bloques: [
        {
          id: "A",
          nombre: "Bloque A",
          formato: "descanso_activo",
          ejercicios: [
            {
              id: "A1",
              nombre: "Hip thrust con mancuerna",
              carga_inicial_kg: 15,
              series: 3,
              reps_objetivo: 20,
              descripcion: "Espalda alta en banco, mancuerna en cadera, empuje de glúteo hasta extensión completa, sin hiperextender lumbar.",
              patron: "empuje_cadera",
              compuesto: true,
              zona: ["gluteo"]
            },
            {
              id: "A2",
              nombre: "Abducción de cadera con banda roja",
              carga_inicial_kg: 0,
              carga_tipo: "banda_roja",
              series: 3,
              reps_objetivo: 20,
              reps_por: "lado",
              descripcion: "De pie o tumbada lateral, banda en rodillas, separar pierna controlando la vuelta.",
              patron: "abduccion",
              compuesto: false,
              zona: ["gluteo", "abductores"]
            }
          ]
        },
        {
          id: "B",
          nombre: "Bloque B",
          formato: "descanso_activo",
          ejercicios: [
            {
              id: "B1",
              nombre: "RDL con kettlebell",
              carga_inicial_kg: 16,
              series: 3,
              reps_objetivo: 20,
              descripcion: "Bisagra de cadera, espalda neutra, KB cerca del cuerpo, bajar hasta sentir isquios y subir con glúteo.",
              patron: "bisagra",
              compuesto: true,
              zona: ["isquios", "gluteo", "lumbar"]
            },
            {
              id: "B2",
              nombre: "Curl de isquiotibiales en fitball",
              carga_inicial_kg: 0,
              carga_tipo: "corporal",
              series: 3,
              reps_objetivo: 15,
              descripcion: "Tumbada boca arriba, talones en fitball, elevar cadera y flexionar rodillas rodando la pelota.",
              patron: "curl",
              compuesto: false,
              zona: ["isquios", "gluteo"]
            }
          ]
        },
        {
          id: "C",
          nombre: "Bloque C",
          formato: "descanso_activo",
          ejercicios: [
            {
              id: "C1",
              nombre: "Sentadilla sumo con KB",
              carga_inicial_kg: 12,
              series: 3,
              reps_objetivo: 15,
              descripcion: "Pies anchos, punta hacia fuera, KB colgando en el centro, rodillas tracking sobre pies, foco en abductores y glúteo.",
              patron: "sentadilla",
              compuesto: true,
              zona: ["gluteo", "cuadriceps", "abductores"]
            },
            {
              id: "C2",
              nombre: "Patada de glúteo con banda en polea baja",
              carga_inicial_kg: 0,
              carga_tipo: "banda_polea",
              series: 3,
              reps_objetivo: 15,
              reps_por: "lado",
              descripcion: "En cuadrupedia o de pie con apoyo, extensión de cadera contra resistencia, sin rotar pelvis.",
              patron: "extension_cadera",
              compuesto: false,
              zona: ["gluteo"]
            }
          ]
        },
        {
          id: "CORE",
          nombre: "Core Finisher",
          formato: "secuencial",
          ejercicios: [
            {
              id: "CORE1",
              nombre: "Dead bug",
              carga_inicial_kg: 0,
              carga_tipo: "corporal",
              series: 3,
              reps_objetivo: 10,
              reps_por: "lado",
              descripcion: "Tumbada, espalda pegada al suelo, extender brazo y pierna opuesta simultáneamente sin perder contacto lumbar.",
              patron: "anti_extension",
              compuesto: false,
              zona: ["core"]
            },
            {
              id: "CORE2",
              nombre: "Pallof press con banda",
              carga_inicial_kg: 0,
              carga_tipo: "banda",
              series: 3,
              reps_objetivo: 12,
              reps_por: "lado",
              descripcion: "De pie lateral a la banda, brazos extendidos al frente, aguantar sin rotar torso.",
              patron: "anti_rotacion",
              compuesto: false,
              zona: ["core"]
            },
            {
              id: "CORE3",
              nombre: "Side plank con mancuerna + pulses",
              carga_inicial_kg: 5,
              series: 3,
              reps_objetivo: 20,
              reps_por: "lado",
              descripcion: "Side plank sobre antebrazo, mancuerna en cadera de arriba, mini elevaciones de cadera.",
              patron: "estabilizacion_lateral",
              compuesto: false,
              zona: ["core", "oblicuos"]
            }
          ]
        }
      ]
    },
    martes: {
      id: "D2",
      nombre: "D2 — Upper Body + Brazos",
      duracion_objetivo: "45–55 min",
      tipo_macro: "gym_tenis",
      warmup: "5 min movilidad hombros (circles, band pull-aparts, rotaciones)",
      bloques: [
        {
          id: "A",
          nombre: "Bloque A",
          formato: "descanso_activo",
          ejercicios: [
            {
              id: "A1",
              nombre: "Remo con mancuerna",
              carga_inicial_kg: 7.5,
              series: 3,
              reps_objetivo: 20,
              reps_por: "lado",
              descripcion: "Rodilla y mano apoyadas en banco, codo cerca del cuerpo, tirar hacia cadera no hacia hombro.",
              patron: "tiron_horizontal",
              compuesto: true,
              zona: ["espalda", "biceps"]
            },
            {
              id: "A2",
              nombre: "Press de pecho con mancuernas",
              carga_inicial_kg: 3,
              series: 3,
              reps_objetivo: 20,
              descripcion: "Tumbada en banco, mancuernas a los lados del pecho, empuje hacia arriba y centro, codos a 45°.",
              patron: "empuje_horizontal",
              compuesto: true,
              zona: ["pecho", "triceps", "hombro"]
            }
          ]
        },
        {
          id: "B",
          nombre: "Bloque B",
          formato: "descanso_activo",
          ejercicios: [
            {
              id: "B1",
              nombre: "Jalón al pecho agarre neutro (polea)",
              carga_inicial_kg: null,
              carga_tipo: "polea",
              series: 3,
              reps_objetivo: 20,
              descripcion: "Agarre neutro (palmas enfrentadas), tirar hacia clavícula, escápulas hacia abajo, no balancear.",
              patron: "tiron_vertical",
              compuesto: true,
              zona: ["espalda", "biceps"]
            },
            {
              id: "B2",
              nombre: "Press de hombro con mancuernas",
              carga_inicial_kg: 3,
              series: 3,
              reps_objetivo: 20,
              descripcion: "Sentada o de pie, empuje vertical, sin arquear lumbar, codos ligeramente adelantados.",
              patron: "empuje_vertical",
              compuesto: true,
              zona: ["hombro", "triceps"]
            }
          ]
        },
        {
          id: "C",
          nombre: "Bloque C — Brazos",
          formato: "descanso_activo",
          ejercicios: [
            {
              id: "C1",
              nombre: "Curl de bíceps con mancuernas",
              carga_inicial_kg: null,
              series: 3,
              reps_objetivo: 15,
              fallo_ultimo_set: true,
              descripcion: "Codos fijos a los lados, supinación en la subida, bajar controlado. Fallo en último set.",
              patron: "curl",
              compuesto: false,
              zona: ["biceps"]
            },
            {
              id: "C2",
              nombre: "Extensión de tríceps sobre la cabeza",
              carga_inicial_kg: null,
              series: 3,
              reps_objetivo: 15,
              fallo_ultimo_set: true,
              descripcion: "Una o dos manos, codos apuntando al techo, bajar mancuerna detrás de la cabeza y subir. Fallo en último set.",
              patron: "extension",
              compuesto: false,
              zona: ["triceps"]
            }
          ]
        },
        {
          id: "D",
          nombre: "Bloque D — Hombros",
          formato: "descanso_activo",
          ejercicios: [
            {
              id: "D1",
              nombre: "Face pull con banda",
              carga_inicial_kg: 0,
              carga_tipo: "banda",
              series: 3,
              reps_objetivo: 15,
              descripcion: "Banda a altura de cara, tirar hacia la cara separando manos, codos altos. Trabaja manguito y trapecio medio.",
              patron: "tiron_horizontal",
              compuesto: false,
              zona: ["hombro", "espalda_alta"]
            },
            {
              id: "D2",
              nombre: "Elevaciones laterales con mancuernas",
              carga_inicial_kg: 3,
              series: 3,
              reps_objetivo: 15,
              descripcion: "Ligera inclinación hacia delante, codos ligeramente flexionados, subir hasta altura de hombros.",
              patron: "elevacion",
              compuesto: false,
              zona: ["hombro"]
            }
          ]
        },
        {
          id: "CORE",
          nombre: "Core Finisher",
          formato: "secuencial",
          ejercicios: [
            {
              id: "CORE1",
              nombre: "Plank en TRX",
              carga_inicial_kg: 0,
              carga_tipo: "corporal",
              series: 3,
              duracion_seg: 20,
              descripcion: "Pies en TRX, posición de plancha, pelvis neutra, sin hundir caderas.",
              patron: "anti_extension",
              zona: ["core"]
            },
            {
              id: "CORE2",
              nombre: "Pallof press con banda",
              carga_inicial_kg: 0,
              carga_tipo: "banda",
              series: 3,
              reps_objetivo: 12,
              reps_por: "lado",
              descripcion: "De pie lateral a la banda, brazos extendidos al frente, aguantar sin rotar torso.",
              patron: "anti_rotacion",
              zona: ["core"]
            },
            {
              id: "CORE3",
              nombre: "Side plank con pulses",
              carga_inicial_kg: 0,
              carga_tipo: "corporal",
              series: 3,
              reps_objetivo: 20,
              reps_por: "lado",
              descripcion: "Side plank sobre antebrazo, mini elevaciones de cadera.",
              patron: "estabilizacion_lateral",
              zona: ["core"]
            }
          ]
        }
      ]
    },
    jueves: {
      id: "D3",
      nombre: "D3 — Pierna Completa",
      duracion_objetivo: "45–55 min",
      tipo_macro: "gym",
      warmup: "5 min movilidad cadera, tobillo, activación glúteo (puente x20, clamshell con banda x15)",
      bloques: [
        {
          id: "A",
          nombre: "Bloque A",
          formato: "descanso_activo",
          ejercicios: [
            {
              id: "A1",
              nombre: "Goblet squat con KB",
              carga_inicial_kg: 12,
              series: 3,
              reps_objetivo: 20,
              descripcion: "KB a la altura del pecho, pies a anchura de hombros, sentadilla profunda controlada, rodillas tracking, torso erguido.",
              patron: "sentadilla",
              compuesto: true,
              zona: ["cuadriceps", "gluteo"]
            },
            {
              id: "A2",
              nombre: "Step-up con mancuernas",
              carga_inicial_kg: null,
              series: 3,
              reps_objetivo: 15,
              reps_por: "pierna",
              descripcion: "Subir a banco/step, empuje desde el talón de la pierna de arriba, no apoyarse en la pierna de abajo.",
              patron: "empuje_unilateral",
              compuesto: true,
              zona: ["cuadriceps", "gluteo"]
            }
          ]
        },
        {
          id: "B",
          nombre: "Bloque B",
          formato: "descanso_activo",
          ejercicios: [
            {
              id: "B1",
              nombre: "Zancada reversa con mancuernas",
              carga_inicial_kg: 0,
              carga_tipo: "corporal_o_ligero",
              series: 3,
              reps_objetivo: 15,
              reps_por: "pierna",
              descripcion: "Paso hacia atrás, rodilla trasera cerca del suelo sin tocar, torso erguido, empuje desde talón delantero.",
              patron: "zancada",
              compuesto: true,
              zona: ["cuadriceps", "gluteo", "isquios"]
            },
            {
              id: "B2",
              nombre: "Extensión de cuádriceps en máquina",
              carga_inicial_kg: null,
              carga_tipo: "maquina",
              series: 3,
              reps_objetivo: 15,
              descripcion: "Rango controlado, sin hiperextender rodilla, foco en contracción arriba.",
              patron: "extension",
              compuesto: false,
              zona: ["cuadriceps"]
            }
          ]
        },
        {
          id: "C",
          nombre: "Bloque C",
          formato: "descanso_activo",
          ejercicios: [
            {
              id: "C1",
              nombre: "Abducción en máquina o con banda",
              carga_inicial_kg: null,
              series: 3,
              reps_objetivo: 20,
              descripcion: "Rango completo, sin compensar con lumbar.",
              patron: "abduccion",
              compuesto: false,
              zona: ["abductores", "gluteo"]
            },
            {
              id: "C2",
              nombre: "Gemelo de pie (calf raise)",
              carga_inicial_kg: 0,
              carga_tipo: "corporal",
              series: 3,
              reps_objetivo: 20,
              descripcion: "En escalón si posible, rango completo arriba y abajo.",
              patron: "elevacion_talon",
              compuesto: false,
              zona: ["gemelos"]
            }
          ]
        },
        {
          id: "CORE",
          nombre: "Core Finisher",
          formato: "secuencial",
          ejercicios: [
            {
              id: "CORE1",
              nombre: "Elevaciones de piernas tumbada",
              carga_inicial_kg: 0,
              carga_tipo: "corporal",
              series: 3,
              reps_objetivo: 12,
              descripcion: "Tumbada, espalda pegada al suelo, piernas juntas, bajar hasta ~10 cm del suelo sin que lumbar se despegue.",
              patron: "anti_extension",
              zona: ["core"]
            },
            {
              id: "CORE2",
              nombre: "Pallof press con banda",
              carga_inicial_kg: 0,
              carga_tipo: "banda",
              series: 3,
              reps_objetivo: 12,
              reps_por: "lado",
              descripcion: "De pie lateral a la banda, brazos extendidos al frente, aguantar sin rotar torso.",
              patron: "anti_rotacion",
              zona: ["core"]
            },
            {
              id: "CORE3",
              nombre: "Side plank con pulses",
              carga_inicial_kg: 0,
              carga_tipo: "corporal",
              series: 3,
              reps_objetivo: 20,
              reps_por: "lado",
              descripcion: "Side plank sobre antebrazo, mini elevaciones de cadera.",
              patron: "estabilizacion_lateral",
              zona: ["core"]
            }
          ]
        }
      ]
    },
    viernes: {
      id: "D4",
      nombre: "D4 — Full Body + Core Dinámico",
      duracion_objetivo: "45–55 min",
      tipo_macro: "gym",
      warmup: "5 min cardio suave + movilidad general",
      bloques: [
        {
          id: "A",
          nombre: "Bloque A",
          formato: "descanso_activo",
          ejercicios: [
            {
              id: "A1",
              nombre: "Hip thrust con mancuerna (variante)",
              carga_inicial_kg: 15,
              series: 3,
              reps_objetivo: 15,
              descripcion: "Pies más juntos para más cuádriceps. Sin hiperextender lumbar.",
              patron: "empuje_cadera",
              compuesto: true,
              zona: ["gluteo", "cuadriceps"]
            },
            {
              id: "A2",
              nombre: "Remo en TRX",
              carga_inicial_kg: 0,
              carga_tipo: "corporal",
              series: 3,
              reps_objetivo: 15,
              descripcion: "Cuerpo en ángulo, tirar hacia el pecho, codos atrás, escápulas juntas al final.",
              patron: "tiron_horizontal",
              compuesto: true,
              zona: ["espalda", "biceps"]
            }
          ]
        },
        {
          id: "B",
          nombre: "Bloque B",
          formato: "descanso_activo",
          ejercicios: [
            {
              id: "B1",
              nombre: "Press de pecho en fitball",
              carga_inicial_kg: null,
              series: 3,
              reps_objetivo: 15,
              descripcion: "Espalda alta sobre fitball (puente), mancuernas, press hacia arriba. Activa core por inestabilidad.",
              patron: "empuje_horizontal",
              compuesto: true,
              zona: ["pecho", "core", "triceps"]
            },
            {
              id: "B2",
              nombre: "Sentadilla con banda en rodillas",
              carga_inicial_kg: 0,
              carga_tipo: "banda_roja",
              series: 3,
              reps_objetivo: 15,
              descripcion: "Banda roja por encima de rodillas, activa abductores, foco en no dejar caer las rodillas hacia dentro.",
              patron: "sentadilla",
              compuesto: true,
              zona: ["cuadriceps", "gluteo", "abductores"]
            }
          ]
        },
        {
          id: "C",
          nombre: "Bloque C — Brazos",
          formato: "descanso_activo",
          ejercicios: [
            {
              id: "C1",
              nombre: "Curl de bíceps en polea baja",
              carga_inicial_kg: null,
              carga_tipo: "polea",
              series: 3,
              reps_objetivo: 15,
              fallo_ultimo_set: true,
              descripcion: "Fallo en último set.",
              patron: "curl",
              compuesto: false,
              zona: ["biceps"]
            },
            {
              id: "C2",
              nombre: "Press de tríceps en polea alta",
              carga_inicial_kg: null,
              carga_tipo: "polea",
              series: 3,
              reps_objetivo: 15,
              fallo_ultimo_set: true,
              descripcion: "Cuerda o barra, codos fijos a los lados, extensión completa. Fallo en último set.",
              patron: "extension",
              compuesto: false,
              zona: ["triceps"]
            }
          ]
        },
        {
          id: "CORE",
          nombre: "Core Dinámico Finisher",
          formato: "secuencial",
          ejercicios: [
            {
              id: "CORE1",
              nombre: "Pallof press con rotación",
              carga_inicial_kg: 0,
              carga_tipo: "banda",
              series: 3,
              reps_objetivo: 10,
              reps_por: "lado",
              descripcion: "Como Pallof press pero rotar el torso hacia la banda al final del movimiento.",
              patron: "anti_rotacion",
              zona: ["core"]
            },
            {
              id: "CORE2",
              nombre: "Dead bug con banda",
              carga_inicial_kg: 0,
              carga_tipo: "banda",
              series: 3,
              reps_objetivo: 10,
              reps_por: "lado",
              descripcion: "Banda en pies o manos añade resistencia al patrón estándar.",
              patron: "anti_extension",
              zona: ["core"]
            },
            {
              id: "CORE3",
              nombre: "Side plank con apertura de cadera",
              carga_inicial_kg: 0,
              carga_tipo: "corporal",
              series: 3,
              reps_objetivo: 15,
              reps_por: "lado",
              descripcion: "Desde side plank, elevar cadera arriba y bajar con control (hip dip).",
              patron: "estabilizacion_lateral",
              zona: ["core", "oblicuos"]
            }
          ]
        }
      ]
    }
  }
};

// ============================================================
// TODAS LAS FASES
// ============================================================
const FASES = { 1: FASE1 };
// Fase 2 y 3 se pueden importar via la función de importación manual

// ============================================================
// ZONAS MUSCULARES (para el mapa del cuerpo)
// ============================================================
const ZONAS_DISPLAY = {
  gluteo: { nombre: "Glúteo", color: "#a855f7" },
  cuadriceps: { nombre: "Cuádriceps", color: "#3b82f6" },
  isquios: { nombre: "Isquiotibiales", color: "#06b6d4" },
  abductores: { nombre: "Abductores", color: "#8b5cf6" },
  gemelos: { nombre: "Gemelos", color: "#6366f1" },
  core: { nombre: "Core / Abdomen", color: "#f59e0b" },
  oblicuos: { nombre: "Oblicuos", color: "#f97316" },
  espalda: { nombre: "Espalda", color: "#10b981" },
  espalda_alta: { nombre: "Espalda alta", color: "#34d399" },
  pecho: { nombre: "Pecho", color: "#ef4444" },
  hombro: { nombre: "Hombros", color: "#ec4899" },
  biceps: { nombre: "Bíceps", color: "#14b8a6" },
  triceps: { nombre: "Tríceps", color: "#0ea5e9" },
  lumbar: { nombre: "Lumbar", color: "#84cc16" }
};

// Mapa de qué día trabaja cada zona
const ZONAS_POR_DIA = {
  lunes: ["gluteo", "abductores", "isquios", "core"],
  martes: ["espalda", "pecho", "hombro", "biceps", "triceps", "core"],
  jueves: ["cuadriceps", "gluteo", "isquios", "abductores", "gemelos", "core"],
  viernes: ["gluteo", "cuadriceps", "espalda", "pecho", "biceps", "triceps", "core"]
};
