uniform vec2 uResolution;
uniform float uTime;
uniform sampler2D tFlow;
uniform sampler2D tFluid;
uniform sampler2D tBake1;
uniform sampler2D tBake2;
uniform sampler2D tPlaster;
uniform float uTextureStrength;
uniform float uGradientStrength;
uniform float uBrightnessFactor;
uniform float uBrightnessOffset;
uniform float uFresnelSharpness;
uniform float uFresnelOpacity;
uniform vec2 uShadowRange;
uniform float uShadowOpacity;

varying vec2 vUv;
varying vec3 vPos;
varying vec3 vEye;

#define WALL 0.54504

void main() {
  vec2 uvScreen = gl_FragCoord.xy / uResolution;
  vec4 flow = texture2D(tFlow, uvScreen) * 2.0;
  float extrude = mix(flow.b, flow.a, 0.5);

  // 按挤出量在 6 级预烘焙光照之间逐级插值
  vec3 bake1 = texture2D(tBake1, vUv).rgb;
  vec3 bake2 = texture2D(tBake2, vUv).rgb;
  float o = WALL;
  o = mix(o, bake2.g, smoothstep(0.0, 0.2, extrude));
  o = mix(o, bake2.r, smoothstep(0.2, 0.4, extrude));
  o = mix(o, bake1.b, smoothstep(0.4, 0.6, extrude));
  o = mix(o, bake1.g, smoothstep(0.6, 0.8, extrude));
  o = mix(o, bake1.r, smoothstep(0.8, 1.0, extrude));
  vec3 color = vec3(o);

  float plaster = texture2D(tPlaster, vPos.xy / 10.0).g;
  color = mix(color, color * plaster, uTextureStrength);
  float gradient = mix(1.0, 0.5, length(uvScreen - vec2(0.0, 0.8)));
  color += gradient * 0.7 * uGradientStrength;
  color = color * uBrightnessFactor + uBrightnessOffset;

  // 屏幕空间导数求真实几何法线：浮雕鼓起的斜面才会出现彩色
  vec3 normal = normalize(cross(dFdx(vEye), dFdy(vEye)));
  float fresnel = abs(dot(normal, vec3(0.0, 0.0, 1.0)));
  float inverseFresnel = 1.0 - pow(1.0 - fresnel, uFresnelSharpness);
  float waveMask = max(
    smoothstep(1.0, 0.1, mix(inverseFresnel, 1.0, 1.0 - uFresnelOpacity)),
    smoothstep(uShadowRange.y, uShadowRange.x, bake1.r) * uShadowOpacity
  );

  vec4 fluid = texture2D(tFluid, uvScreen);
  color = applyFluidEffect(color, fluid, vUv, uTime, waveMask, normal);

  gl_FragColor = vec4(color, 1.0);
}
