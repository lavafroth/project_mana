varying vec2 vUv;
varying vec2 clipMeshCenter;
varying vec2 glPos;

uniform float time;
uniform vec2 viewportSize;

#define LINE_WEIGHT 2.0

uniform sampler2D gbufferMask;

void main() {
   float dx = (1.0 / viewportSize.x) * LINE_WEIGHT;
   float dy = (1.0 / viewportSize.y) * LINE_WEIGHT;

   vec2 uvCenter   = vUv;
   vec2 uvRight    = vec2(uvCenter.x + dx, uvCenter.y);
   vec2 uvLeft    = vec2(uvCenter.x - dx, uvCenter.y);
   vec2 uvTop      = vec2(uvCenter.x,      uvCenter.y - dy);
   vec2 uvTopRight = vec2(uvCenter.x + dx, uvCenter.y - dy);
   vec2 uvDown      = vec2(uvCenter.x,      uvCenter.y + dy);
   vec2 uvDownLeft = vec2(uvCenter.x - dx, uvCenter.y + dy);

   float mCenter   = texture(gbufferMask, uvCenter).r;
   float mTop      = texture(gbufferMask, uvTop).r;
   float mRight    = texture(gbufferMask, uvRight).r;
   float mTopRight = texture(gbufferMask, uvTopRight).r;
   float mLeft    = texture(gbufferMask, uvLeft).r;
   float mDown    = texture(gbufferMask, uvDown).r;
   float mDownLeft = texture(gbufferMask, uvDownLeft).r;

   float dT  = abs(mCenter - mTop);
   float dR  = abs(mCenter - mRight);
   float dTR = abs(mCenter - mTopRight);
   float dD  = abs(mCenter - mDown);
   float dL  = abs(mCenter - mLeft);
   float dDL = abs(mCenter - mDownLeft);

   float delta = 0.0;
   delta = max(delta, dT);
   delta = max(delta, dR);
   delta = max(delta, dTR);
   delta = max(delta, dD);
   delta = max(delta, dL);
   delta = max(delta, dDL);

   float threshold = 0.0;
   float isOutline = clamp((delta * 2.0) - threshold, 0.0, 1.0);

   vec4 outline = vec4(isOutline);
   gl_FragColor = outline;
}
