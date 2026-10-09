// Mountains and cypress, etc.
const MOUNTAIN_PALETTES = [
  // Distant hills: lighter blue
  [
    [35, 65, 112],
    [45, 79, 128],
    [59, 96, 146],
    [79, 117, 160]
  ],

  // Foreground hills: darker blue
  [
    [12, 29, 64],
    [20, 42, 82],
    [29, 55, 100],
    [43, 75, 119]
  ]
];

// Deterministic ridge based on Perlin Noise
function mountainRidgeY(x, layer) {
  const t = x / width;

  const distant = layer === 0;
  const baseY = height * (distant ? 0.69 : 0.82);

  const broadWave = sin(
    t * TWO_PI * (distant ? 1.3 : 1.0) +
    (distant ? 0.5 : 2.0)
  ) * height * 0.028;

  const terrainNoise =
    (noise(x * 0.007, 47 + layer * 37) - 0.5) *
    height * 0.095;

  const fineNoise =
    (noise(x * 0.022, 90 + layer * 31) - 0.5) *
    height * 0.012;

  return baseY + broadWave + terrainNoise + fineNoise;
}

// Paint mountains entirely with brushstrokes
function paintBrushMountains(g) {
  for (let layer = 0; layer < 2; layer++) {
    const palette = MOUNTAIN_PALETTES[layer];
    const spacing = 8;

    const startY = height * (
      layer === 0 ? 0.55 : 0.70
    );

    // Dense painted mountain surface
    for (let y = startY; y < height + 12; y += spacing) {
      for (let x = -12; x < width + 12; x += spacing) {
        const px = x + random(-3, 3);
        const py = y + random(-3, 3);

        const ridge = mountainRidgeY(px, layer);

        // Stay inside the mountain region
        if (py < ridge - 4) continue;

        const depth = constrain(
          (py - ridge + 4) / 20, 0, 1
        );

        // Follow the local slope
        const slope =
          mountainRidgeY(px + 9, layer) -
          mountainRidgeY(px - 9, layer);

        const angle =
          atan2(slope, 18) +
          (noise(px * 0.02, py * 0.02, 18 + layer) - 0.5) * 0.55;

        const n = noise(
          px * 0.013,
          py * 0.015,
          31 + layer * 12
        );

        const colourIndex = constrain(
          floor(n * palette.length),
          0,
          palette.length - 1
        );

        const colour = palette[colourIndex];

        // Softer at the ridge, denser inside
        const alpha = lerp(80, 245, depth);

        paintV2Stroke(
          g,
          px,
          py,
          angle,
          random(13, 24),
          random(6, 10),
          colour,
          alpha
        );
      }
    }

    // Fine directional texture
    for (let i = 0; i < 650; i++) {
      const x = random(width);
      const y = random(startY, height);

      const ridge = mountainRidgeY(x, layer);

      if (y < ridge + 5) continue;

      const slope =
        mountainRidgeY(x + 8, layer) -
        mountainRidgeY(x - 8, layer);

      const angle =
        atan2(slope, 16) + random(-0.25, 0.25);

      paintV2Stroke(
        g,
        x,
        y,
        angle,
        random(8, 18),
        random(1.3, 3),
        random(palette),
        random(75, 150)
      );
    }
  }
}

// How strongly should the mountains move?
function getMountainFlowWeight(x, y) {
  let weight = 1.0;

  const farRidge = mountainRidgeY(x, 0);
  const nearRidge = mountainRidgeY(x, 1);

  function smoothTransition(distance) {
    const t = constrain((distance + 8) / 28, 0, 1);
    return t * t * (3 - 2 * t);
  }

  const farBlend = smoothTransition(y - farRidge);
  weight = lerp(weight, 0.18, farBlend);

  const nearBlend = smoothTransition(y - nearRidge);
  weight = lerp(weight, 0.05, nearBlend);

  return weight;
}
