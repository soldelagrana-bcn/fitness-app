// ============================================================
// FOODS.JS — Catálogo de alimentos españoles integrado
// Referencia: Mercadona/Hacendado, La Sirena, Ametller Origen,
//             Carrefour, Condis + alimentos base BEDCA
// Valores nutricionales por 100g
// ============================================================

const FOODS_BUILTIN = [

  // ── LÁCTEOS ──────────────────────────────────────────────
  { id:'b001', cat:'Lácteos', nombre:'Yogur natural Hacendado',           kcal100:61,  prot100:3.8,  carbs100:4.7,  fat100:3.3, sat100:2.1, fiber100:0.0 },
  { id:'b002', cat:'Lácteos', nombre:'Yogur griego natural Hacendado',    kcal100:100, prot100:5.7,  carbs100:4.0,  fat100:7.0, sat100:4.6, fiber100:0.0 },
  { id:'b003', cat:'Lácteos', nombre:'Yogur griego 0% Hacendado',         kcal100:57,  prot100:9.5,  carbs100:6.0,  fat100:0.3, sat100:0.2, fiber100:0.0 },
  { id:'b004', cat:'Lácteos', nombre:'Skyr natural Hacendado',            kcal100:63,  prot100:10.5, carbs100:4.3,  fat100:0.4, sat100:0.3, fiber100:0.0 },
  { id:'b005', cat:'Lácteos', nombre:'Yogur proteico Hacendado',          kcal100:87,  prot100:12.0, carbs100:6.6,  fat100:1.0, sat100:0.6, fiber100:0.0 },
  { id:'b006', cat:'Lácteos', nombre:'Yogur natural Ametller Origen',     kcal100:56,  prot100:4.0,  carbs100:4.5,  fat100:2.1, sat100:1.4, fiber100:0.0 },
  { id:'b007', cat:'Lácteos', nombre:'Kéfir natural Hacendado',           kcal100:60,  prot100:3.3,  carbs100:4.5,  fat100:3.2, sat100:2.0, fiber100:0.0 },
  { id:'b008', cat:'Lácteos', nombre:'Queso fresco Hacendado',            kcal100:72,  prot100:8.5,  carbs100:1.8,  fat100:3.5, sat100:2.3, fiber100:0.0 },
  { id:'b009', cat:'Lácteos', nombre:'Queso cottage Carrefour',           kcal100:98,  prot100:11.0, carbs100:3.4,  fat100:4.3, sat100:2.7, fiber100:0.0 },
  { id:'b010', cat:'Lácteos', nombre:'Requesón Hacendado',                kcal100:78,  prot100:7.1,  carbs100:4.1,  fat100:3.5, sat100:2.2, fiber100:0.0 },
  { id:'b011', cat:'Lácteos', nombre:'Leche entera Hacendado',            kcal100:65,  prot100:3.2,  carbs100:4.7,  fat100:3.6, sat100:2.3, fiber100:0.0 },
  { id:'b012', cat:'Lácteos', nombre:'Leche semidesnatada Hacendado',     kcal100:46,  prot100:3.3,  carbs100:4.8,  fat100:1.6, sat100:1.0, fiber100:0.0 },
  { id:'b013', cat:'Lácteos', nombre:'Leche desnatada Hacendado',         kcal100:35,  prot100:3.4,  carbs100:4.9,  fat100:0.1, sat100:0.1, fiber100:0.0 },
  { id:'b014', cat:'Lácteos', nombre:'Leche entera Ametller Origen',      kcal100:67,  prot100:3.3,  carbs100:4.8,  fat100:3.7, sat100:2.4, fiber100:0.0 },
  { id:'b015', cat:'Lácteos', nombre:'Bebida de avena Hacendado',         kcal100:46,  prot100:1.1,  carbs100:7.7,  fat100:1.5, sat100:0.2, fiber100:0.8 },
  { id:'b016', cat:'Lácteos', nombre:'Bebida de almendras Hacendado',     kcal100:24,  prot100:0.7,  carbs100:2.7,  fat100:1.2, sat100:0.1, fiber100:0.4 },
  { id:'b017', cat:'Lácteos', nombre:'Bebida de soja Hacendado',          kcal100:35,  prot100:3.3,  carbs100:2.6,  fat100:1.9, sat100:0.3, fiber100:0.5 },

  // ── PROTEÍNAS ANIMALES ────────────────────────────────────
  { id:'b020', cat:'Proteínas', nombre:'Pechuga de pollo (fresca)',           kcal100:110, prot100:23.6, carbs100:0.0,  fat100:1.7, sat100:0.5, fiber100:0.0 },
  { id:'b021', cat:'Proteínas', nombre:'Pechuga de pollo La Sirena (cong.)',  kcal100:100, prot100:22.0, carbs100:0.5,  fat100:1.0, sat100:0.3, fiber100:0.0 },
  { id:'b022', cat:'Proteínas', nombre:'Contramuslo de pollo',               kcal100:163, prot100:20.0, carbs100:0.0,  fat100:9.0, sat100:2.6, fiber100:0.0 },
  { id:'b023', cat:'Proteínas', nombre:'Huevo entero (M)',                    kcal100:147, prot100:12.6, carbs100:0.7,  fat100:10.6, sat100:3.1, fiber100:0.0, peso_ud_g:60 },
  { id:'b024', cat:'Proteínas', nombre:'Clara de huevo pasteurizada',         kcal100:52,  prot100:10.9, carbs100:0.7,  fat100:0.2, sat100:0.0, fiber100:0.0 },
  { id:'b025', cat:'Proteínas', nombre:'Atún al natural (lata)',              kcal100:103, prot100:23.0, carbs100:0.0,  fat100:0.9, sat100:0.3, fiber100:0.0 },
  { id:'b026', cat:'Proteínas', nombre:'Atún en aceite (lata)',               kcal100:200, prot100:27.0, carbs100:0.0,  fat100:11.0, sat100:1.8, fiber100:0.0 },
  { id:'b027', cat:'Proteínas', nombre:'Salmón fresco',                       kcal100:206, prot100:20.0, carbs100:0.0,  fat100:13.0, sat100:3.1, fiber100:0.0, tags:['pescado_azul'] },
  { id:'b028', cat:'Proteínas', nombre:'Merluza fresca',                      kcal100:72,  prot100:16.0, carbs100:0.0,  fat100:0.8, sat100:0.2, fiber100:0.0 },
  { id:'b029', cat:'Proteínas', nombre:'Merluza La Sirena (congelada)',       kcal100:70,  prot100:16.0, carbs100:0.0,  fat100:0.9, sat100:0.2, fiber100:0.0 },
  { id:'b030', cat:'Proteínas', nombre:'Rape La Sirena (congelado)',          kcal100:75,  prot100:17.0, carbs100:0.0,  fat100:0.5, sat100:0.1, fiber100:0.0 },
  { id:'b031', cat:'Proteínas', nombre:'Gambas peladas La Sirena (cong.)',    kcal100:85,  prot100:18.0, carbs100:0.5,  fat100:1.0, sat100:0.3, fiber100:0.0 },
  { id:'b032', cat:'Proteínas', nombre:'Gambas frescas',                      kcal100:85,  prot100:18.0, carbs100:0.5,  fat100:1.0, sat100:0.3, fiber100:0.0 },
  { id:'b033', cat:'Proteínas', nombre:'Sardinas en aceite (lata)',           kcal100:200, prot100:19.0, carbs100:0.0,  fat100:13.0, sat100:2.7, fiber100:0.0, tags:['pescado_azul'] },
  { id:'b034', cat:'Proteínas', nombre:'Caballa en aceite (lata)',            kcal100:215, prot100:18.0, carbs100:0.0,  fat100:16.0, sat100:3.5, fiber100:0.0, tags:['pescado_azul'] },
  { id:'b035', cat:'Proteínas', nombre:'Lomo de cerdo (fresco)',              kcal100:143, prot100:21.0, carbs100:0.0,  fat100:7.0, sat100:2.5, fiber100:0.0 },
  { id:'b036', cat:'Proteínas', nombre:'Carne picada de ternera 5%',          kcal100:120, prot100:20.0, carbs100:0.0,  fat100:5.0, sat100:2.2, fiber100:0.0 },
  { id:'b037', cat:'Proteínas', nombre:'Carne picada mixta Hacendado',        kcal100:200, prot100:17.0, carbs100:0.0,  fat100:15.0, sat100:6.0, fiber100:0.0 },
  { id:'b038', cat:'Proteínas', nombre:'Pavo en lonchas Hacendado',           kcal100:84,  prot100:17.4, carbs100:0.3,  fat100:1.5, sat100:0.5, fiber100:0.0 },
  { id:'b039', cat:'Proteínas', nombre:'Jamón cocido extra Hacendado',        kcal100:100, prot100:16.0, carbs100:1.5,  fat100:3.5, sat100:1.2, fiber100:0.0 },
  { id:'b040', cat:'Proteínas', nombre:'Jamón serrano',                       kcal100:240, prot100:27.5, carbs100:0.2,  fat100:14.0, sat100:5.0, fiber100:0.0 },
  { id:'b041', cat:'Proteínas', nombre:'Tofu natural Hacendado',              kcal100:82,  prot100:8.0,  carbs100:1.9,  fat100:4.8, sat100:0.7, fiber100:0.9 },
  { id:'b042', cat:'Proteínas', nombre:'Tempeh',                              kcal100:192, prot100:19.0, carbs100:9.0,  fat100:11.0, sat100:2.2, fiber100:6.0 },

  // ── CARBOHIDRATOS ─────────────────────────────────────────
  { id:'b050', cat:'Carbohidratos', nombre:'Arroz blanco cocido',             kcal100:130, prot100:2.7,  carbs100:28.0, fat100:0.3, sat100:0.1, fiber100:0.4 },
  { id:'b051', cat:'Carbohidratos', nombre:'Arroz integral cocido',           kcal100:122, prot100:2.7,  carbs100:25.0, fat100:1.0, sat100:0.2, fiber100:1.8 },
  { id:'b052', cat:'Carbohidratos', nombre:'Arroz basmati cocido',            kcal100:130, prot100:2.7,  carbs100:28.0, fat100:0.3, sat100:0.1, fiber100:0.6 },
  { id:'b053', cat:'Carbohidratos', nombre:'Pasta blanca cocida',             kcal100:158, prot100:5.8,  carbs100:31.0, fat100:0.9, sat100:0.2, fiber100:1.8 },
  { id:'b054', cat:'Carbohidratos', nombre:'Pasta integral cocida',           kcal100:150, prot100:6.0,  carbs100:29.0, fat100:1.4, sat100:0.3, fiber100:4.5 },
  { id:'b055', cat:'Carbohidratos', nombre:'Copos de avena Hacendado',        kcal100:365, prot100:13.0, carbs100:58.0, fat100:7.0, sat100:1.3, fiber100:10.0 },
  { id:'b056', cat:'Carbohidratos', nombre:'Pan de molde blanco Hacendado',   kcal100:267, prot100:8.0,  carbs100:50.0, fat100:3.5, sat100:0.7, fiber100:2.5,  peso_ud_g:25 },
  { id:'b057', cat:'Carbohidratos', nombre:'Pan de molde integral Hacendado', kcal100:241, prot100:9.0,  carbs100:44.0, fat100:3.5, sat100:0.7, fiber100:6.0,  peso_ud_g:25 },
  { id:'b058', cat:'Carbohidratos', nombre:'Tortitas de arroz Hacendado',     kcal100:385, prot100:7.0,  carbs100:81.0, fat100:2.9, sat100:0.6, fiber100:2.0,  peso_ud_g:10 },
  { id:'b059', cat:'Carbohidratos', nombre:'Patata cocida',                   kcal100:77,  prot100:2.0,  carbs100:17.0, fat100:0.1, sat100:0.0, fiber100:1.8 },
  { id:'b060', cat:'Carbohidratos', nombre:'Patata al horno',                 kcal100:93,  prot100:2.5,  carbs100:21.0, fat100:0.1, sat100:0.0, fiber100:2.2 },
  { id:'b061', cat:'Carbohidratos', nombre:'Boniato cocido',                  kcal100:86,  prot100:1.6,  carbs100:20.0, fat100:0.1, sat100:0.0, fiber100:3.0 },
  { id:'b062', cat:'Carbohidratos', nombre:'Quinoa cocida',                   kcal100:120, prot100:4.4,  carbs100:21.0, fat100:1.9, sat100:0.2, fiber100:2.8 },
  { id:'b063', cat:'Carbohidratos', nombre:'Pan de centeno Carrefour',        kcal100:259, prot100:8.5,  carbs100:48.0, fat100:3.3, sat100:0.6, fiber100:6.5 },
  { id:'b064', cat:'Carbohidratos', nombre:'Muesli Hacendado',                kcal100:372, prot100:10.0, carbs100:60.0, fat100:9.0, sat100:1.5, fiber100:7.5 },
  { id:'b065', cat:'Carbohidratos', nombre:'Maíz cocido',                     kcal100:96,  prot100:3.4,  carbs100:21.0, fat100:1.5, sat100:0.2, fiber100:2.7 },

  // ── FRUTAS ────────────────────────────────────────────────
  { id:'b070', cat:'Frutas', nombre:'Plátano / Banana',  kcal100:89,  prot100:1.1,  carbs100:23.0, fat100:0.3, sat100:0.1, fiber100:2.6,  peso_ud_g:120 },
  { id:'b071', cat:'Frutas', nombre:'Manzana',           kcal100:52,  prot100:0.3,  carbs100:14.0, fat100:0.2, sat100:0.0, fiber100:2.4,  peso_ud_g:160 },
  { id:'b072', cat:'Frutas', nombre:'Naranja',           kcal100:47,  prot100:0.9,  carbs100:12.0, fat100:0.1, sat100:0.0, fiber100:2.4,  peso_ud_g:150 },
  { id:'b073', cat:'Frutas', nombre:'Fresas',            kcal100:32,  prot100:0.7,  carbs100:8.0,  fat100:0.3, sat100:0.0, fiber100:2.0 },
  { id:'b074', cat:'Frutas', nombre:'Arándanos',         kcal100:57,  prot100:0.7,  carbs100:14.0, fat100:0.3, sat100:0.0, fiber100:2.4 },
  { id:'b075', cat:'Frutas', nombre:'Kiwi',              kcal100:61,  prot100:1.1,  carbs100:15.0, fat100:0.5, sat100:0.0, fiber100:3.0,  peso_ud_g:75  },
  { id:'b076', cat:'Frutas', nombre:'Pera',              kcal100:57,  prot100:0.4,  carbs100:15.0, fat100:0.1, sat100:0.0, fiber100:3.1,  peso_ud_g:160 },
  { id:'b077', cat:'Frutas', nombre:'Uvas',              kcal100:69,  prot100:0.7,  carbs100:18.0, fat100:0.2, sat100:0.1, fiber100:0.9 },
  { id:'b078', cat:'Frutas', nombre:'Piña',              kcal100:50,  prot100:0.5,  carbs100:13.0, fat100:0.1, sat100:0.0, fiber100:1.4 },
  { id:'b079', cat:'Frutas', nombre:'Mango',             kcal100:65,  prot100:0.5,  carbs100:17.0, fat100:0.3, sat100:0.1, fiber100:1.6 },
  { id:'b080', cat:'Frutas', nombre:'Melón',             kcal100:34,  prot100:0.8,  carbs100:8.0,  fat100:0.2, sat100:0.1, fiber100:0.9 },
  { id:'b081', cat:'Frutas', nombre:'Sandía',            kcal100:30,  prot100:0.6,  carbs100:8.0,  fat100:0.2, sat100:0.0, fiber100:0.4 },
  { id:'b082', cat:'Frutas', nombre:'Melocotón',         kcal100:39,  prot100:0.9,  carbs100:10.0, fat100:0.3, sat100:0.0, fiber100:1.5,  peso_ud_g:150 },
  { id:'b083', cat:'Frutas', nombre:'Mandarina',         kcal100:53,  prot100:0.8,  carbs100:13.0, fat100:0.3, sat100:0.0, fiber100:1.8,  peso_ud_g:80  },
  { id:'b084', cat:'Frutas', nombre:'Cerezas',           kcal100:63,  prot100:1.1,  carbs100:16.0, fat100:0.2, sat100:0.0, fiber100:2.1 },
  { id:'b085', cat:'Frutas', nombre:'Granada',           kcal100:83,  prot100:1.7,  carbs100:19.0, fat100:1.2, sat100:0.1, fiber100:4.0 },
  { id:'b086', cat:'Frutas', nombre:'Dátiles secos',     kcal100:277, prot100:1.8,  carbs100:75.0, fat100:0.2, sat100:0.0, fiber100:8.0 },
  { id:'b087', cat:'Frutas', nombre:'Ciruela',           kcal100:46,  prot100:0.7,  carbs100:11.0, fat100:0.3, sat100:0.0, fiber100:1.4,  peso_ud_g:60  },
  { id:'b088', cat:'Frutas', nombre:'Higo',              kcal100:74,  prot100:0.8,  carbs100:19.0, fat100:0.3, sat100:0.1, fiber100:2.9,  peso_ud_g:50  },
  { id:'b089', cat:'Frutas', nombre:'Papaya',            kcal100:43,  prot100:0.5,  carbs100:11.0, fat100:0.3, sat100:0.1, fiber100:1.7 },

  // ── VERDURAS ──────────────────────────────────────────────
  { id:'b090', cat:'Verduras', nombre:'Espinacas',          kcal100:23,  prot100:2.9,  carbs100:3.6,  fat100:0.4, sat100:0.1, fiber100:2.2 },
  { id:'b091', cat:'Verduras', nombre:'Brócoli',            kcal100:34,  prot100:2.8,  carbs100:7.0,  fat100:0.4, sat100:0.1, fiber100:2.6 },
  { id:'b092', cat:'Verduras', nombre:'Zanahoria',          kcal100:41,  prot100:0.9,  carbs100:10.0, fat100:0.2, sat100:0.0, fiber100:2.8 },
  { id:'b093', cat:'Verduras', nombre:'Pepino',             kcal100:16,  prot100:0.7,  carbs100:4.0,  fat100:0.1, sat100:0.0, fiber100:0.5 },
  { id:'b094', cat:'Verduras', nombre:'Tomate',             kcal100:18,  prot100:0.9,  carbs100:4.0,  fat100:0.2, sat100:0.0, fiber100:1.2 },
  { id:'b095', cat:'Verduras', nombre:'Lechuga',            kcal100:15,  prot100:1.4,  carbs100:2.9,  fat100:0.2, sat100:0.0, fiber100:1.3 },
  { id:'b096', cat:'Verduras', nombre:'Cebolla',            kcal100:40,  prot100:1.1,  carbs100:9.0,  fat100:0.1, sat100:0.0, fiber100:1.7 },
  { id:'b097', cat:'Verduras', nombre:'Pimiento rojo',      kcal100:31,  prot100:1.0,  carbs100:7.0,  fat100:0.3, sat100:0.1, fiber100:2.1 },
  { id:'b098', cat:'Verduras', nombre:'Pimiento verde',     kcal100:20,  prot100:0.9,  carbs100:4.6,  fat100:0.2, sat100:0.1, fiber100:1.7 },
  { id:'b099', cat:'Verduras', nombre:'Calabacín',          kcal100:17,  prot100:1.2,  carbs100:3.1,  fat100:0.3, sat100:0.1, fiber100:1.1 },
  { id:'b100', cat:'Verduras', nombre:'Berenjena',          kcal100:24,  prot100:1.0,  carbs100:5.7,  fat100:0.2, sat100:0.0, fiber100:3.0 },
  { id:'b101', cat:'Verduras', nombre:'Aguacate',           kcal100:160, prot100:2.0,  carbs100:9.0,  fat100:15.0, sat100:2.1, fiber100:6.7, tags:['grasa_insaturada'] },
  { id:'b102', cat:'Verduras', nombre:'Champiñones',        kcal100:22,  prot100:3.1,  carbs100:3.3,  fat100:0.3, sat100:0.1, fiber100:1.0 },
  { id:'b103', cat:'Verduras', nombre:'Judías verdes',      kcal100:31,  prot100:1.8,  carbs100:7.0,  fat100:0.2, sat100:0.0, fiber100:3.4 },
  { id:'b104', cat:'Verduras', nombre:'Coliflor',           kcal100:25,  prot100:1.9,  carbs100:5.0,  fat100:0.3, sat100:0.1, fiber100:2.0 },
  { id:'b105', cat:'Verduras', nombre:'Rúcula',             kcal100:25,  prot100:2.6,  carbs100:3.7,  fat100:0.7, sat100:0.1, fiber100:1.6 },
  { id:'b106', cat:'Verduras', nombre:'Edamame',            kcal100:121, prot100:11.0, carbs100:9.0,  fat100:5.0, sat100:0.6, fiber100:5.2 },
  { id:'b107', cat:'Verduras', nombre:'Remolacha cocida',   kcal100:43,  prot100:1.6,  carbs100:10.0, fat100:0.2, sat100:0.0, fiber100:2.0 },
  { id:'b108', cat:'Verduras', nombre:'Ajo',                kcal100:149, prot100:6.4,  carbs100:33.0, fat100:0.5, sat100:0.1, fiber100:2.1 },

  // ── LEGUMBRES ─────────────────────────────────────────────
  { id:'b110', cat:'Legumbres', nombre:'Garbanzos cocidos',      kcal100:164, prot100:9.0,  carbs100:27.0, fat100:2.6, sat100:0.3, fiber100:7.6 },
  { id:'b111', cat:'Legumbres', nombre:'Lentejas cocidas',       kcal100:116, prot100:9.0,  carbs100:20.0, fat100:0.4, sat100:0.1, fiber100:7.9 },
  { id:'b112', cat:'Legumbres', nombre:'Alubias blancas cocidas',kcal100:127, prot100:8.7,  carbs100:22.0, fat100:0.5, sat100:0.1, fiber100:6.0 },
  { id:'b113', cat:'Legumbres', nombre:'Alubias negras cocidas', kcal100:132, prot100:8.9,  carbs100:24.0, fat100:0.5, sat100:0.1, fiber100:8.7 },
  { id:'b114', cat:'Legumbres', nombre:'Hummus Hacendado',       kcal100:170, prot100:7.0,  carbs100:11.0, fat100:11.0, sat100:1.5, fiber100:5.0 },

  // ── GRASAS Y FRUTOS SECOS ─────────────────────────────────
  { id:'b120', cat:'Grasas', nombre:'Aceite de oliva virgen extra',  kcal100:884, prot100:0.0,  carbs100:0.0,  fat100:100.0, sat100:14.0, fiber100:0.0, tags:['grasa_insaturada'] },
  { id:'b121', cat:'Grasas', nombre:'Mantequilla',                    kcal100:717, prot100:0.9,  carbs100:0.1,  fat100:81.0, sat100:51.0, fiber100:0.0 },
  { id:'b122', cat:'Grasas', nombre:'Almendras',                      kcal100:579, prot100:21.0, carbs100:22.0, fat100:50.0, sat100:3.8, fiber100:12.5, tags:['grasa_insaturada'] },
  { id:'b123', cat:'Grasas', nombre:'Nueces',                         kcal100:654, prot100:15.0, carbs100:14.0, fat100:65.0, sat100:6.1, fiber100:6.7, tags:['grasa_insaturada'] },
  { id:'b124', cat:'Grasas', nombre:'Anacardos',                      kcal100:553, prot100:18.0, carbs100:33.0, fat100:44.0, sat100:7.8, fiber100:3.3 },
  { id:'b125', cat:'Grasas', nombre:'Cacahuetes',                     kcal100:567, prot100:26.0, carbs100:16.0, fat100:49.0, sat100:6.8, fiber100:8.5 },
  { id:'b126', cat:'Grasas', nombre:'Crema de cacahuete Hacendado',   kcal100:588, prot100:25.0, carbs100:20.0, fat100:50.0, sat100:8.0, fiber100:6.0 },
  { id:'b127', cat:'Grasas', nombre:'Semillas de chía',               kcal100:486, prot100:17.0, carbs100:42.0, fat100:31.0, sat100:3.3, fiber100:34.4, tags:['grasa_insaturada'] },
  { id:'b128', cat:'Grasas', nombre:'Semillas de lino',               kcal100:534, prot100:18.0, carbs100:29.0, fat100:42.0, sat100:3.7, fiber100:27.3, tags:['grasa_insaturada'] },
  { id:'b129', cat:'Grasas', nombre:'Chocolate negro 85% Hacendado',  kcal100:600, prot100:9.0,  carbs100:14.0, fat100:52.0, sat100:31.0, fiber100:12.0 },

  // ── PROTEÍNA Y SUPLEMENTOS ────────────────────────────────
  { id:'b130', cat:'Suplementos', nombre:'Proteína de suero Hacendado',  kcal100:380, prot100:72.0, carbs100:10.0, fat100:7.0, sat100:3.5, fiber100:0.5 },
  { id:'b131', cat:'Suplementos', nombre:'Bebida proteica Hacendado',    kcal100:60,  prot100:9.0,  carbs100:4.0,  fat100:1.2, sat100:0.8, fiber100:0.5 },

  // ── PREPARADOS Y OTROS ────────────────────────────────────
  { id:'b140', cat:'Otros', nombre:'Croquetas La Sirena (cong.)',         kcal100:214, prot100:7.5,  carbs100:21.0, fat100:12.0, sat100:3.5, fiber100:1.5, peso_ud_g:20 },
  { id:'b141', cat:'Otros', nombre:'Salsa de soja',                       kcal100:53,  prot100:8.0,  carbs100:7.0,  fat100:0.1, sat100:0.0, fiber100:0.8 },
  { id:'b142', cat:'Otros', nombre:'Ketchup Hacendado',                   kcal100:104, prot100:1.6,  carbs100:26.0, fat100:0.1, sat100:0.0, fiber100:1.0 },
  { id:'b143', cat:'Otros', nombre:'Mayonesa Hacendado',                  kcal100:690, prot100:1.2,  carbs100:1.2,  fat100:77.0, sat100:6.5, fiber100:0.0 },
  { id:'b144', cat:'Otros', nombre:'Queso parmesano rallado',             kcal100:431, prot100:38.0, carbs100:0.0,  fat100:30.0, sat100:19.0, fiber100:0.0 },
  { id:'b145', cat:'Otros', nombre:'Mozzarella fresca',                   kcal100:253, prot100:18.0, carbs100:2.6,  fat100:19.0, sat100:12.0, fiber100:0.0 },

  // ── BÁSICOS ADICIONALES ───────────────────────────────────
  { id:'b150', cat:'Lácteos', nombre:'Queso manchego curado',             kcal100:392, prot100:27.0, carbs100:0.5,  fat100:32.0, sat100:21.0, fiber100:0.0 },
  { id:'b151', cat:'Lácteos', nombre:'Queso mozzarella rallado Hacendado',kcal100:318, prot100:24.0, carbs100:2.4,  fat100:24.0, sat100:15.0, fiber100:0.0 },
  { id:'b152', cat:'Lácteos', nombre:'Nata para cocinar Hacendado',       kcal100:194, prot100:2.5,  carbs100:3.5,  fat100:19.0, sat100:12.5, fiber100:0.0 },
  { id:'b153', cat:'Lácteos', nombre:'Batido de chocolate Hacendado',     kcal100:71,  prot100:3.4,  carbs100:11.0, fat100:1.5, sat100:1.0, fiber100:0.5 },

  { id:'b160', cat:'Proteínas', nombre:'Pechuga de pavo (fresca)',        kcal100:104, prot100:22.0, carbs100:0.0,  fat100:1.7, sat100:0.5, fiber100:0.0 },
  { id:'b161', cat:'Proteínas', nombre:'Bacalao fresco',                  kcal100:82,  prot100:18.0, carbs100:0.0,  fat100:0.7, sat100:0.1, fiber100:0.0 },
  { id:'b162', cat:'Proteínas', nombre:'Boquerones frescos',              kcal100:131, prot100:20.0, carbs100:0.0,  fat100:5.0, sat100:1.3, fiber100:0.0, tags:['pescado_azul'] },
  { id:'b163', cat:'Proteínas', nombre:'Mejillones al natural (lata)',    kcal100:84,  prot100:12.0, carbs100:3.5,  fat100:2.5, sat100:0.5, fiber100:0.0 },
  { id:'b164', cat:'Proteínas', nombre:'Calamares',                       kcal100:92,  prot100:16.0, carbs100:3.0,  fat100:1.5, sat100:0.4, fiber100:0.0 },

  { id:'b170', cat:'Carbohidratos', nombre:'Avena instantánea Quaker',   kcal100:356, prot100:12.5, carbs100:60.0, fat100:7.0, sat100:1.3, fiber100:10.0 },
  { id:'b171', cat:'Carbohidratos', nombre:'Pan baguette',                kcal100:262, prot100:9.0,  carbs100:51.0, fat100:2.0, sat100:0.4, fiber100:2.7,  peso_ud_g:30 },
  { id:'b172', cat:'Carbohidratos', nombre:'Tostada de pan (rebanada)',   kcal100:313, prot100:9.0,  carbs100:61.0, fat100:3.5, sat100:0.7, fiber100:3.5,  peso_ud_g:25 },
  { id:'b173', cat:'Carbohidratos', nombre:'Macarrones (secos)',          kcal100:350, prot100:12.0, carbs100:70.0, fat100:1.5, sat100:0.3, fiber100:3.0 },
  { id:'b174', cat:'Carbohidratos', nombre:'Espagueti (secos)',           kcal100:352, prot100:12.0, carbs100:70.0, fat100:1.5, sat100:0.3, fiber100:3.0 },
  { id:'b175', cat:'Carbohidratos', nombre:'Arroz redondo (seco)',        kcal100:356, prot100:7.0,  carbs100:79.0, fat100:0.6, sat100:0.2, fiber100:1.0 },
  { id:'b176', cat:'Carbohidratos', nombre:'Legumbres (garbanzo cocido)', kcal100:164, prot100:9.0,  carbs100:27.0, fat100:2.6, sat100:0.3, fiber100:7.6 },

  { id:'b180', cat:'Verduras', nombre:'Maíz dulce (lata)',               kcal100:86,  prot100:3.2,  carbs100:19.0, fat100:1.2, sat100:0.2, fiber100:2.4 },
  { id:'b181', cat:'Verduras', nombre:'Espárragos',                       kcal100:20,  prot100:2.2,  carbs100:3.9,  fat100:0.1, sat100:0.0, fiber100:2.1 },
  { id:'b182', cat:'Verduras', nombre:'Coles de Bruselas',                kcal100:43,  prot100:3.4,  carbs100:9.0,  fat100:0.3, sat100:0.1, fiber100:3.8 },
  { id:'b183', cat:'Verduras', nombre:'Alcachofas',                       kcal100:47,  prot100:3.3,  carbs100:10.5, fat100:0.2, sat100:0.0, fiber100:5.4 },
  { id:'b184', cat:'Verduras', nombre:'Puerro',                           kcal100:31,  prot100:1.5,  carbs100:7.0,  fat100:0.3, sat100:0.0, fiber100:1.8 },
  { id:'b185', cat:'Verduras', nombre:'Apio',                             kcal100:16,  prot100:0.7,  carbs100:3.0,  fat100:0.2, sat100:0.0, fiber100:1.6 },
  { id:'b186', cat:'Verduras', nombre:'Col lombarda',                     kcal100:29,  prot100:1.4,  carbs100:6.0,  fat100:0.2, sat100:0.0, fiber100:2.1 },
  { id:'b187', cat:'Verduras', nombre:'Nabo',                             kcal100:28,  prot100:0.9,  carbs100:6.0,  fat100:0.1, sat100:0.0, fiber100:1.8 },

  { id:'b190', cat:'Grasas', nombre:'Aceite de coco',                    kcal100:862, prot100:0.0,  carbs100:0.0,  fat100:100.0, sat100:87.0, fiber100:0.0 },
  { id:'b191', cat:'Grasas', nombre:'Tahini (pasta de sésamo)',          kcal100:595, prot100:17.0, carbs100:21.0, fat100:54.0, sat100:7.6, fiber100:9.3, tags:['grasa_insaturada'] },
  { id:'b192', cat:'Grasas', nombre:'Pistachos',                         kcal100:562, prot100:20.0, carbs100:28.0, fat100:45.0, sat100:5.6, fiber100:10.3, tags:['grasa_insaturada'] },
  { id:'b193', cat:'Grasas', nombre:'Avellanas',                         kcal100:628, prot100:15.0, carbs100:17.0, fat100:61.0, sat100:4.5, fiber100:9.7, tags:['grasa_insaturada'] },

  { id:'b200', cat:'Otros', nombre:'Miel',                               kcal100:304, prot100:0.3,  carbs100:82.0, fat100:0.0, sat100:0.0, fiber100:0.2 },
  { id:'b201', cat:'Otros', nombre:'Mermelada Hacendado',                kcal100:265, prot100:0.4,  carbs100:65.0, fat100:0.1, sat100:0.0, fiber100:1.0 },
  { id:'b202', cat:'Otros', nombre:'Cacao en polvo Hacendado',           kcal100:375, prot100:21.0, carbs100:36.0, fat100:12.0, sat100:7.0, fiber100:30.0 },
  { id:'b203', cat:'Otros', nombre:'Café solo (sin azúcar)',             kcal100:2,   prot100:0.1,  carbs100:0.0,  fat100:0.0, sat100:0.0, fiber100:0.0 },
  { id:'b204', cat:'Otros', nombre:'Leche de coco (lata)',               kcal100:185, prot100:1.7,  carbs100:2.7,  fat100:18.0, sat100:16.0, fiber100:1.0 },
  { id:'b205', cat:'Otros', nombre:'Tomate triturado (lata)',            kcal100:32,  prot100:1.5,  carbs100:6.0,  fat100:0.2, sat100:0.0, fiber100:1.4 },
  { id:'b206', cat:'Otros', nombre:'Caldo de pollo (brick)',             kcal100:10,  prot100:1.0,  carbs100:1.0,  fat100:0.2, sat100:0.1, fiber100:0.0 },

  // ── SUPLEMENTOS DE SOL (uso diferenciado) ────────────────
  // Evolate whey: SOLO post-entreno. Garden of Life: SOLO recetas.
  { id:'b210', cat:'Suplementos', nombre:'Proteína Evolate whey isolate',      kcal100:380, prot100:86.0, carbs100:3.0,  fat100:2.0, sat100:1.0, fiber100:0.0, tags:['post_entreno','whey'] },
  { id:'b211', cat:'Suplementos', nombre:'Proteína Garden of Life plant-based', kcal100:375, prot100:70.0, carbs100:12.0, fat100:5.0, sat100:1.0, fiber100:8.0, tags:['solo_recetas','plant'] },

  // ── ALTA DENSIDAD PROTEICA ───────────────────────────────
  { id:'b212', cat:'Lácteos', nombre:'Quark 0% Hacendado',            kcal100:60,  prot100:12.0, carbs100:4.0,  fat100:0.2, sat100:0.1, fiber100:0.0 },
  { id:'b213', cat:'Lácteos', nombre:'Queso batido 0% Hacendado',     kcal100:47,  prot100:8.0,  carbs100:4.0,  fat100:0.2, sat100:0.1, fiber100:0.0 },
  { id:'b214', cat:'Lácteos', nombre:'Skyr proteico sabores Hacendado', kcal100:65, prot100:11.0, carbs100:5.0, fat100:0.2, sat100:0.1, fiber100:0.0 },
  { id:'b215', cat:'Proteínas', nombre:'Clara de huevo en polvo',      kcal100:370, prot100:80.0, carbs100:7.0,  fat100:0.5, sat100:0.2, fiber100:0.0 },
  { id:'b216', cat:'Proteínas', nombre:'Bonito del norte al natural',  kcal100:108, prot100:24.0, carbs100:0.0,  fat100:1.2, sat100:0.3, fiber100:0.0 },
  { id:'b217', cat:'Proteínas', nombre:'Trucha fresca',                kcal100:119, prot100:20.5, carbs100:0.0,  fat100:3.5, sat100:0.8, fiber100:0.0, tags:['pescado_azul'] },
  { id:'b218', cat:'Proteínas', nombre:'Salmón ahumado',               kcal100:180, prot100:23.0, carbs100:0.5,  fat100:9.0, sat100:1.9, fiber100:0.0, tags:['pescado_azul'] },
  { id:'b219', cat:'Otros', nombre:'Gelatina proteica sin azúcar',     kcal100:12,  prot100:2.5,  carbs100:0.4,  fat100:0.0, sat100:0.0, fiber100:0.0 },

  // ── PANES DE MASA MADRE ──────────────────────────────────
  { id:'b220', cat:'Carbohidratos', nombre:'Pan de masa madre',            kcal100:260, prot100:9.5,  carbs100:50.0, fat100:1.5, sat100:0.3, fiber100:3.5 },
  { id:'b221', cat:'Carbohidratos', nombre:'Pan de masa madre integral',   kcal100:247, prot100:10.0, carbs100:44.0, fat100:1.8, sat100:0.4, fiber100:6.5 },
];

// ============================================================
// FoodDB — índice y helpers sobre el catálogo
// ============================================================
const FoodDB = {
  _index: null,

  /** Catálogo completo: builtin + alimentos propios de la usuaria. */
  all() {
    const custom = (typeof Store !== 'undefined' && Store.getFoodsDB)
      ? Store.getFoodsDB()
      : [];
    return FOODS_BUILTIN.concat(custom);
  },

  /** Invalida el índice tras crear/editar un alimento propio. */
  invalidate() { this._index = null; },

  byId(id) {
    if (!this._index) {
      this._index = {};
      for (const f of this.all()) this._index[f.id] = f;
    }
    return this._index[id] || null;
  },

  /**
   * Densidad proteica: g de proteína por kcal.
   * Criterio de RANKING al sugerir, nunca filtro excluyente —
   * los alimentos densos en kcal siguen siendo usables en
   * cantidades pequeñas o como grasa del día.
   */
  proteinDensity(food) {
    if (!food || !food.kcal100) return 0;
    return food.prot100 / food.kcal100;
  },

  /** Macros de una cantidad concreta, siempre en gramos/ml. */
  macrosFor(food, grams) {
    const f = (grams || 0) / 100;
    return {
      kcal:  (food.kcal100  || 0) * f,
      prot:  (food.prot100  || 0) * f,
      carbs: (food.carbs100 || 0) * f,
      fat:   (food.fat100   || 0) * f,
      sat:   (food.sat100   || 0) * f,
      fiber: (food.fiber100 || 0) * f,
    };
  },

  hasTag(food, tag) {
    return !!(food && food.tags && food.tags.indexOf(tag) >= 0);
  },
};

if (typeof window !== 'undefined') {
  window.FOODS_BUILTIN = FOODS_BUILTIN;
  window.FoodDB = FoodDB;
}
