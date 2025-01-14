// Genetic Algorithm!

// size of everything. not really changeable at the moment because all genes go from 0-255.
const size = 256;

// size of mesh.
const n = 24;

let canvases = [...document.querySelectorAll('canvas')];

canvases.forEach(canvas => {
  canvas.width = size;
  canvas.height = size;
});

let bestCanvas = document.querySelector('.best');
let candidates = [...document.querySelectorAll('.candidate')];

let goalData;
let goalLum;

const lum = (data, i) => (.299 + data[i] + .587 * data[i+1] + .114 * data[i+2]) / 255;
const idx = (x, y) => (y * size + x) * 4;

class PackedData {
  constructor(bytes, ...bins) {
    this.bytes = bytes;
    this.masks = [];
    this.shifts = [];
    
    let shift = 0;
    bins.reverse().forEach(bin => {
      this.shifts.push(shift);
      this.masks.push(Math.pow(2, bin) - 1 << shift);
      shift += bin;
    });
  }
  unpack(buffer, offset) {
    let val = 0;
    for (let i = 0; i < this.bytes; i++) {
      val = val * 256 + buffer[i + offset];
    }
    return this.masks.map((m, i) => {
      return (val & m) >> this.shifts[i];
    });
  }
}

const packedPoint = new PackedData(1, 4, 4);
const packedColor = new PackedData(2, 5, 6, 5);

function init() {

  // getting the data from our goal image
  let goal = document.querySelector('.goal');
  let goalCanvas = document.querySelector('.goal-canvas');
  goalCanvas.width = size;
  goalCanvas.height = size;
  let goalContext = goalCanvas.getContext('2d');
  goalContext.drawImage(goal, 0, 0, goal.width, goal.height, 0, 0, size, size);
  let goalData = goalContext.getImageData(0, 0, size, size);
  
  document.querySelector('.filepicker').addEventListener('change', loadImage);
  
  function loadImage() {
    var files = document.querySelector('.filepicker').files;
    if (files.length < 1) return;
    goal.onload = function () {
      goalContext.drawImage(goal, 0, 0, goal.width, goal.height, 0, 0, size, size);
      goalData = goalContext.getImageData(0, 0, size, size);
    };
    goal.src = URL.createObjectURL(files[0]);
  }
  
  loadImage();
    
  // values range from 0-255
  let genes = new Uint8ClampedArray(n * n * 2 + (n + 1) * (n + 1));
  for (let i = 0; i < genes.length; i++) {
    genes[i] = Math.floor(Math.random() * 256);
  }
  
  draw(bestCanvas, genes);
  document.querySelector('.go').addEventListener('click', function (e) {
    start(genes, goalData);
  });
}

function start(genes, goal) {

  let bestScore = score(bestCanvas, goal);
  document.querySelector('.best-score').innerText = bestScore;
  let generationNum = 0;

  function generation() {
    generationNum++;
    
    // best score this generation
    let genBestScore = bestScore;
    // best mutation, if any
    let genBest = null;
    
    candidates.forEach((candidate, i) => {
      let candidateGenes = mutate(genes);
      
      draw(candidate, candidateGenes);
      
      let candidateScore = score(candidate, goal);
      
      if (candidateScore < bestScore) {
        // new best mutation
        genBestScore = candidateScore;
        genBest = candidateGenes;
      }
    });
    
    if (genBest) {
      // replace our "best" genes with winner
      genes = genBest;
      draw(bestCanvas, genes);
      bestScore = genBestScore;
    }
  }
  
  let speed = 0;
  function tick() {
    let start = Date.now();
    
    let count = 0;
    while (Date.now() - start < 50) {
      count++;
      generation();
    }
    speed = speed * .9 + count * .1;
    
    document.querySelector('.best-genes').innerText = printGenes(genes);
    document.querySelector('.generation').innerText = generationNum + ' (' + (Math.round(speed*10)/10) + ')';
    document.querySelector('.best-score').innerText = bestScore;

    // do it again
    setTimeout(tick, 0);
  }
  
  tick();
}

function mutate(genes) {
  let mutated = new Uint8ClampedArray(genes);
  // randomly change some stuff
  for (let i = 0; i < Math.random() * 100; i++) {
    let geneToMutate = Math.floor(Math.random() * mutated.length);
    mutated[geneToMutate] = mutated[geneToMutate] ^ (1 << (Math.random() * 8 | 0));
  }
  return mutated;
}

function score(canvas, goal) {
  let ctx = canvas.getContext('2d');
  let imageData = ctx.getImageData(0, 0, size, size);
  let data = imageData.data;
  let gData = goal.data;
  let score = 0;
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let i = (y * size + x) * 4;
      let dr = (gData[i] - data[i]) / 255;
      let dg = (gData[i+1] - data[i+1]) / 255;
      let db = (gData[i+2] - data[i+2]) / 255;
      let diff = (dr * dr + dg * dg + db * db) / 3;
      score += diff;
    }
  }
  return score;
}

function draw(canvas, genes) {
  let ctx = canvas.getContext('2d');
  let width = canvas.width;
  let height = canvas.height;
  
  // background
  ctx.fillStyle = `#fff`;
  ctx.fillRect(0, 0, width, height);
        
  const point = (u, v) => (v * n + u);
  
  let q = size / n * .9;
  
  for (let v = 0; v < n; v++) {
    for (let u = 0; u < n; u++) {
      let p1 = packedPoint.unpack(genes, point(u, v));
      let p2 = packedPoint.unpack(genes, point(u + 1, v));
      let p3 = packedPoint.unpack(genes, point(u + 1, v + 1));
      let p4 = packedPoint.unpack(genes, point(u, v + 1));

      let c = genes[n * n + (v * n + u) * 2] * 256 + genes[n * n + (v * n + u) * 2 + 1];
      
      let x1 = (u / n * size) + (p1[0] / 15 - .5) * q;
      let y1 = (v / n * size) + (p1[1] / 15 - .5) * q;
      let x2 = ((u + 1) / n * size) + (p2[0] / 15 - .5) * q;
      let y2 = (v / n * size) + (p2[1] / 15 - .5) * q;
      let x3 = ((u + 1) / n * size) + (p3[0] / 15 - .5) * q;
      let y3 = ((v + 1) / n * size) + (p3[1] / 15 - .5) * q;
      let x4 = (u / n * size) + (p4[0] / 15 - .5) * q;
      let y4 = ((v + 1) / n * size) + (p4[1] / 15 - .5) * q;
      
      if (u === 0) {
        x1 = 0;
        x4 = 0;
      }
      if (v === 0) {
        y1 = 0;
        y2 = 0;
      }
      if (u === n - 1) {
        x2 = size;
        x3 = size;
      }
      if (v === n - 1) {
        y3 = size;
        y4 = size;
      }
      
      let r = ((c & 0b1111100000000000) >> 11) / 32 * 255;
      let g = ((c & 0b0000011111100000) >> 5) / 64 * 255;
      let b = (c & 0b0000000000011111) / 32 * 255;
      
      ctx.fillStyle = ctx.strokeStyle = `rgb(${r},${g},${b})`;
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x3, y3);
      ctx.lineTo(x4, y4);
      ctx.stroke();
      ctx.fill();
    }
  }
}

function printGenes(arr) {
  let output = '';
  for (let i = 0; i < arr.length; i++) {
    output += arr[i].toString(16).padStart(2, '0') + ' ';
  }
  return output;
}

window.addEventListener('load', init);