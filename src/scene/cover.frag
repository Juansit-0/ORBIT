uniform float uOpacity;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c);
  if (r > 0.5) discard;
  float soft = smoothstep(0.5, 0.25, r);
  gl_FragColor = vec4(vColor, soft * vAlpha * uOpacity);
}
