uniform float uMix;
uniform float uHalf;
uniform float uScale;
uniform float uGridSize;
uniform float uSphereSize;
uniform float uPixelRatio;
uniform vec3 uCenter;
uniform mat4 uSphereMatrix;

attribute vec2 aGrid;
attribute vec3 aColor;
attribute vec3 aSphere;
attribute float aSeed;

varying vec3 vColor;
varying float vAlpha;

void main() {
  float m = clamp(uMix * 1.6 - aSeed * 0.6, 0.0, 1.0);
  m = m * m * (3.0 - 2.0 * m);
  vec3 gridWorld = uCenter + vec3(aGrid * uHalf, 0.45 * uScale);
  vec3 sphereWorld = (uSphereMatrix * vec4(aSphere, 1.0)).xyz;
  vec3 world = mix(gridWorld, sphereWorld, m);
  world += normalize(sphereWorld - uCenter + vec3(0.0001)) * sin(m * 3.14159265) * 0.35 * uScale;
  vColor = aColor;
  vAlpha = 1.0 - smoothstep(0.55, 1.0, m);
  vec4 mvPosition = viewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = mix(uGridSize, uSphereSize, m) * uPixelRatio;
}
