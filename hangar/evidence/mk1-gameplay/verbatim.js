// ============================================================================
// verbatim.js — BYTE-EXACT transcriptions from src/game.js @ 2baa88b2
// (working tree content-identical to HEAD; verified 2026-10-19)
//
// Every block below sits between machine-checkable markers:
//   // >>> VERBATIM src/game.js:<start>-<end> <name>
//   // <<< END VERBATIM <name>
// tools: scripts/verify-parity.mjs extracts the same ranges from
// src/game.js and diffs them against this file. Receipt: verify-parity.json
// ============================================================================

// >>> VERBATIM src/game.js:376-397 vertexShaderSource
const vertexShaderSource = `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    attribute vec2 aTexCoord;

    uniform mat4 uModel;
    uniform mat4 uView;
    uniform mat4 uProjection;
    uniform vec2 uUvScale;

    varying vec3 vNormal;
    varying vec2 vTexCoord;
    varying float vDepth;

    void main() {
      vec4 worldPosition = uModel * vec4(aPosition, 1.0);
      gl_Position = uProjection * uView * worldPosition;
      vNormal = mat3(uModel) * aNormal;
      vTexCoord = aTexCoord * uUvScale;
      vDepth = clamp((-worldPosition.z - 4.0) / 70.0, 0.0, 1.0);
    }
  `;
// <<< END VERBATIM vertexShaderSource

// >>> VERBATIM src/game.js:399-426 fragmentShaderSource
const fragmentShaderSource = `
    precision mediump float;

    uniform sampler2D uTexture;
    uniform vec4 uColor;
    uniform float uTextureMix;
    uniform float uPulse;
    uniform vec3 uLightDirection;
    uniform float uAmbientLight;
    uniform float uDiffuseStrength;
    uniform float uFogMix;

    varying vec3 vNormal;
    varying vec2 vTexCoord;
    varying float vDepth;

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 lightDirection = normalize(uLightDirection);
      float diffuse = max(dot(normal, lightDirection), 0.0);
      float light = clamp(uAmbientLight + diffuse * uDiffuseStrength, 0.0, 1.35);
      vec4 textureColor = texture2D(uTexture, vTexCoord);
      vec4 base = mix(uColor, uColor * textureColor, uTextureMix);
      vec3 fog = vec3(0.012, 0.016, 0.036);
      vec3 lit = mix(base.rgb * light, fog, min(1.0, vDepth * uFogMix));
      gl_FragColor = vec4(lit + base.rgb * uPulse * 0.24, base.a);
    }
  `;
// <<< END VERBATIM fragmentShaderSource

// >>> VERBATIM src/game.js:1143-1155 normalFor
function normalFor(a, b, c) {
    const ux = b[0] - a[0];
    const uy = b[1] - a[1];
    const uz = b[2] - a[2];
    const vx = c[0] - a[0];
    const vy = c[1] - a[1];
    const vz = c[2] - a[2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    return [nx / len, ny / len, nz / len];
  }
// <<< END VERBATIM normalFor

// >>> VERBATIM src/game.js:1157-1172 createFaceMesh
function createFaceMesh(faces) {
    const vertices = [];
    const indices = [];
    const uvTri = [[0.5, 1], [0, 0], [1, 0]];

    faces.forEach((face) => {
      const offset = vertices.length / 8;
      const normal = normalFor(face[0], face[1], face[2]);
      face.forEach((point, index) => {
        vertices.push(...point, ...normal, ...uvTri[index % 3]);
      });
      indices.push(offset, offset + 1, offset + 2);
    });

    return createMesh(vertices, indices);
  }
// <<< END VERBATIM createFaceMesh

// >>> VERBATIM src/game.js:1086-1102 createMesh
function createMesh(vertices, indices) {
    const vertexBuffer = gl.createBuffer();
    const indexBuffer = gl.createBuffer();
    const stride = 8 * Float32Array.BYTES_PER_ELEMENT;

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    return {
      vertexBuffer,
      indexBuffer,
      indexCount: indices.length,
      stride
    };
  }
// <<< END VERBATIM createMesh

// >>> VERBATIM src/game.js:824-938 Mat4
const Mat4 = {
    create() {
      const out = new Float32Array(16);
      out[0] = 1;
      out[5] = 1;
      out[10] = 1;
      out[15] = 1;
      return out;
    },
    identity(out) {
      out[0] = 1; out[1] = 0; out[2] = 0; out[3] = 0;
      out[4] = 0; out[5] = 1; out[6] = 0; out[7] = 0;
      out[8] = 0; out[9] = 0; out[10] = 1; out[11] = 0;
      out[12] = 0; out[13] = 0; out[14] = 0; out[15] = 1;
      return out;
    },
    perspective(out, fovy, aspect, near, far) {
      const f = 1 / Math.tan(fovy / 2);
      out[0] = f / aspect;
      out[1] = 0;
      out[2] = 0;
      out[3] = 0;
      out[4] = 0;
      out[5] = f;
      out[6] = 0;
      out[7] = 0;
      out[8] = 0;
      out[9] = 0;
      out[10] = (far + near) / (near - far);
      out[11] = -1;
      out[12] = 0;
      out[13] = 0;
      out[14] = (2 * far * near) / (near - far);
      out[15] = 0;
      return out;
    },
    translate(out, a, v) {
      const x = v[0], y = v[1], z = v[2];
      if (a !== out) {
        out[0] = a[0]; out[1] = a[1]; out[2] = a[2]; out[3] = a[3];
        out[4] = a[4]; out[5] = a[5]; out[6] = a[6]; out[7] = a[7];
        out[8] = a[8]; out[9] = a[9]; out[10] = a[10]; out[11] = a[11];
      }
      out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
      out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
      out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
      out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
      return out;
    },
    scale(out, a, v) {
      const x = v[0], y = v[1], z = v[2];
      out[0] = a[0] * x; out[1] = a[1] * x; out[2] = a[2] * x; out[3] = a[3] * x;
      out[4] = a[4] * y; out[5] = a[5] * y; out[6] = a[6] * y; out[7] = a[7] * y;
      out[8] = a[8] * z; out[9] = a[9] * z; out[10] = a[10] * z; out[11] = a[11] * z;
      out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
      return out;
    },
    rotateX(out, a, rad) {
      const s = Math.sin(rad);
      const c = Math.cos(rad);
      const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
      const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
      if (a !== out) {
        out[0] = a[0]; out[1] = a[1]; out[2] = a[2]; out[3] = a[3];
        out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
      }
      out[4] = a10 * c + a20 * s;
      out[5] = a11 * c + a21 * s;
      out[6] = a12 * c + a22 * s;
      out[7] = a13 * c + a23 * s;
      out[8] = a20 * c - a10 * s;
      out[9] = a21 * c - a11 * s;
      out[10] = a22 * c - a12 * s;
      out[11] = a23 * c - a13 * s;
      return out;
    },
    rotateY(out, a, rad) {
      const s = Math.sin(rad);
      const c = Math.cos(rad);
      const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
      const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
      if (a !== out) {
        out[4] = a[4]; out[5] = a[5]; out[6] = a[6]; out[7] = a[7];
        out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
      }
      out[0] = a00 * c - a20 * s;
      out[1] = a01 * c - a21 * s;
      out[2] = a02 * c - a22 * s;
      out[3] = a03 * c - a23 * s;
      out[8] = a00 * s + a20 * c;
      out[9] = a01 * s + a21 * c;
      out[10] = a02 * s + a22 * c;
      out[11] = a03 * s + a23 * c;
      return out;
    },
    rotateZ(out, a, rad) {
      const s = Math.sin(rad);
      const c = Math.cos(rad);
      const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
      const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
      if (a !== out) {
        out[8] = a[8]; out[9] = a[9]; out[10] = a[10]; out[11] = a[11];
        out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
      }
      out[0] = a00 * c + a10 * s;
      out[1] = a01 * c + a11 * s;
      out[2] = a02 * c + a12 * s;
      out[3] = a03 * c + a13 * s;
      out[4] = a10 * c - a00 * s;
      out[5] = a11 * c - a01 * s;
      out[6] = a12 * c - a02 * s;
      out[7] = a13 * c - a03 * s;
      return out;
    }
  };
// <<< END VERBATIM Mat4

// >>> VERBATIM src/game.js:950-958 makeModel
function makeModel(position, rotation, scale) {
    Mat4.identity(modelMatrix);
    Mat4.translate(modelMatrix, modelMatrix, position);
    Mat4.rotateX(modelMatrix, modelMatrix, rotation[0]);
    Mat4.rotateY(modelMatrix, modelMatrix, rotation[1]);
    Mat4.rotateZ(modelMatrix, modelMatrix, rotation[2]);
    Mat4.scale(modelMatrix, modelMatrix, scale);
    return modelMatrix;
  }
// <<< END VERBATIM makeModel

// >>> VERBATIM src/game.js:1211-1225 createShipMesh (face data of the ORIGINAL in-game ship)
function createShipMesh() {
    const nose = [0, 0, -0.9];
    const rearTop = [0, 0.42, 0.62];
    const rearBottom = [0, -0.32, 0.66];
    const rearLeft = [-0.72, -0.08, 0.48];
    const rearRight = [0.72, -0.08, 0.48];
    return createFaceMesh([
      [nose, rearTop, rearRight],
      [nose, rearLeft, rearTop],
      [nose, rearBottom, rearLeft],
      [nose, rearRight, rearBottom],
      [rearTop, rearLeft, rearRight],
      [rearLeft, rearBottom, rearRight]
    ]);
  }
// <<< END VERBATIM createShipMesh

// >>> VERBATIM src/game.js:4540-4549 bindMesh
function bindMesh(mesh) {
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
    gl.vertexAttribPointer(locations.position, 3, gl.FLOAT, false, mesh.stride, 0);
    gl.enableVertexAttribArray(locations.position);
    gl.vertexAttribPointer(locations.normal, 3, gl.FLOAT, false, mesh.stride, 3 * Float32Array.BYTES_PER_ELEMENT);
    gl.enableVertexAttribArray(locations.normal);
    gl.vertexAttribPointer(locations.texCoord, 2, gl.FLOAT, false, mesh.stride, 6 * Float32Array.BYTES_PER_ELEMENT);
    gl.enableVertexAttribArray(locations.texCoord);
  }
// <<< END VERBATIM bindMesh

// >>> VERBATIM src/game.js:4551-4561 drawMesh
function drawMesh(mesh, options) {
    bindMesh(mesh);
    const matrix = makeModel(options.position, options.rotation, options.scale);
    gl.uniformMatrix4fv(locations.model, false, matrix);
    gl.uniform4fv(locations.color, options.color);
    gl.uniform1f(locations.textureMix, options.textureMix ?? 0.65);
    gl.uniform2fv(locations.uvScale, options.uvScale ?? [1, 1]);
    gl.uniform1f(locations.pulse, options.pulse ?? 0);
    gl.bindTexture(gl.TEXTURE_2D, options.texture);
    gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
  }
// <<< END VERBATIM drawMesh

// ---------------------------------------------------------------------------
// Demo-authored (NOT verbatim): crystalTexture — canvas recipe copied from
// src/game.js:960-1002 createTexture("crystal") branch. Excerpt, not a full
// transcription (the full function builds 6 texture kinds; only "crystal"
// is needed here). Wrapper glue differs; pixel recipe identical.
// ---------------------------------------------------------------------------
function createCrystalTexture(gl) {
  const textureSize = 128;
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = textureSize;
  textureCanvas.height = textureSize;
  const ctx = textureCanvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, textureSize, textureSize);
  const half = textureSize / 2;
  const gradient = ctx.createRadialGradient(half, half, 4, half, half, 78);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.28, "#79f7ff");
  gradient.addColorStop(1, "#0f4b82");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, textureSize, textureSize);
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = 2;
  for (let i = -textureSize; i < textureSize * 2; i += 24) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + textureSize, textureSize);
    ctx.stroke();
  }
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureCanvas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return texture;
}

export {
  vertexShaderSource, fragmentShaderSource,
  normalFor, createFaceMesh, createMesh,
  Mat4, makeModel, createShipMesh,
  bindMesh, drawMesh, createCrystalTexture,
};
