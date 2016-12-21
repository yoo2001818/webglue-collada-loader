import { attributes, hierarchy, hoist, rename, registerId, registerIdSilent,
  handleInstance, multipleMap, multiple } from '../type';

export default {
  geometry: hoist({
    mesh: hierarchy({
      source: rename('sources', multipleMap('source',
        (data, frame) => frame.id)),
      vertices: hoist({
        input: multipleMap(attributes(), (data, frame) => frame.data.semantic)
      }, registerIdSilent),
      lines: rename('polylists', multiple('polylist')),
      linestrips: rename('polylists', multiple('polylist')),
      triangles: rename('polylists', multiple('polylist')),
      polylist: rename('polylists', multiple('polylist'))
    })
  }, registerId),
  polylist: hierarchy({
    input: multipleMap(attributes(), (data, frame) => frame.data.semantic),
    p: 'intArray',
    vcount: 'intArray'
  }, {
    push: (node, frame) => {
      frame.data.material = node.attributes.material;
      frame.data.type = node.name;
    }
  }),

  instanceGeometry: hoist({
    bind_material: 'bindMaterial'
  }, handleInstance, {})
};
