uniform sampler2D uTarget;
uniform float aspectRatio;
uniform vec3 color;
uniform vec2 point;
uniform float radius;
varying vec2 vUv;

void main() {
  vec2 p = vUv - point;
  p.x *= aspectRatio;
  // radius 为 0 时 exp(-x/0) 会得到 NaN，直接跳过
  vec3 splat = radius > 0.0 ? exp(-dot(p, p) / radius) * color : vec3(0.0);
  vec3 base = texture2D(uTarget, vUv).xyz;
  gl_FragColor = vec4(base + splat, 1.0);
}
