import { attributes, hierarchy, hoist, rename, registerId, registerIdSilent,
  handleInstance, multipleMap } from '../type';

export default {
  geometry: hoist({
    mesh: hierarchy({
      source: rename('sources', multipleMap('source',
        (data, frame) => frame.id)),
      vertices: hoist({
        input: multipleMap(attributes(), (data, frame) => frame.data.semantic)
      }, registerIdSilent),
      lines: 'polylist',
      linestrips: 'polylist',
      triangles: 'polylist',
      polylist: 'polylist'
    })
  }, registerId),
  polylist: hierarchy({
    input: multipleMap(attributes(), (data, frame) => frame.data.semantic),
    p: 'intArray',
    vcount: 'intArray'
  }, {
    push: (node, frame) => {
      frame.data.material = node.attributes.material;
      frame.parent.data.type = node.name;
    }
  }),

  instanceGeometry: hoist({
    bind_material: 'bindMaterial'
  }, handleInstance, {})
};
