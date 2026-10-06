uniform vec3 uInk;
uniform vec3 uChart;
uniform vec3 uBurn;
uniform vec3 uKey;

varying float vLight;
varying float vRim;
varying float vHeat;
varying float vFacing;
varying float vSeed;
varying float vRing;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c);
  if (r > 0.5) discard;
  float soft = smoothstep(0.5, 0.08, r);

  vec3 color = mix(uInk, uChart, 0.25 + 0.75 * vLight);
  color = mix(color, uKey, vLight * vLight * 0.45);
  color = mix(color, uChart, vRim * 0.55);
  color = mix(color, mix(uBurn, uKey, vSeed * 0.4), vRing);
  color = mix(color, uBurn, smoothstep(0.05, 0.55, vHeat));

  float depth = smoothstep(-0.7, 0.55, vFacing);
  float alpha = soft * mix(0.18, 0.92, max(depth, vRing * 0.8));
  alpha *= 0.8 + 0.2 * vSeed;
  alpha = max(alpha, soft * clamp(vHeat, 0.0, 1.0));
  gl_FragColor = vec4(color, alpha);
}
