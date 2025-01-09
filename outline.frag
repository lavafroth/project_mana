varying vec2 geom2d;
varying float v_time_norm;
const float PI = 3.1415926535897932384626433832795;
void main() {
    float tangent = geom2d.y / geom2d.x;
    float varying_red = abs(atan(tangent) * 2. / PI) * 0.25;
    if (tangent < 0.0) {
        // we're either in the second or the fourth quadrant
        varying_red = 0.25 - varying_red;
    }

    if (geom2d.y > 0.0 && geom2d.x < 0.0) {
        // second quadrant
        varying_red += 0.25;
    }

    if (geom2d.y < 0.0 && geom2d.x < 0.0) {
        // third quadrant
        varying_red += 0.5;
    }

    if (geom2d.y < 0.0 && geom2d.x > 0.0) {
        // fourth quadrant
        varying_red += 0.75;
    }

    varying_red = fract(varying_red - v_time_norm);

    gl_FragColor = vec4(varying_red, 0.8, 0.4, 1.0);
}

