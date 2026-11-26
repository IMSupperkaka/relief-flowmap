uniform sampler2D tMap;
uniform sampler2D tNoise;
uniform float uFalloff;
uniform float uAlpha;
uniform float uDissipation;
uniform float uDeltaMult;
uniform float uAspect;
uniform float uTime;
uniform float uOffset;
uniform vec2 uMouse;
uniform vec2 uVelocity;
uniform vec2 uMouse2;
uniform vec2 uVelocity2;
varying vec2 vUv;

vec4 getStamp(vec2 velocity, vec2 mouse) {
  vec2 cursor = vUv - mouse;
  cursor.x *= uAspect;
  velocity *= 50.0;
  float magnitude = 1.0 - pow(1.0 - min(1.0, length(velocity)), 2.0);
  vec4 stamp = vec4(velocity, magnitude, 1.0);
  float falloff = smoothstep(uFalloff, 0.0, length(cursor)) * uAlpha;
  return stamp * falloff;
}

void main() {
  // 滚动时把上一帧的轨迹随墙面一起平移
  vec2 uv = vUv;
  uv.y += uOffset;
  vec4 data = texture2D(tMap, uv);

  // 与帧率无关的指数衰减
  float friction = (1.0 / uDissipation) - 1.0;
  data *= 1.0 / (1.0 + uDeltaMult * friction);

  // 噪声调制印章强度，浮雕边缘才会不规则
  vec2 noiseUv = vUv * vec2(uAspect, 1.0);
  float noise = smoothstep(0.4, 1.0, texture2D(tNoise, noiseUv * 0.35 + 0.01 * uTime).g);
  float noise2 = 0.15 + 0.85 * smoothstep(0.4, 1.0, texture2D(tNoise, noiseUv * 0.8 + 0.01 * uTime).g);

  data += getStamp(uVelocity, uMouse) * noise2 * uDeltaMult;

  // 自动笔触只写强度到 a 通道，不带速度
  vec4 stamp2 = getStamp(uVelocity2, uMouse2) * 3.0;
  stamp2.a = stamp2.b;
  stamp2.rg *= 0.0;
  data += stamp2 * noise * uDeltaMult;

  data = min(data, vec4(1.0));
  data.rgb = max(data.rgb, vec3(-1.0));
  gl_FragColor = data;
}
