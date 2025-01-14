import { dom, signal } from "@potch/minifw/src/fw.js";

const noop = (v) => v;

let sliderId = 0;

export default function Slider({
  name,
  label = name,
  min = 0,
  max = 100,
  step = 1,
  value = 0,
  id,
  format = noop,
  classes = [],
}) {
  if (!id) {
    id = "slider" + sliderId;
  }
  sliderId++;

  const input = signal();
  const val = signal();

  const el = dom(
    "div",
    { class: "form__row slider " + classes.join(" ") },
    dom("label", { class: "slider__label", for: id }, label),
    dom("input", {
      ref: input,
      class: "slider__input",
      type: "range",
      id,
      name,
      min,
      max,
      step,
      value,
    }),
    dom("input", {
      type: "text",
      ref: val,
      class: "slider__value",
      value: format(value),
    })
  );

  const updateVal = () => {
    val.val.value = format(input.val.value);
    const event = new Event("change", { bubbles: true });
    el.dispatchEvent(event);
  };

  val.val.addEventListener("keydown", (e) => {
    const i = input.val;
    const val = parseFloat(i.value);
    const step = parseFloat(i.step);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      i.value = val - step;
      updateVal();
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      i.value = val + step;
      updateVal();
    }
  });

  input.val.addEventListener("input", updateVal);
  input.val.addEventListener("change", updateVal);

  el.input = input.val;

  return el;
}
