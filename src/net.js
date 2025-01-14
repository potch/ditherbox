export const loadImage = (url) =>
  new Promise((resolve, reject) => {
    let i = new Image();
    i.onload = () => {
      resolve(i);
    };
    i.onerror = reject;
    i.crossOrigin = "anonymous";
    i.src = url;
  });

export const loadImageFromFile = (file) =>
  new Promise((resolve) => {
    let i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.src = URL.createObjectURL(file);
  });

export const basename = (path) => {
  let file = path.split("/").pop();
  let parts = file.split(".");
  return parts.slice(0, parts.length - 1).join(".");
};

export const pathname = (path) => path.split("/").pop();

export const extname = (path) => {
  let parts = path.split(".");
  return parts.pop();
};

export class SaveCanvas {
  constructor({ timeout = 1000 } = {}) {
    this.requestTimeout = null;
    this.blob = null;
    this.timeout = timeout;
  }
  requestSave({ canvas, link }) {
    clearTimeout(this.requestTimeout);
    this.requestTimeout = setTimeout((e) => {
      if (this.blob) {
        URL.revokeObjectURL(this.blob, "image/png");
      }
      canvas.toBlob((b) => {
        this.blob = b;
        let url = URL.createObjectURL(b);
        link.href = url;
      });
    }, this.timeout);
  }
}
