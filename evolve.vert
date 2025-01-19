varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vUv = gl_Position.xy / gl_Position.w;
    vUv = (vUv + 1.0) * 0.5;
}
