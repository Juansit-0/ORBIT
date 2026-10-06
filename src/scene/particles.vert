uniform float uTime;
uniform float uPulse;
uniform float uEnergy;
uniform float uShock;
uniform float uIntro;
uniform vec4 uClick;
uniform float uPixelRatio;
uniform float uSize;
uniform float uScale;
uniform vec4 uTrail[TRAIL_LENGTH];
uniform vec3 uKeyDir;

attribute vec4 aSeed;
attribute float aRing;

varying float vLight;
varying float vRim;
varying float vHeat;
varying float vFacing;
varying float vSeed;
varying float vRing;

void main() {
  vec3 n = normalize(position);
  float t = uTime * 0.18;
  float wobble = snoise(n * 1.7 + vec3(t, t * 0.7, -t * 0.4));
  float drift = snoise(position * 0.9 + vec3(-t * 0.6, t * 0.3, t));
  float shell = 1.0 + (aSeed.y - 0.5) * mix(0.09, 0.03, aRing);
  float breath = uEnergy * uPulse * (0.07 + 0.06 * aSeed.x) * (1.0 - aRing * 0.6);
  float amplitude = mix(0.05 + 0.05 * uEnergy, 0.025, aRing);
  float local = clamp(uShock * 1.7 - aSeed.x * 0.7, 0.0, 1.0);
  float shock = sin(local * 3.14159265) * 0.24 * (1.0 - uShock);
  vec3 p = position * (shell + wobble * amplitude + breath + shock);
  p += vec3(drift) * 0.012 * aRing;

  float arrival = clamp((uIntro - aSeed.x * 0.35) / 0.65, 0.0, 1.0);
  arrival = 1.0 - pow(1.0 - arrival, 4.0);
  vec3 scatter = normalize(position + (aSeed.xyz - 0.5) * 1.6) * (5.0 + aSeed.w * 9.0);
  p = mix(scatter, p, arrival);

  vec4 world = modelMatrix * vec4(p, 1.0);
  vec3 center = modelMatrix[3].xyz;
  float heat = 0.0;
  float reach = 0.4 * uScale;
  for (int i = 0; i < TRAIL_LENGTH; i++) {
    vec4 trail = uTrail[i];
    if (trail.w <= 0.002) continue;
    vec3 away = world.xyz - trail.xyz;
    float influence = exp(-dot(away, away) / (reach * reach)) * trail.w;
    world.xyz += normalize(away + vec3(0.0001)) * influence * 0.38 * uScale;
    heat = max(heat, influence);
  }

  if (uClick.w < 1.0) {
    float distanceToClick = length(world.xyz - uClick.xyz) / uScale;
    float front = uClick.w * 3.4;
    float band = exp(-pow(distanceToClick - front, 2.0) / 0.05) * (1.0 - uClick.w);
    world.xyz += normalize(world.xyz - center + vec3(0.0001)) * band * 0.42 * uScale;
    heat = max(heat, band * 0.9);
  }

  vec3 worldNormal = normalize(mat3(modelMatrix) * n);
  vec3 viewDir = normalize(cameraPosition - world.xyz);
  vLight = max(dot(worldNormal, normalize(uKeyDir)), 0.0);
  vRim = pow(1.0 - max(dot(worldNormal, viewDir), 0.0), 2.4);
  vFacing = dot(worldNormal, viewDir);
  vHeat = heat;
  vSeed = aSeed.w;
  vRing = aRing;

  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  float size = uSize * (0.5 + aSeed.z * 0.95) * (1.0 + heat * 1.1 + uPulse * uEnergy * 0.3);
  gl_PointSize = size * uPixelRatio * uScale * (8.0 / -mvPosition.z) * mix(1.0, 0.6, 1.0 - arrival);
}
