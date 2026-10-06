uniform float uMix;
uniform float uHalf;
uniform float uScale;
uniform float uGrowTo;
uniform float uGridSize;
uniform float uSphereSize;
uniform float uPixelRatio;
uniform float uAngle;
uniform float uRound;
uniform float uCorner;
uniform vec3 uCenter;
uniform vec3 uPaper;
uniform vec3 uInk;
uniform vec2 uCameraOffset;
uniform mat4 uSphereMatrix;

attribute vec2 aGrid;
attribute vec3 aColor;
attribute vec3 aSphere;
attribute float aSeed;

varying vec3 vColor;
varying float vAlpha;

void main() {
  float grow = smoothstep(0.12, 0.6, uMix);
  float spread = mix(1.0, uGrowTo, grow);
  float local = clamp(((uMix - 0.45) / 0.55) * 1.5 - aSeed * 0.5, 0.0, 1.0);
  local = local * local * (3.0 - 2.0 * local);

  float c = cos(uAngle);
  float s = sin(uAngle);
  vec2 turned = vec2(aGrid.x * c + aGrid.y * s, -aGrid.x * s + aGrid.y * c);
  vec3 gridWorld = uCenter + vec3(uCameraOffset + turned * uHalf * spread, 0.0);
  vec3 sphereWorld = (uSphereMatrix * vec4(aSphere, 1.0)).xyz;
  vec3 world = mix(gridWorld, sphereWorld, local);
  world += normalize(sphereWorld - uCenter + vec3(0.0001)) * sin(local * 3.14159265) * 0.22 * uScale;

  vec2 q = abs(aGrid) - vec2(1.0 - uCorner);
  float corner = length(max(q, 0.0)) - uCorner;
  float cut = max(uRound * smoothstep(0.98, 1.02, length(aGrid)), step(0.0, corner));
  float outside = cut;
  float radius = length(aGrid);
  vec3 tint = aColor;
  tint = mix(tint, uInk, uRound * (1.0 - smoothstep(0.125, 0.135, radius)));
  tint = mix(tint, uPaper, uRound * (1.0 - smoothstep(0.095, 0.105, radius)));
  vColor = tint;
  vAlpha = (1.0 - smoothstep(0.55, 1.0, local)) * (1.0 - outside * (1.0 - local));
  vec4 mvPosition = viewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = mix(uGridSize * spread, uSphereSize, local) * uPixelRatio;
}
