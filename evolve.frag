varying vec2 vUv;
varying vec2 clipMeshCenter;
varying vec2 glPos;

uniform float time;
uniform vec2 viewportSize;


uniform sampler2D gbufferMask;
uniform sampler2D initBufferMask;

void main() {
   float dx = (1.0 / viewportSize.x);
   float dy = (1.0 / viewportSize.y);

   float isOutline = texture(gbufferMask, vUv).r;
   float neighbor = 0.;

   vec2 uvCenter   = vUv;
   vec2 uvTop      = vec2(uvCenter.x,      uvCenter.y - dy);
   vec2 uvRight    = vec2(uvCenter.x + dx, uvCenter.y);
   vec2 uvDown      = vec2(uvCenter.x,      uvCenter.y + dy);
   vec2 uvLeft    = vec2(uvCenter.x - dx, uvCenter.y);
   vec2 uvTopRight = vec2(uvCenter.x + dx, uvCenter.y - dy);
   vec2 uvDownLeft = vec2(uvCenter.x - dx, uvCenter.y + dy);
   vec2 uvTopLeft = vec2(uvCenter.x - dx, uvCenter.y - dy);
   vec2 uvDownRight = vec2(uvCenter.x + dx, uvCenter.y + dy);

   neighbor += texture(initBufferMask, uvCenter).r;
   neighbor += texture(initBufferMask, uvTop).r;
   neighbor += texture(initBufferMask, uvRight).r;
   neighbor += texture(initBufferMask, uvDown).r;
   neighbor += texture(initBufferMask, uvLeft).r;
   neighbor += texture(initBufferMask, uvTopRight).r;
   neighbor += texture(initBufferMask, uvDownLeft).r;
   neighbor += texture(initBufferMask, uvTopLeft).r;
   neighbor += texture(initBufferMask, uvDownRight).r;
   float evolve = clamp(isOutline * neighbor, 0.0, 1.);
   gl_FragColor = vec4(evolve);
}
