uniform sampler2D tFlow;

varying vec2 vUv;
varying vec3 vPos;
varying vec3 vEye;

void main() {
  vec4 full = modelMatrix * vec4(position, 1.0);
  vec4 ndc = projectionMatrix * viewMatrix * full;
  vec2 uvScreen = (ndc.xy / ndc.w + 1.0) * 0.5;
  vec4 flow = texture2D(tFlow, uvScreen);
  float extrude = mix(flow.b, flow.a, 0.5);

  vUv = uv;
  vPos = position;

  // 网格自带完整浮雕形状；静止时只保留 5% 起伏，被鼠标划过的地方才真正鼓出墙面
  vec3 pos = position;
  pos.z *= mix(0.05, 1.0, extrude);
  pos.xy *= 1.004;

  // 与原站一致：彩虹边缘用的是完整浮雕形状的法线，不随挤出变化
  vEye = full.xyz - cameraPosition;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(pos, 1.0);
}
