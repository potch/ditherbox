addEventListener("message", (e) => {
  const { input, settings, diffusion, gamma } = e.data;
  let out = new ImageData(input.width, input.height);
  let grayscale = new Float32Array(input.width * input.height);
  ctx.clearRect(0, 0, width, height);
  const dither = !!dither;
  const GAMMA = parseFloat(gamma);

  const bayerSize = Math.pow(2, parseInt(bayerSize) || 0);
  const bayerTable = getBayer(bayerSize);
  const bayerMax = bayerSize * bayerSize - 1;
  const bayerScale = parseFloat(bayerScale) * (255 / bayerMax);
  const brightness = parseFloat(brightness);
  const contrast = parseFloat(contrast);
  const preserveTransparency = !!settings.transparency;

  const weights = {
    r: parseFloat(weightRed),
    g: parseFloat(weightGreen),
    b: parseFloat(weightBlue),
  };
  let totalWeight = 1;
  if (settings.normalize) {
    totalWeight = weights.r + weights.g + weights.b;
  }

  let errorScale, errorDiffusion;
  if (dither) {
    ({ errorScale, errorDiffusion } = diffusion);
  }
  for (let i = 0; i < grayscale.length; i++) {
    const idx = i * 4;
    let ir = clamp(0, 255, input.data[idx]);
    let ig = clamp(0, 255, input.data[idx + 1]);
    let ib = clamp(0, 255, input.data[idx + 2]);
    let lum = (ir * weights.r + ig * weights.g + ib * weights.b) / totalWeight;
    grayscale[i] = (gammaIn(lum) - 128) * contrast + 128 + brightness * 255;
  }
  for (let i = 0; i < grayscale.length; i++) {
    const idx = i * 4;
    const x = i % width;
    const y = (i / width) | 0;
    let bd =
      (bayerTable[(x % bayerSize) + (y % bayerSize) * bayerSize] -
        bayerMax / 2) *
      bayerScale;
    const lum = grayscale[i] + bd;
    let c = lum > 128 ? 255 : 0;
    out.data[idx] = c;
    out.data[idx + 1] = c;
    out.data[idx + 2] = c;
    if (preserveTransparency) {
      out.data[idx + 3] = input.data[idx + 3];
    } else {
      out.data[idx + 3] = 255;
    }
    if (dither) {
      const err = lum - c;
      for (let [dx, dy, di] of errorDiffusion) {
        let px = x + dx;
        let py = y + dy;
        let pidx = px + py * width;
        if (px >= 0 && px <= width - 1 && py >= 0 && py <= height - 1) {
          grayscale[pidx] += err * (di / errorScale);
        }
      }
    }
  }

  postMessage(out);
});
