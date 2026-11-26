// 流体彩虹：流体密度 × 遮罩处，用法线方向映射色相，叠在原色上
uniform float uEffectAmplitude;
uniform float uEffectFluidMagnitude;
uniform float uEffectLinesSpeed;
uniform float uEffectLinesScale;
uniform float uEffectLinesStrength;
uniform float uEffectLinesWaveLength;
uniform float uEffectHueShift;
uniform float uEffectColorRange;

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 applyFluidEffect(vec3 color, vec4 fluid, vec2 uv, float time, float mask, vec3 normal) {
  float fluidEdges = smoothstep(0.0, 1.0, fluid.b * uEffectFluidMagnitude);

  vec2 uvLines = uv + time * 0.01 * uEffectLinesSpeed;
  uvLines.x = uvLines.x * 1000.0 / uEffectLinesScale;
  uvLines.y = sin(uvLines.y * 50.0 * uEffectLinesWaveLength) * 20.0 / uEffectLinesScale;
  float lines = smoothstep(-1.0, 0.5, sin(uvLines.x + uvLines.y));
  lines = mix(1.0, lines, uEffectLinesStrength);

  vec3 n = normal;
  n.z *= uEffectColorRange;
  n = normalize(n);
  vec3 hsv = rgb2hsv((n + 1.0) * 0.5);
  hsv.r = fract(hsv.r + uEffectHueShift);
  vec3 effectColor = hsv2rgb(hsv);

  return mix(color, effectColor, mask * fluidEdges * lines * uEffectAmplitude);
}
