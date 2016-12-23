const SEMANTIC_ATTRIBUTE_TABLE = {
  POSITION: 'aPosition',
  NORMAL: 'aNormal',
  TEXCOORD: 'aTexCoord',
  TANGENT: 'aTangent',
  COLOR: 'aColor'
};

export default {
  document(data) {
    let result = {};
    this.flipAxis = data.asset.upAxis !== 'Y_UP';
    console.log(data.images);
    result.geometries = (data.geometries || []).map(this.process.bind(this,
      'geometry'));
    console.log(result);
    return result;
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
      return { attributes, indices, material: polylist.material };
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
    if (this.flipAxis && options.params.indexOf('X') !== -1) {
      if (source.subarray != null) source = source.slice();
      for (let i = 0; i < source.length; i += 3) {
        // Flip Y, Z, while inverting Y value
        let tmp = -source[i + 1];
        source[i + 1] = source[i + 2];
        source[i + 2] = tmp;
      }
    }
    return { source, axis: stride };
  },
  raw(data) {
    return data;
  }
};
