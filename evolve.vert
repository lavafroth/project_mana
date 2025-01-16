varying vec2 vUv;
uniform vec3 meshCenter;
varying vec2 clipMeshCenter;
uniform int window;
varying vec2 glPos;

void main() {
    clipMeshCenter = (projectionMatrix * modelViewMatrix * vec4(meshCenter, 1.0)).xy;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vUv = gl_Position.xy / gl_Position.w;
    vUv = (vUv + 1.0) * 0.5;
    glPos = gl_Position.xy;
}
