varying vec2 vUv;
uniform float time;

void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vUv = (gl_Position.xy / gl_Position.w + 1.0) * .5;
}
