import { vec3, mat4 } from 'gl-matrix';

const SEMANTIC_ATTRIBUTE_TABLE = {
  POSITION: 'aPosition',
  NORMAL: 'aNormal',
  TEXCOORD: 'aTexCoord',
  TANGENT: 'aTangent',
  COLOR: 'aColor'
};

const MATERIAL_FIELDS = ['emission', 'ambient', 'diffuse', 'specular',
  'reflective', 'transparent'];

function arrayToObject(array, callback) {
  let result = {};
  array.forEach((v, i) => {
    result[v.id || v.name || i] = callback(v);
  });
  return result;
}

export default {
  document(data) {
    let result = {};
    this.flipAxis = data.asset.upAxis !== 'Y_UP';
    result.geometries = arrayToObject(data.geometries || [],
      this.process.bind(this, 'geometry'));
    result.materials = arrayToObject(data.materials || [],
      this.process.bind(this, 'material'));
    result.cameras = arrayToObject(data.cameras || [],
      this.process.bind(this, 'camera'));
    result.lights = arrayToObject(data.lights || [],
      this.process.bind(this, 'light'));
    result.controllers = arrayToObject(data.controllers || [],
      this.process.bind(this, 'controller'));
    result.scene = this.resolve('visualScene', data.scene.visualScene);
    console.log(result);
    return result;
  },
  node(data, parent) {
    let result = {};
    if (parent != null) result.parent = parent;
    if (data.children != null) {
      result.children = data.children.map(v => this.process('node', v, result));
    }
    result.type = data.type;
    result.id = data.id;
    result.name = data.name;
    if (data.cameras != null) {
      result.cameras = data.cameras.map(v => this.process('binding', v));
    }
    if (data.lights != null) {
      result.lights = data.lights.map(v => this.process('binding', v));
    }
    if (data.geometries != null) {
      result.geometries = data.geometries.map(
        v => this.process('bindingGeom', v));
    }
    if (data.controllers != null) {
      result.controllers = data.controllers.map(
        v => this.process('bindingController', v));
    }
    result.matrix = mat4.clone(data.matrix);
    if (this.flipAxis) {
      mat4.multiply(result.matrix, [
        1, 0, 0, 0,
        0, 0, -1, 0,
        0, 1, 0, 0,
        0, 0, 0, 1
      ], result.matrix);
    }
    return result;
  },
  visualScene(data) {
    return data.children.map(v => this.process('node', v));
  },
  binding(data) {
    return data.url.slice(1);
  },
  bindingGeom(data) {
    let result = {};
    result.url = data.url.slice(1);
    // Map materials
    result.materials = {};
    for (let key in data.materials) {
      result.materials[key] = data.materials[key].target.slice(1);
    }
    return result;
  },
  bindingController(data) {
    let result = {};
    result.url = data.url.slice(1);
    // Map materials
    result.materials = {};
    for (let key in data.materials) {
      result.materials[key] = data.materials[key].target.slice(1);
    }
    // Map root node
    result.skeleton = this.resolve('node', data.skeleton);
    return result;
  },
  controller(data) {
    let result = {};
    let sourceList = this.resolve('geometry', data.source);

    // Build vertex weights table first.
    const { weights } = data;

    let weightInput, indexInput;
    let weightOffset, indexOffset;
    let stride = weights.input.length;

    weights.input.forEach(channel => {
      let offset = channel.offset;
      let { source } = this.resolve('source', channel.source);
      if (channel.semantic === 'JOINT') {
        indexOffset = offset;
        indexInput = source;
      } else if (channel.semantic == 'WEIGHT') {
        weightOffset = offset;
        weightInput = source;
      }
    });
    let offset = 0;
    let skinIndices = new Int16Array(weights.vcount.length * 4);
    let skinWeights = new Float32Array(weights.vcount.length * 4);
    for (let i = 0; i < weights.vcount.length; ++i) {
      let count = weights.vcount[i];
      // Read all offsets and push them to indices.
      let vertexData = [];
      for (let j = 0; j < count; ++j) {
        vertexData.push({
          indices: weights.v[offset * stride + indexOffset],
          weights: weightInput[weights.v[offset * stride + weightOffset]]
        });
        offset ++;
      }
      // Then, sort the arrays using offsets
      vertexData.sort((a, b) => b.weights - a.weights);
      // Create dummy entries if required.
      for (let j = vertexData.length; j < 4; ++j) {
        vertexData.push({ indices: 65535, weights: 0 });
      }
      let weightSum = 0;
      // Count total sum of weights.
      for (let j = 0; j < 4; ++j) {
        weightSum += vertexData[j].weights;
      }
      // Push the output into TypedArray data.
      for (let j = 0; j < 4; ++j) {
        skinIndices[i * 4 + j] = vertexData[j].indices;
        skinWeights[i * 4 + j] = vertexData[j].weights / weightSum;
      }
    }

    // Steal aPosition's indices array. Since aPosition is specified in
    // 'vertex' section of COLLADA document, it must have correct vertex
    // indices. We've already built skin weights / indices with vertex ID at
    // this point - so we can simply copy aPosition's indices array.

    // However, we need to recalculate aPosition because we need to multiply
    // them with bind shape matrix.
    // Since COLLADA uses row-major order, we need to convert them to
    // column-major order.
    let bindShape = mat4.create();
    mat4.transpose(bindShape, data.bindShape);
    let newGeom = sourceList.map(source => Object.assign({}, source, {
      attributes: Object.assign({}, source.attributes, {
        aPosition: ((source) => {
          let output = new Float32Array(source.data.length);
          for (let offset = 0; offset < output.length; offset += source.axis) {
            let point = source.data.subarray(offset, offset + 3);
            let outPoint = output.subarray(offset, offset + 3);
            vec3.transformMat4(outPoint, point, bindShape);
          }
          return { data: output, axis: source.axis };
        })(source.attributes.aPosition),
        aSkinIndices: { data: skinIndices, axis: 4 },
        aSkinWeights: { data: skinWeights, axis: 4 }
      }),
      indices: Object.assign({}, source.indices, {
        aSkinIndices: source.indices.aPosition,
        aSkinWeights: source.indices.aPosition
      })
    }));
    // Done!
    result.geometry = newGeom;
    // We need to create node names / bind matrices array. Nothing can be done
    // at this level, since root elements are specified in the controller.
    // Map each indexInput to bindMatrices.
    let bindMatrices = this.resolve('source',
      data.joints.find(v => v.semantic === 'INV_BIND_MATRIX').source).source;
    result.joints = indexInput.map((name, i) => ({
      name, bindMatrix: bindMatrices.subarray(i * 16, i * 16 + 16)
    }));
    return result;
  },
  camera(data) {
    return data.optics;
  },
  light(data) {
    return data;
  },
  material(data) {
    return this.resolve('effect', data.url);
  },
  effect(data) {
    // TODO Ignore params for now
    let { params, technique } = data;
    MATERIAL_FIELDS.forEach(key => {
      let value = technique[key];
      if (value == null) return;
      if (typeof value !== 'string') {
        technique[key] = value.slice(0, 3);
        return;
      }
      // 1. Resolve sampler
      let sampler = params[value];
      // 2. Resolve surface
      let surface = params[sampler.source];
      // 3. Resolve image (This is up to the user)
      technique[key] = new Float32Array([1, 1, 1]);
      technique[key + 'Map'] = surface.init_from;
    });
    return technique;
  },
  geometry(data) {
    // We only take polylists.
    let result = data.polylists.map(polylist => {
      if (polylist.type !== 'polylist') {
        throw new Error('Only polylist is supported for now');
      }
      // First, read the attributes and stride.
      let attributes = {};
      let indices = {};
      // This exists for a optimization I suppose.
      let attributeList = [];
      let indicesList = [];
      let offsetList = [];
      let stride = 0;
      let parseInput = (v, offset) => {
        let attribute = {};
        let name = SEMANTIC_ATTRIBUTE_TABLE[v.semantic];
        attribute.name = name;
        attribute.data = v.source;
        attribute.axis = v.axis;
        attributes[name] = attribute;
        attributeList.push(attribute);
        // Initialize indices entry.
        indicesList.push(indices[name] = []);
        offsetList.push(offset);
        if (offset > stride) stride = offset;
      };
      polylist.input.forEach(v => {
        if (v.semantic === 'VERTEX') {
          this.resolve('vertex', v.source).forEach(
            vertInput => parseInput(vertInput, v.offset));
        } else {
          parseInput(Object.assign({
            semantic: v.semantic
          }, this.resolve('source', v.source)), v.offset);
        }
      });
      stride += 1;
      const { vcount, p } = polylist;
      // Then, read each polygon
      // TODO Handle concave polygons
      for (let id = 0; id < attributeList.length; ++id) {
        let attributeIndices = indicesList[id];
        let offset = offsetList[id];
        for (let i = 0; i < vcount.length; ++i) {
          // Run triangluation.
          let count = vcount[i];
          let offsetCounter = offset;
          for (let j = 1; j < count - 1; ++j) {
            offsetCounter += stride;
            attributeIndices.push(
              p[offset],
              p[offsetCounter],
              p[offsetCounter + stride]
            );
          }
          offset += vcount[i] * stride;
        }
      }
      return { attributes, indices, metadata: { material: polylist.material }};
    });
    return result;
  },
  vertex(data) {
    return data.map(v => Object.assign({
      semantic: v.semantic
    }, this.resolve('source', v.source)));
  },
  source({ options }) {
    let source = this.resolve('raw', options.source);
    // Crop the source
    let { offset = 0, count = source.length, stride } = options;
    if (source.subarray != null) {
      source = source.subarray(offset, offset + count * stride);
    } else {
      source = source.slice(offset, offset + count * stride);
    }
    // If X / Y / Z is provided, we need to flip the axis
    /* if (this.flipAxis && options.params.indexOf('X') !== -1) {
      if (source.subarray != null) source = source.slice();
      for (let i = 0; i < source.length; i += 3) {
        // Flip Y, Z, while inverting Y value
        let tmp = -source[i + 1];
        source[i + 1] = source[i + 2];
        source[i + 2] = tmp;
      }
    } */
    return { source, axis: stride };
  },
  raw(data) {
    return data;
  }
};
