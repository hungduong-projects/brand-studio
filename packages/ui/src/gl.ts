/** Shared WebGL setup for the shader effects: one full-frame triangle and a fragment shader. */
export interface Stage { gl: WebGLRenderingContext; program: WebGLProgram; uniform: (name: string) => WebGLUniformLocation | null }

const vertex = 'attribute vec2 p; varying vec2 uv; void main() { uv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }';

export function createStage(canvas: HTMLCanvasElement, fragment: string): Stage | null {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: false, antialias: false });
  if (!gl) return null;
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
  };
  const vs = compile(gl.VERTEX_SHADER, vertex), fs = compile(gl.FRAGMENT_SHADER, `precision mediump float; varying vec2 uv; ${fragment}`);
  if (!vs || !fs) return null;
  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'p');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  return { gl, program, uniform: name => gl.getUniformLocation(program, name) };
}

/** Matches the canvas buffer to its CSS size, capped at 1.5x density to keep the GPU cool. */
export function fit(canvas: HTMLCanvasElement, gl: WebGLRenderingContext) {
  const scale = Math.min(window.devicePixelRatio || 1, 1.5);
  const width = Math.max(1, Math.round(canvas.clientWidth * scale)), height = Math.max(1, Math.round(canvas.clientHeight * scale));
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; gl.viewport(0, 0, width, height); }
}

let probe: CanvasRenderingContext2D | null = null;
/** Any CSS colour (including oklch or color-mix results) as 0-1 RGB, read back through a 1px canvas. */
export function toRgb(color: string): [number, number, number] {
  probe ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (!probe) return [0, 0, 0];
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = '#000';
  probe.fillStyle = color;
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
  return [r! / 255, g! / 255, b! / 255];
}
