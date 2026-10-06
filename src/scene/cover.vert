uniform float uMix;
uniform float uHalf;
uniform float uScale;
uniform float uGridSize;
uniform float uSphereSize;
uniform float uPixelRatio;
uniform float uAngle;
uniform float uRound;
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
  float c = cos(uAngle);
  float s = sin(uAngle);
  vec2 turned = vec2(aGrid.x * c + aGrid.y * s, -aGrid.x * s + aGrid.y * c);
  vec3 gridWorld = uCenter + vec3(turned * uHalf, 0.45 * uScale);
  vec3 sphereWorld = (uSphereMatrix * vec4(aSphere, 1.0)).xyz;
  vec3 world = mix(gridWorld, sphereWorld, m);
  world += normalize(sphereWorld - uCenter + vec3(0.0001)) * sin(m * 3.14159265) * 0.35 * uScale;
  vColor = aColor;
  float outside = uRound * smoothstep(0.97, 1.03, length(aGrid));
  vAlpha = (1.0 - smoothstep(0.55, 1.0, m)) * (1.0 - outside * (1.0 - m));
  vec4 mvPosition = viewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = mix(uGridSize, uSphereSize, m) * uPixelRatio;
}
