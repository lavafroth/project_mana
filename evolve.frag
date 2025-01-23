varying vec2 vUv;

uniform sampler2D gbufferMask;
uniform sampler2D initBufferMask;

void main() {
   gl_FragColor = vec4(texture(initBufferMask, vUv));
}
