# EchoDrive · demo de adaptaciones (La Persona)

Código que acompaña a la memoria de entrega. Implementa, a modo de prototipo funcional, el paso
**"Implementar"** de los tres retos desarrollados y una pestaña de **test de daltonismo**:

| Pestaña | Reto | Qué demuestra |
|---|---|---|
| Reto 1 · Daltonismo | Diseñando para Todos | Simulación de protanopía / deuteranopía / tritanopía, comparación de la paleta del prototipo con la propuesta, codificación redundante (icono + nivel + trazo) y cálculo en vivo de la distancia de color ΔE |
| Reto 4 · Concentración | Multitarea y distracción | Modo concentración: estado parado/en marcha, un solo aviso visible a la vez, cola por prioridad, bloqueo de ajustes en marcha y contador de elementos que compiten por la atención |
| Reto 9 · Feedback multimodal | Que el usuario sepa qué pasó | Patrones visual + sonoro + háptico distintos por tipo de aviso, regla de ≥ 2 canales para avisos críticos, volante con vibración simulada, botón SOS con confirmación por mantenimiento y deshacer, botón «Probar vibración» |
| Test de daltonismo | Comprobación con personas | Test de identificación de avisos: diseño anterior (solo color) frente a propuesto (color + icono + etiqueta); registra aciertos y tiempos y exporta CSV |

## Cómo ejecutarla

No necesita instalación ni servidor: abre `index.html` en un navegador moderno (Chrome, Edge, Firefox, Safari).

## Probarla en un iPhone (gratis, con GitHub Pages)

1. Crea una cuenta en github.com (gratis) y un repositorio **público** nuevo (p. ej. `echodrive-demo`).
   Con cuenta gratuita, GitHub Pages solo publica repositorios públicos.
2. Dentro del repositorio: **Add file → Upload files**. Arrastra el **contenido** de la carpeta
   `EchoDrive_demo` (`index.html`, `styles.css`, `app.js`, `logic.js`, …) para que `index.html` quede en la raíz.
   Pulsa **Commit changes**.
3. **Settings → Pages**. En *Build and deployment*, *Source*: **Deploy from a branch**; *Branch*: `main` y carpeta `/ (root)`. Guarda.
4. Espera 1-2 minutos y recarga. Arriba aparecerá la dirección, del estilo `https://TU-USUARIO.github.io/echodrive-demo/`.
5. En el iPhone abre esa dirección **en Safari**. Opcional: **Compartir → Añadir a pantalla de inicio** para abrirla a pantalla completa.
6. Antes de probar: sube el volumen, quita el **modo silencio** (interruptor lateral) y comprueba en **Ajustes → Sonidos y vibraciones**
   que la respuesta háptica del sistema está activada. Desactiva el modo de bajo consumo por si acaso.
7. Ve a la pestaña **Reto 9** y pulsa **Probar vibración**: deberías notar tres toques seguidos.

### Qué hace la vibración en iPhone
Safari no ofrece `navigator.vibrate`. La demo usa una alternativa: activa un `<input type="checkbox" switch>` oculto, que hace
que el iPhone dé un toque háptico. Es una **aproximación**: un toque por pulso del patrón, no controla la duración y solo
responde a pulsaciones del usuario (en el SOS, el toque del inicio es «mejor esfuerzo»). En Android/Chrome se usa `navigator.vibrate` con el patrón real.
Si no notas nada en el iPhone, la pantalla del volante sigue mostrando el patrón y el resto de canales (visual y sonoro) funcionan.

## Test de daltonismo (pestaña «Test de daltonismo»)

1. Indica un código de participante (sin nombre real) y, si quiere, su visión declarada. Si no hay un participante con daltonismo,
   elige una simulación (protanopía, deuteranopía o tritanopía); es una aproximación y debe constar así en la memoria.
2. Elige el orden (alterna A→B y B→A entre participantes) y los ensayos por nivel (por defecto 3, es decir, 12 por condición).
3. El participante ve la referencia de cada diseño y después avisos con texto neutro («Mensaje del sistema»): debe indicar el nivel.
4. Al terminar aparece una tabla por condición (aciertos, % de acierto, tiempo medio y confusiones) y un CSV por ensayo.
   Cópialo o descárgalo antes de pulsar «Nuevo participante»: los datos no se guardan en ningún servidor.

## Pruebas automáticas

```
node test_logic.js
```

Comprueba con Node (sin dependencias) la lógica de `logic.js`: valores de ΔE de las paletas, gestor de avisos
(prioridad, cola, duplicados, caducidad), reglas de canales y lógica del test (ensayos, resumen y CSV). Son 23 pruebas.

## Estructura

```
index.html      estructura y filtros SVG de simulación de daltonismo
styles.css      estilos (tema oscuro, foco visible, objetivos táctiles >= 44 px)
logic.js        lógica pura: simulación CVD y ΔE, AlertManager, canales y patrones, test
app.js          interfaz: pestañas, renderizado, entrada/salida (audio, vibración, SOS) y test
test_logic.js   pruebas de la lógica
```

## Limitaciones

- Es una demo de interfaz: no hay cámaras, sensores ni funciones ADAS reales; los avisos son simulados.
- La simulación de daltonismo es una aproximación (modelo de Machado et al., 2009, severidad 1,0) y no sustituye
  las pruebas con personas con deficiencia de visión del color.
- La vibración en iPhone es una aproximación (ver arriba) y no se ha podido verificar en un dispositivo iOS durante el desarrollo.
- Umbrales y tiempos (5 km/h, 8 s de enfriamiento, duración de los avisos, 1,5 s de pulsación del SOS) son hipótesis
  de diseño pendientes de validar con usuarios.

## Si la vibración no funciona en el iPhone

En la pestaña **Reto 9** hay un panel «Diagnóstico de vibración (iPhone)»:

1. Toca el **interruptor real** con el dedo. Si no notas nada, el problema no es la página: revisa
   **Ajustes → Sonidos y vibraciones → Hápticos del sistema** (activados), prueba sin modo de bajo consumo y comprueba la versión de iOS.
2. Si el interruptor real sí vibra, prueba **«Toque por código A»** y **«Toque por código B»** y anota cuál funciona.
3. Anota también la línea gris de información (iOS, `navigator.vibrate`, https). Es lo que debe ir en la tabla de la memoria.

Si la página no muestra el panel o la pestaña «Test de daltonismo», se está sirviendo una versión antigua: sube de nuevo todos los archivos
(se reemplazan los existentes) y recarga Safari cerrando la pestaña, o añade `?v=5` al final de la dirección.
