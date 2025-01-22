import { open } from "@tauri-apps/plugin-dialog";
import { appDataDir } from "@tauri-apps/api/path";
import { Menu, Submenu } from "@tauri-apps/api/menu";
import { app as tapp } from "@tauri-apps/api";
import { readFile } from "@tauri-apps/plugin-fs";
import { window as tauriWindow } from "@tauri-apps/api";

import { dom as _, signal, on, effect, event } from "@potch/minifw/src/fw.js";
import { loadImage, pathname, extname, SaveCanvas } from "./net.js";
import { generate as generateBayer } from "./bayer.js";
import { settingsForm, settings } from "./settings.js";
import * as diffusions from "./diffusions.js";

import { filterEvent } from "./util.js";

const createMenu = async (emit) => {
  const submenu = await Submenu.new({
    text: "File",
    items: [
      {
        text: "Open...",
        accelerator: "CmdOrCtrl+O",
        action: () => emit("file-open"),
      },
    ],
  });

  const defaultMenu = await Submenu.new({
    text: "App",
    items: [
      {
        text: "About DitherBox",
        item: {
          About: {
            name: "DitherBox",
          },
        },
      },
      { item: "Separator" },
      { item: "Services" },
      { item: "Separator" },
      { item: "Hide" },
      { item: "HideOthers" },
      { item: "Separator" },
      { item: "Quit" },
    ],
  });

  const menu = await Menu.new({
    items: [defaultMenu, submenu],
  });

  await menu.setAsAppMenu();
};

const mimeLookup = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};
const mimeForExtension = (path) => mimeLookup[path.split(".").at(-1)];

const bayerCache = {};
const getBayer = (size) => {
  if (!bayerCache[size]) {
    bayerCache[size] = generateBayer(size);
  }
  return bayerCache[size];
};

const clamp = (min, max, v) => (v < min ? min : v > max ? max : v);

let GAMMA = 1.5;
const UMAX = 0.436;
const VMAX = 0.615;

const rgb2yuv = (r, g, b) => {
  let y = 0.299 * r + 0.587 * g + 0.114 * b;
  return [gammaIn(y), 0.565 * (b - y), 0.713 * (r - y)];
};
const yuv2rgb = (y, u, v) => {
  y = gammaOut(y);
  return [
    clamp(0, 255, y + 1.403 * v),
    clamp(0, 255, y - 0.344 * u - 0.714 * v),
    clamp(0, 255, y + 1.77 * u),
  ];
};
const rgbDistance = (r, g, b, r2, g2, b2) =>
  Math.hypot(
    gammaIn(r) - gammaIn(r2),
    gammaIn(g) - gammaIn(g2),
    gammaIn(b) - gammaIn(b2)
  );

const gammaIn = (n) => Math.pow(n / 255, GAMMA) * 255;
const gammaOut = (n) => Math.pow(n / 255, 1 / GAMMA) * 255;

const POWERS = Array(9)
  .fill(0)
  .map((_, i) => (1 << i) - 1);

class IndexedColor {
  constructor(colors) {
    this.colors = colors;
  }
  encode(r, g, b) {
    let error = Infinity;
    let componentError = [Infinity, Infinity, Infinity];
    let match = 0;
    for (let n = 0; n < this.colors.length; n++) {
      const color = this.colors[n];
      let dr = r - color[0];
      let dg = g - color[1];
      let db = b - color[2];
      let dl = dr * 0.3 + dg * 0.6 + db * 0.1;
      let e = dr * dr + dg * dg + db * db + dl * dl;
      if (e < error) {
        error = e;
        componentError = [dr, dg, db];
        match = n;
      }
      if (error === 0) {
        return [match, error, componentError];
      }
    }
    return [match, error, componentError];
  }
  decode(n) {
    return this.colors[n];
  }
}

const encoding = new IndexedColor([
  [0, 0, 0],
  [128, 0, 0],
  [0, 128, 0],
  [0, 0, 128],
  [128, 128, 0],
  [0, 128, 128],
  [128, 0, 128],
  [255, 0, 0],
  [0, 255, 0],
  [0, 0, 255],
  [255, 255, 0],
  [0, 255, 255],
  [255, 0, 255],
  [255, 255, 255],
]);

(async (e) => {
  const [menuEmit, onMenu] = event();
  await createMenu(menuEmit);
  const onFileMenu = filterEvent(onMenu, (e) => e === "file-open");

  const app = _("div", { class: "app" });
  document.body.append(app);

  const selectedFile = signal();
  const activeImage = signal();

  effect(() => {
    const currentWindow = tauriWindow.getCurrentWindow();
    console.log(currentWindow, selectedFile.val);
    currentWindow.setTitle(
      selectedFile.val
        ? `${pathname(selectedFile.val)} - DitherBox`
        : "DitherBox"
    );
  });

  onFileMenu(async () => {
    selectedFile.val = await open({
      defaultPath: await appDataDir(),
    });
    console.log(selectedFile.val);
    activeImage.val = await loadImageFromFile(selectedFile.val);
    update();
    draw();
  });

  app.append(_("div", { class: "form" }, settingsForm));

  let canvas = _("canvas", {
    style: {
      imageRendering: "crisp-edges",
    },
  });
  app.append(_("div", { class: "output" }, canvas));

  const ctx = canvas.getContext("2d");
  // ctx.drawImage(activeImage.val, 0, 0, width, height);
  let id; //= ctx.getImageData(0, 0, width, height);
  let out; //= new ImageData(width, height);

  function update() {
    const img = activeImage.val;
    let { width, zoom, autoHeight, height } = settings;

    if (!img) return;
    if (!width || width < 16) return;

    if (autoHeight) {
      height = ((width * img.naturalHeight) / img.naturalWidth) | 0;
    }

    canvas.width = width;
    canvas.height = height;
    canvas.style.width = width * zoom + "px";
    out = new ImageData(width, height);
    ctx.drawImage(img, 0, 0, width, height);
    id = ctx.getImageData(0, 0, width, height);
  }

  async function loadImageFromFile(path) {
    const rawData = await readFile(path);
    const blob = new Blob([rawData], { type: mimeForExtension(path) });
    const i = new Image();
    const url = URL.createObjectURL(blob);
    i.src = url;
    i.style.maxWidth = "100%";
    return new Promise((resolve, reject) => {
      i.onload = () => resolve(i);
      i.onerror = (e) => reject(e);
    });
  }

  function draw() {
    let {
      dither,
      gamma,
      bayerSize,
      bayerScale,
      normalize,
      contrast,
      brightness,
      transparency,
      weightRed,
      weightGreen,
      weightBlue,
      grayscale,
      original,
    } = settings;

    if (!id) return;
    const { width, height } = id;
    let input = new ImageData(width, height);
    input.data.set(id.data);
    ctx.clearRect(0, 0, width, height);

    if (original) {
      ctx.putImageData(input, 0, 0);
      return;
    }

    GAMMA = gamma;
    const algo = encoding;
    const row = width * 4;
    bayerSize = Math.pow(2, bayerSize || 1);
    const bayerTable = getBayer(bayerSize);
    const bayerMax = bayerSize * bayerSize - 1;
    bayerScale = bayerScale * (255 / bayerMax);
    brightness = brightness;
    contrast = contrast;
    const preserveTransparency = !!transparency;

    const weights = {
      r: weightRed,
      g: weightGreen,
      b: weightBlue,
    };
    let totalWeight = 1;
    if (normalize) {
      totalWeight = weights.r + weights.g + weights.b;
    }

    let errorScale, errorDiffusion;
    if (dither !== "bayer") {
      ({ errorScale, errorDiffusion } = diffusions[dither]);
    }
    for (let idx = 0; idx < input.data.length; idx += 4) {
      let ir = clamp(0, 255, input.data[idx]);
      let ig = clamp(0, 255, input.data[idx + 1]);
      let ib = clamp(0, 255, input.data[idx + 2]);
      if (grayscale) {
        let lum =
          (ir * weights.r + ig * weights.g + ib * weights.b) / totalWeight;
        ir = lum;
        ig = lum;
        ib = lum;
      }
      input.data[idx] = gammaOut(
        (gammaIn(ir) - 128) * contrast + 128 + brightness * 255
      );
      input.data[idx + 1] = gammaOut(
        (gammaIn(ig) - 128) * contrast + 128 + brightness * 255
      );
      input.data[idx + 2] = gammaOut(
        (gammaIn(ib) - 128) * contrast + 128 + brightness * 255
      );
    }
    for (let idx = 0; idx < input.data.length; idx += 4) {
      const i = idx / 4;
      const x = i % width;
      const y = (i / width) | 0;
      let pr = input.data[idx];
      let pg = input.data[idx + 1];
      let pb = input.data[idx + 2];
      if (dither === "bayer") {
        const bx = x % bayerSize;
        const by = y % bayerSize;
        const bi = by * bayerSize + bx;
        let bd = (bayerTable[bi] - bayerMax / 2) * bayerScale;
        pr += bd;
        pg += bd;
        pb += bd;
      }
      let [c, error, componentError] = encoding.encode(pr, pg, pb);
      c = encoding.decode(c);
      out.data[idx] = c[0];
      out.data[idx + 1] = c[1];
      out.data[idx + 2] = c[2];
      if (preserveTransparency) {
        out.data[idx + 3] = input.data[idx + 3];
      } else {
        out.data[idx + 3] = 255;
      }
      if (dither !== "bayer") {
        for (let [dx, dy, di] of errorDiffusion) {
          let px = x + dx;
          let py = y + dy;
          let pidx = (px + py * width) * 4;
          if (px >= 0 && px <= width - 1 && py >= 0 && py <= height - 1) {
            input.data[pidx] += componentError[0] * (di / errorScale);
            input.data[pidx + 1] += componentError[1] * (di / errorScale);
            input.data[pidx + 2] += componentError[2] * (di / errorScale);
          }
        }
      }
    }
    ctx.putImageData(out, 0, 0);

    if (settings.simulate) {
      ctx.save();
      ctx.globalCompositeOperation = "lighten";
      ctx.fillStyle = "#323027";
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "darken";
      ctx.fillStyle = "#b4b2ac";
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  }

  effect(() => {
    update();
    draw();
  });
})().catch((e) => console.error(e));
