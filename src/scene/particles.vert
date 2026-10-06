uniform float uTime;
uniform float uPulse;
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uBeat;
uniform float uEnergy;
uniform float uShock;
uniform float uIntro;
uniform vec4 uClick;
uniform float uPixelRatio;
uniform float uSize;
uniform float uScale;
uniform vec4 uTrail[TRAIL_LENGTH];
uniform vec3 uKeyDir;
uniform vec3 uPalette[5];

attribute vec4 aSeed;
attribute float aRing;

varying float vLight;
varying float vRim;
varying float vHeat;
varying float vFacing;
varying float vSeed;
varying float vRing;
varying float vSpark;
varying vec3 vPalette;

void main() {
  vec3 n = normalize(position);
  float t = uTime * 0.12;
  float wobble = snoise(n * 1.7 + vec3(t, t * 0.7, -t * 0.4));
  float drift = snoise(position * 0.9 + vec3(-t * 0.6, t * 0.3, t));
  float shell = 1.0 + (aSeed.y - 0.5) * mix(0.09, 0.03, aRing);
  float breath = uBass * (0.065 + 0.04 * aSeed.x) * (1.0 - aRing * 0.55);
  float amplitude = mix(0.035 + 0.03 * uEnergy + uMid * 0.06, 0.018, aRing);
  float waves = sin(n.y * 7.0 + n.x * 3.0 - uTime * (1.5 + uMid * 2.5)) * uMid * 0.03 * (1.0 - aRing);
  float spark = step(0.86, aSeed.w) * uTreble * (1.0 - aRing);
  float sparkLift = spark * (0.07 + 0.16 * (aSeed.w - 0.86) / 0.14);
  float ringShake = aRing * uBeat * 0.035 * sin(aSeed.x * 40.0 + uTime * 30.0);
  float local = clamp(uShock * 1.7 - aSeed.x * 0.7, 0.0, 1.0);
  float shock = sin(local * 3.14159265) * 0.16 * (1.0 - uShock);
  vec3 p = position * (shell + wobble * amplitude + breath + shock + waves + sparkLift + ringShake);
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
    world.xyz += normalize(away + vec3(0.0001)) * influence * 0.26 * uScale;
    heat = max(heat, influence);
  }

  if (uClick.w < 1.0) {
    float distanceToClick = length(world.xyz - uClick.xyz) / uScale;
    float front = uClick.w * 3.4;
    float band = exp(-pow(distanceToClick - front, 2.0) / 0.05) * (1.0 - uClick.w);
    world.xyz += normalize(world.xyz - center + vec3(0.0001)) * band * 0.3 * uScale;
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
  vSpark = spark;
  int swatch = int(floor(fract(aSeed.z * 7.13 + aSeed.w * 3.7) * 4.999));
  vec3 picked = uPalette[0];
  if (swatch == 1) picked = uPalette[1];
  else if (swatch == 2) picked = uPalette[2];
  else if (swatch == 3) picked = uPalette[3];
  else if (swatch == 4) picked = uPalette[4];
  vPalette = picked;

  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  float size = uSize * (0.5 + aSeed.z * 0.95) * (1.0 + heat * 0.9 + uBass * 0.22 + spark * 1.1);
  gl_PointSize = size * uPixelRatio * uScale * (8.0 / -mvPosition.z) * mix(1.0, 0.6, 1.0 - arrival);
}
