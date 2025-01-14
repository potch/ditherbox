export const simple = {
  errorDiffusion: [
    [1, 0, 1],
    [0, 1, 1],
  ],
  errorScale: 2,
};

export const box = {
  errorDiffusion: [
    [1, 0, 1],
    [-1, 1, 1],
    [0, 1, 1],
    [1, 1, 1],
  ],
  errorScale: 4,
};

export const Atkinson = {
  errorDiffusion: [
    [1, 0, 1],
    [2, 0, 1],
    [-1, 1, 1],
    [0, 1, 1],
    [1, 1, 1],
    [0, 2, 1],
  ],
  errorScale: 8,
};

export const Burkes = {
  errorDiffusion: [
    [1, 0, 8],
    [2, 0, 4],
    [-2, 1, 2],
    [-1, 1, 4],
    [0, 1, 8],
    [1, 1, 4],
    [2, 1, 2],
  ],
  errorScale: 32,
};

export const FloydSteinberg = {
  errorDiffusion: [
    [1, 0, 7],
    [-1, 1, 3],
    [0, 1, 5],
    [1, 1, 1],
  ],
  errorScale: 16,
};

export const JarviceJudiceNinke = {
  errorDiffusion: [
    [1, 0, 7],
    [2, 0, 5],
    [-2, 1, 3],
    [-1, 1, 5],
    [0, 1, 7],
    [1, 1, 5],
    [2, 1, 3],
    [-1, 2, 3],
    [0, 2, 5],
    [1, 2, 3],
  ],
  errorScale: 46,
};

export const Pigeon = {
  errorDiffusion: [
    [1, 0, 2],
    [2, 0, 1],
    [-1, 1, 2],
    [0, 1, 2],
    [1, 1, 2],
    [-2, 2, 1],
    [0, 2, 1],
    [2, 2, 1],
  ],
  errorScale: 14,
};

export const Stucki = {
  errorDiffusion: [
    [1, 0, 8],
    [2, 0, 4],
    [-2, 1, 2],
    [-1, 1, 4],
    [0, 1, 8],
    [1, 1, 4],
    [2, 1, 2],
    [-2, 2, 1],
    [-1, 2, 2],
    [0, 2, 4],
    [1, 2, 2],
    [2, 2, 1],
  ],
  errorScale: 42,
};
