import { attributes, hierarchy, hoist, rename, registerId, registerIdSilent,
  handleInstance, multipleMap, multiple } from '../type';

export default {
  geometry: hoist({
    mesh: hierarchy({
      source: rename('sources', multipleMap('source',
        (data, frame) => frame.id)),
      vertices: hoist({
        input: multiple('inputUnshared')
      }, registerIdSilent),
      lines: rename('polylists', multiple('polylist')),
      linestrips: rename('polylists', multiple('polylist')),
      triangles: rename('polylists', multiple('polylist')),
      polylist: rename('polylists', multiple('polylist')),
      polygons: rename('polylists', multiple('polygons'))
    })
  }, registerId),
  polygons: hierarchy({
    input: multiple('inputShared'),
    p: multiple('intArray')
  }, {
    push: (node, frame) => {
      frame.data.material = node.attributes.material;
      frame.data.type = 'polylist';
    },
    pop: (data, frame) => {
      // Convert itself to polylist, by flattening the array
      let pOut = [];
      let vcountOut = [];
      let p = frame.data.p;
      for (let i = 0; i < p.length; ++i) {
        let poly = p[i];
        for (let j = 0; j < poly.length; ++j) {
          pOut.push(poly[j]);
        }
        vcountOut.push(poly.length);
      }
      frame.data.p = new Int32Array(pOut);
      frame.data.vcount = new Int32Array(vcountOut);
      return frame.data;
    }
  }),
  polylist: hierarchy({
    input: multiple('inputShared'),
    p: 'intArray',
    vcount: 'intArray'
  }, {
    push: (node, frame) => {
      frame.data.material = node.attributes.material;
      frame.data.type = node.name;
    }
  }),
  inputUnshared: attributes(),
  inputShared: attributes(({attributes}) => Object.assign(attributes, {
    offset: parseInt(attributes.offset)
  })),

  instanceGeometry: hoist({
    bind_material: 'bindMaterial'
  }, handleInstance, {})
};
