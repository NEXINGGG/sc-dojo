import { deflateSync } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const destination = resolve('public/icons');
const assets = [
  ['a1-dojo-192.png', 192],
  ['a1-dojo-512.png', 512],
  ['a1-dojo-maskable-512.png', 512],
  ['a1-dojo-apple-touch-icon.png', 180],
];

await mkdir(destination, { recursive: true });
for (const [filename, size] of assets) {
  await writeFile(resolve(destination, filename), createIcon(size));
}

function createIcon(size) {
  const pixels = new Uint8Array(size * size * 4);
  fill(pixels, size, [37, 99, 235, 255]);

  const center = Math.round(size / 2);
  const stroke = Math.max(5, Math.round(size * 0.05));
  const nodeRadius = Math.max(12, Math.round(size * 0.105));
  const nodes = [
    [Math.round(size * 0.3), Math.round(size * 0.32)],
    [Math.round(size * 0.7), Math.round(size * 0.28)],
    [Math.round(size * 0.72), Math.round(size * 0.7)],
    [Math.round(size * 0.3), Math.round(size * 0.73)],
  ];

  for (const [from, to] of [
    [nodes[0], nodes[1]],
    [nodes[1], nodes[2]],
    [nodes[2], nodes[3]],
    [nodes[3], nodes[0]],
  ]) {
    drawLine(pixels, size, from, to, stroke, [255, 255, 255, 255]);
  }
  drawCircle(pixels, size, center, center, Math.round(size * 0.13), [255, 255, 255, 255]);
  drawTextMark(
    pixels,
    size,
    center,
    center,
    Math.max(3, Math.round(size * 0.025)),
    [37, 99, 235, 255],
  );
  for (const [x, y] of nodes) {
    drawCircle(pixels, size, x, y, nodeRadius, [255, 255, 255, 255]);
    drawCircle(pixels, size, x, y, Math.max(5, Math.round(nodeRadius * 0.32)), [37, 99, 235, 255]);
  }
  return encodePng(size, size, pixels);
}

function fill(pixels, size, color) {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) setPixel(pixels, size, x, y, color);
  }
}

function drawLine(pixels, size, [x1, y1], [x2, y2], thickness, color) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  for (let step = 0; step <= steps; step += 1) {
    const x = Math.round(x1 + ((x2 - x1) * step) / steps);
    const y = Math.round(y1 + ((y2 - y1) * step) / steps);
    drawCircle(pixels, size, x, y, Math.ceil(thickness / 2), color);
  }
}

function drawCircle(pixels, size, centerX, centerY, radius, color) {
  const squared = radius * radius;
  for (let y = centerY - radius; y <= centerY + radius; y += 1) {
    for (let x = centerX - radius; x <= centerX + radius; x += 1) {
      const dx = x - centerX;
      const dy = y - centerY;
      if (dx * dx + dy * dy <= squared) setPixel(pixels, size, x, y, color);
    }
  }
}

function drawTextMark(pixels, size, centerX, centerY, unit, color) {
  // "A1" を図形化した最小のマークです。外部フォントを利用しません。
  const bars = [
    [-5, 4, -2, -4],
    [-2, -4, 1, 4],
    [-4, 0, 0, 0],
    [4, -4, 4, 4],
    [2, -3, 4, -4],
    [2, 4, 6, 4],
  ];
  for (const [fromX, fromY, toX, toY] of bars) {
    drawLine(
      pixels,
      size,
      [centerX + fromX * unit, centerY + fromY * unit],
      [centerX + toX * unit, centerY + toY * unit],
      unit,
      color,
    );
  }
}

function setPixel(pixels, size, x, y, color) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const offset = (y * size + x) * 4;
  pixels.set(color, offset);
}

function encodePng(width, height, pixels) {
  const raw = new Uint8Array(height * (width * 4 + 1));
  for (let y = 0; y < height; y += 1) {
    const offset = y * (width * 4 + 1);
    raw[offset] = 0;
    raw.set(pixels.subarray(y * width * 4, (y + 1) * width * 4), offset + 1);
  }
  const header = new Uint8Array(13);
  writeUint32(header, 0, width);
  writeUint32(header, 4, height);
  header.set([8, 6, 0, 0, 0], 8);
  return concat([
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', new Uint8Array()),
  ]);
}

function chunk(type, data) {
  const body = new Uint8Array(4 + data.length);
  body.set(new TextEncoder().encode(type));
  body.set(data, 4);
  const result = new Uint8Array(12 + data.length);
  writeUint32(result, 0, data.length);
  result.set(body, 4);
  writeUint32(result, 8 + data.length, crc32(body));
  return result;
}

function writeUint32(target, offset, value) {
  target[offset] = (value >>> 24) & 0xff;
  target[offset + 1] = (value >>> 16) & 0xff;
  target[offset + 2] = (value >>> 8) & 0xff;
  target[offset + 3] = value & 0xff;
}

function crc32(data) {
  let value = 0xffffffff;
  for (const byte of data) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit += 1) value = (value >>> 1) ^ ((value & 1) * 0xedb88320);
  }
  return (value ^ 0xffffffff) >>> 0;
}

function concat(parts) {
  const size = parts.reduce((total, part) => total + part.length, 0);
  const result = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}
