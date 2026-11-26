// 浮雕分块背后的整面墙（原站的背景层）：分块没覆盖到的地方由它补齐。
// 石膏纹理按屏幕 uv 平铺、不随滚动移动，与原站一致。
#define WALL 0.54504
#define PI 3.141592653589793

uniform sampler2D tPlaster;
uniform float uTextureStrength;
uniform float uGradientStrength;
varying vec2 vUv;

float rand(vec2 uv) {
  float dt = dot(uv, vec2(12.9898, 78.233));
  return fract(sin(mod(dt, PI)) * 43758.5453);
}

void main() {
  vec3 color = vec3(WALL);
  float plaster = texture2D(tPlaster, vUv).g;
  color = mix(color, color * plaster, uTextureStrength);
  // 随机抖动渐变坐标，避免出现色带
  vec2 uv = vUv + rand(vUv) * 0.01;
  float gradient = mix(1.0, 0.5, length(uv - vec2(0.0, 0.8)));
  color += gradient * 0.7 * uGradientStrength;
  color = color * 0.6 + 0.4;
  gl_FragColor = vec4(color, 1.0);
}
