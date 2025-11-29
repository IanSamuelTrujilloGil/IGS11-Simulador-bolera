# IGS11-Simulador-bolera


## Introducción

Este proyecto es un simulador de una bolera en 3D realizado con Three.js.  
La escena muestra seis  carriles de bolos y una cámara que permite recorrer visualmente la bolera.

Se utiliza un motor de físicas (Ammo.js) para que las bolas se desplacen por el carril, choquen con los bolos y estos caigan. Además, con Tween.js se añaden pequeñas animaciones, como la de entrada al iniciar el programa o la que actualiza la puntuación.


## Trabajo realizado

### Escena y bolera

- Creación de una escena 3D con cámara en perspectiva
- Construcción de la bolera:
  - Suelo principal donde se apoyan todos los carriles
  - Seis carriles paralelos con aspecto de madera
  - Laterales en los carriles para que las bolas no se “salgan” de la pista
- Carga de un modelo 3D de un bolo, que se utilizará para construir la formación de bolos en cada carril

### Simulación física

- Uso de un motor de físicas (Ammo.js) para que:
  - Las bolas avancen por el carril, frenadas poco a poco por la fricción
  - Los bolos reaccionen al impacto de las bolas y se caigan, choquen entre sí y se desplacen por la pista
- Cuando los bolos ya han caído y prácticamente han dejado de moverse, se “estabilizan” para evitar pequeños movimientos

### Simulación del jugador y carriles automáticos

- Se usan varios carriles para jugadores automáticos y uno como carril del jugador
- **Simulación del jugador:**
  - Al pulsar la barra espaciadora, se genera una bola nueva delante de la cámara
  - La dirección del tiro depende de hacia dónde está mirando la cámara, por lo que el jugador puede ajustar ligeramente su posición antes de lanzar
- **Carriles automáticos:**
  - Se lanzan bolas de forma automática cada cierto tiempo
  - Los lanzamientos automáticos tienen ligeras variaciones para que los tiros no sean exactamente iguales
- Cuando se han derribado bolos en un carril, tras un breve tiempo se resetea ese carril y los bolos vuelven a su posición inicial

### Interfaz y efectos visuales

- Marcador de puntuación:
  - Se muestra un pequeño panel de texto con la puntuación de cada carril
  - Cada vez que un bolo cae, se actualiza la puntuación del carril correspondiente
- Animaciones con Tween.js:
  - Animación de entrada de la cámara desde una vista general hasta una vista más cercana al carril principal
  - Efecto de “salto” en el texto del marcador cuando sube la puntuación
  - Pequeño efecto festivo (bolas de colores que aparecen y desaparecen) cuando se derriban todos los bolos de un carril (pleno)
- En pantalla se añade también un texto con la autoría del proyecto:  
  “Autor: Ian Samuel Trujillo Gil”


## Controles

Interacción mediante el ratón:

- **Clic izquierdo + arrastrar**: rotar la cámara alrededor de la escena
- **Rueda del ratón**: acercar o alejar la cámara (zoom)
- **Clic derecho + arrastrar**: desplazar la cámara

Interacción mediante el teclado:

- **Barra espaciadora**: lanzar una bola en la dirección en la que está apuntando la cámara


## Uso de IA

- En esta práctica se ha utilizado una IA para revisar y mejorar la redacción y estructura de este README (formato de secciones, texto más claro, etc) 


## Vídeo

- [Vídeo de la demo del simulador de bolos](Demo%20bolera.mp4) 



## Autor

- Ian Samuel Trujillo Gil

## Recursos gráficos utilizados

- [Modelo 3D del bolo](https://www.turbosquid.com/es/3d-models/free-obj-mode-bowling-pins/1104623), el modelo fue modificado mediante la herramienta Blender para obtener únicamente el modelo de un bolo, eliminando el resto de elementos de la escena


## Enlace al CodeSandbox

- [Enlace al proyecto en CodeSandbox](https://codesandbox.io/p/sandbox/ig2526-s10-forked-c6wx7z)
