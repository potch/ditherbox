import { dom as _, signal, on, effect, event } from "@potch/minifw/src/fw.js";

import { SaveCanvas } from "./net.js";
import Slider from "./slider.js";
import { signalMap } from "./util.js";
import * as diffusions from "./diffusions.js";

const toValues = (form) => {
  const obj = {};
  for (let element of form.elements) {
    if (element.name) {
      let val;
      if (element.type === "number" || element.type === "range") {
        val = parseFloat(element.value);
      } else if (element.type === "checkbox") {
        val = !!element.checked;
      } else {
        val = element.value;
      }
      obj[element.name] = val;
    }
  }
  return obj;
};

let ditherInput = _(
  "select",
  {
    name: "dither",
  },
  _("option", { value: "bayer" }, "Ordered"),
  ...Object.keys(diffusions).map((value) => _("option", { value }, value))
);

ditherInput.value = "Atkinson";

let zoom = 2;

const saveLink = _(
  "a",
  { class: "save button", download: "dithered.png" },
  "Download dithered image ⬇️"
);

export const save = new SaveCanvas(500);

const WIDTH = 400;
const HEIGHT = 240;

export const settingsForm = _(
  "form",
  {},
  _(
    "details",
    { open: true, class: "form__section" },
    _("summary", {}, _("h2", {}, "Adjust")),
    Slider({
      label: "exposure",
      name: "gamma",
      min: 0.5,
      max: 2.5,
      step: 0.01,
      value: 1,
    }),
    Slider({
      label: "brightness",
      name: "brightness",
      min: -1,
      max: 1,
      step: 0.01,
      value: 0,
      format: (n) => {
        n = parseFloat(n);
        return (n >= 0 ? "+" : "") + Math.round(n * 100) + "%";
      },
    }),
    Slider({
      label: "contrast",
      name: "contrast",
      min: 0,
      max: 2,
      step: 0.01,
      value: 1,
      format: (n) => Math.round(parseFloat(n) * 100) + "%",
    })
  ),
  _(
    "details",
    { class: "form__section" },
    _("summary", {}, _("h2", {}, "Grayscale")),
    _(
      "label",
      { class: "form__row" },
      "use grayscale",
      _("input", {
        name: "grayscale",
        type: "checkbox",
        checked: false,
      })
    ),
    _(
      "label",
      { class: "form__row" },
      "use luminance",
      _("input", {
        name: "luminance",
        type: "checkbox",
        checked: true,
      })
    ),
    Slider({
      label: "red",
      name: "weightRed",
      min: 0,
      max: 2,
      value: 0.299,
      step: 0.01,
    }),
    Slider({
      label: "green",
      name: "weightGreen",
      min: 0,
      max: 2,
      value: 0.587,
      step: 0.01,
    }),
    Slider({
      label: "blue",
      name: "weightBlue",
      min: 0,
      max: 2,
      value: 0.114,
      step: 0.01,
    }),
    _(
      "label",
      { class: "form__row" },
      "normalize",
      _("input", {
        name: "normalize",
        type: "checkbox",
        checked: false,
      })
    )
  ),
  _(
    "details",
    { open: true, class: "form__section" },
    _("summary", {}, _("h2", {}, "Dither")),
    _("label", { class: "form__row" }, "dither", ditherInput),
    _("h3", { class: "form__header" }, "Ordered"),
    Slider({
      label: "size",
      name: "bayerSize",
      min: 1,
      max: 5,
      value: 2,
      step: 1,
      format: (v) => Math.pow(2, parseInt(v)),
    }),
    Slider({
      label: "amount",
      name: "bayerScale",
      min: "0",
      max: "2",
      value: "0",
      step: ".01",
    })
  ),
  _(
    "details",
    { open: true, class: "form__section" },
    _("summary", {}, _("h2", {}, "Output")),
    _(
      "label",
      { class: "form__row" },
      "simulate display",
      _("input", {
        name: "simulate",
        type: "checkbox",
        checked: false,
      })
    ),
    _(
      "label",
      { class: "form__row" },
      "show original",
      _("input", {
        name: "original",
        type: "checkbox",
        checked: false,
      })
    ),
    _(
      "label",
      { class: "form__row" },
      "preserve transparency",
      _("input", {
        name: "transparency",
        type: "checkbox",
        checked: false,
      })
    ),
    Slider({
      label: "zoom",
      name: "zoom",
      min: 0.5,
      max: 4,
      value: 1,
      step: 0.25,
      format: (v) => parseFloat(v) * 100 + "%",
    }),
    _(
      "label",
      { class: "form__row" },
      "width",
      _("input", {
        name: "width",
        type: "number",
        value: WIDTH,
      })
    ),
    _(
      "label",
      { class: "form__row" },
      "auto height",
      _("input", {
        name: "autoHeight",
        type: "checkbox",
        checked: true,
      })
    ),
    _(
      "label",
      { class: "form__row" },
      "height",
      _("input", {
        disabled: true,
        name: "height",
        type: "number",
        value: HEIGHT,
      })
    )
  )
);

export const settingsValues = signal(toValues(settingsForm));
export const settings = signalMap(settingsValues);

on(settingsForm, "submit", (e) => e.preventDefault());
on(settingsForm, "input", () => {
  settingsValues.val = toValues(settingsForm);
});
on(settingsForm, "change", () => {
  settingsValues.val = toValues(settingsForm);
});

effect(() => {
  const elements = settingsForm.elements;
  elements.height.disabled = settings.autoHeight;

  elements.luminance.disabled = !settings.grayscale;
  elements.normalize.disabled = !settings.grayscale && settings.luminance;
  elements.weightRed.disabled = !settings.grayscale && settings.luminance;
  elements.weightGreen.disabled = !settings.grayscale && settings.luminance;
  elements.weightBlue.disabled = !settings.grayscale && settings.luminance;

  elements.bayerSize.disabled = settings.dither !== "bayer";
  elements.bayerScale.disabled = settings.dither !== "bayer";
  if (settings.luminance) {
    elements.weightRed.value = 0.299;
    elements.weightGreen.value = 0.587;
    elements.weightBlue.value = 0.114;
  }
});
