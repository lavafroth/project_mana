uniform float u_time;
uniform vec3 mesh_center;

varying float v_time_norm;
varying vec2 geom2d;
void main() {
    vec4 geom4d = projectionMatrix * modelViewMatrix * vec4(mesh_center, 1.0);
    vec4 clipPos = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

    vec4 delta4d = clipPos - geom4d;
    geom2d = delta4d.xy;

    v_time_norm = fract(u_time / 5.0);
    gl_Position = clipPos;
}

