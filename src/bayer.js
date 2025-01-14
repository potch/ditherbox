// bayer.lua v1.0
// by Potch
// MIT License

// hard-code smallest bayer
export const bayer2 = [0x0, 0x2, 0x3, 0x1];

// t should be a 64 entry table indexed at 0
export function toBytes(t) {
  let o = {};
  for (let i = 0; i < 8; i++) {
    let v = 0x0;
    for (let j = 0; j < 8; j++) {
      v = v * 0x2 + t[i * 0x8 + j];
    }
    o[i + 1] = v;
  }
  return o;
}

// helper to treat 0-indexed tables as 2d arrays
export function at(b, x, y, width) {
  return b[y * width + x];
}

// naive recursive bayer filter generator. size should be a power of 2.
export function generate(size) {
  if (size < 2) throw new Error("invalid bayer size: " + size);
  if (size == 2) {
    return bayer2;
  }

  let length = size * size;
  let prevSize = size / 2;
  let prev;

  if (prevSize == 2) {
    prev = bayer2;
  } else {
    prev = generate(prevSize);
  }

  let b = Array(length);
  for (let i = 0; i < length; i++) {
    let x = i % size;
    let y = Math.floor(i / size);
    b[i] =
      at(prev, x % prevSize, y % prevSize, prevSize) * 0x4 +
      at(bayer2, Math.floor(x / prevSize), Math.floor(y / prevSize), 2);
  }

  return b;
}

// takes every value in a table b and converts it to a 0 or 1 byte based on the threshold t
export function threshold(b, t) {
  let o = [];
  for (let [key, value] of Object.entries(b)) {
    if (value >= t) {
      o[key] = 0x1;
    } else {
      o[key] = 0x0;
    }
  }
  return o;
}
