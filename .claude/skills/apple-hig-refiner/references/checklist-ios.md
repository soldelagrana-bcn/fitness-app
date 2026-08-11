# Comprobaciones concretas para iOS

Lista de verificación con el CSS y el marcado exactos. Recórrela al aplicar arreglos.

## Índice

1. [Las cuatro trampas de Safari](#1-las-cuatro-trampas-de-safari)
2. [Zonas táctiles](#2-zonas-táctiles)
3. [Safe areas y pantalla completa](#3-safe-areas-y-pantalla-completa)
4. [Tipografía](#4-tipografía)
5. [Desplazamiento](#5-desplazamiento)
6. [Hojas modales](#6-hojas-modales)
7. [Formularios y teclado](#7-formularios-y-teclado)
8. [Movimiento](#8-movimiento)
9. [Modo oscuro](#9-modo-oscuro)
10. [Accesibilidad](#10-accesibilidad)
11. [Instalación como app](#11-instalación-como-app)

---

## 1. Las cuatro trampas de Safari

### Zoom al enfocar un campo
Safari amplía la página si el campo tiene menos de 16 px. Descuadra todo y no hay
forma elegante de volver.

```css
input, select, textarea { font-size: 16px; }
```

Si el diseño pide un campo visualmente menor, reduce el `padding` en vez del tamaño
de letra. Desactivar el zoom con `maximum-scale=1` **no** es la solución: rompe la
posibilidad de ampliar, que es una función de accesibilidad.

### Destello gris al tocar
```css
* { -webkit-tap-highlight-color: transparent; }
```
Al quitarlo hay que dar respuesta propia (`:active`), o parecerá que no responde.

### Ajuste automático de tamaño de texto en horizontal
```css
html { -webkit-text-size-adjust: 100%; }
```

### `100vh` no es la altura visible
Con las barras de Safari, `100vh` se pasa. Usa `100dvh` (con `100vh` de reserva para
navegadores viejos).

---

## 2. Zonas táctiles

Mínimo 44×44 pt, con 8 px de separación entre objetivos contiguos.

```css
.icon-btn { min-width: 44px; min-height: 44px; }
```

Para agrandar el área sin cambiar el aspecto:

```css
.small-btn { position: relative; }
.small-btn::after {
  content: "";
  position: absolute;
  inset: -10px;          /* extiende el objetivo sin mover nada visible */
}
```

Cuidado con las filas de lista donde la fila entera es pulsable y además lleva un
botón de borrar: el botón necesita su propia zona y detener la propagación, o se
acaba abriendo el detalle al intentar borrar.

---

## 3. Safe areas y pantalla completa

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

```css
.tabbar   { padding-bottom: env(safe-area-inset-bottom); }
.topbar   { padding-top: env(safe-area-inset-top); }
.fullwide { padding-left: env(safe-area-inset-left); padding-right: env(safe-area-inset-right); }
```

Sin `viewport-fit=cover` las variables `env()` valen cero y el arreglo parece
aplicado sin estarlo.

---

## 4. Tipografía

```css
:root {
  --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  --mono: ui-monospace, "SF Mono", SFMono-Regular, Menlo, monospace;
}
```

- Cuerpo 16-17 px, mínimo absoluto 11 px y solo en etiquetas.
- Interlineado 1,3-1,5 en texto corrido.
- Números en columna: `font-variant-numeric: tabular-nums`.
- Titulares: `text-wrap: balance`.
- Mayúsculas pequeñas: añade `letter-spacing` de 0,08-0,13 em o se apelmazan.

---

## 5. Desplazamiento

```css
.scroller { -webkit-overflow-scrolling: touch; overscroll-behavior: contain; }
body { overscroll-behavior-y: none; }   /* evita el rebote de recarga */
```

Contenido ancho (tablas, código) dentro de su propio contenedor con
`overflow-x: auto`; el cuerpo de la página nunca se desplaza en horizontal.

---

## 6. Hojas modales

- Suben desde abajo, esquinas redondeadas arriba, asa visible.
- `max-height: 88dvh` y el cuerpo con su propio `overflow-y: auto`.
- Se cierran tocando el fondo, con Escape y, si se puede, arrastrando.
- `role="dialog"` y `aria-modal="true"`.
- Al abrirse, el foco entra en la hoja; al cerrarse, vuelve al botón que la abrió.
- El fondo no debe desplazarse detrás de la hoja abierta.

Una hoja que abre otra hoja ya es señal de que el flujo necesita repensarse.

---

## 7. Formularios y teclado

| Campo | Marcado |
|---|---|
| Cantidad | `type="number" inputmode="numeric"` |
| Decimal | `inputmode="decimal"` |
| Buscador | `type="search" autocorrect="off" autocapitalize="off" spellcheck="false"` |
| Correo | `type="email" autocomplete="email"` |

- Etiqueta real asociada (`<label for>`), no solo `placeholder`: el marcador de
  posición desaparece al escribir y deja el campo sin nombre.
- Al enfocar un campo bajo el teclado, `scrollIntoView({block:'center'})`.
- El botón de envío no puede quedar tapado por el teclado.

---

## 8. Movimiento

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    transition-duration: .01ms !important;
  }
}
```

- Transiciones de 0,2-0,3 s; las de entrada un poco más lentas que las de salida.
- Anima `transform` y `opacity`; `width`, `height` o `top` provocan reflujo y van a
  tirones.
- Todo lo pulsable necesita estado `:active` visible.

---

## 9. Modo oscuro

Tres estados, no dos: elección explícita clara, elección explícita oscura, y el
sistema (que no marca nada en la raíz).

```css
:root { /* paleta clara completa */ }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { /* solo se redefinen los tokens */ }
}
:root[data-theme="dark"] { /* los mismos tokens otra vez */ }
```

Un color definido **solo** dentro de un bloque de media o de `[data-theme]` no se
aplica en el estado sin marcar: es el fallo clásico de página ilegible. El `body`
siempre pinta su fondo con un token.

---

## 10. Accesibilidad

- Botones de solo icono: `aria-label`.
- Conmutadores: `aria-pressed`. Pestaña activa: `aria-current="page"`.
- Foco visible: `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }`
- Contraste 4,5:1 en texto normal, 3:1 en texto grande y en los bordes de controles.
- El color nunca es la única señal: acompáñalo de texto, icono o forma.
- El orden del DOM sigue al orden visual.

---

## 11. Instalación como app

```html
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Nombre corto">
<link rel="apple-touch-icon" href="icon-180.png">
<meta name="theme-color" content="#RRGGBB">
```

En modo instalado no hay barra de navegador: la app necesita su propia forma de
volver atrás. Y comprueba el arranque en frío, que es cuando se ven los saltos de
maquetación.
