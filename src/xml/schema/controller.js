import { hierarchy, hoist, rename, registerId, unwrap,
  multiple, multipleMap, handleInstance } from '../type';

export default {
  controller: hoist({
    skin: hierarchy({
      bind_shape_matrix: rename('bindShape', 'floatArray'),
      source: rename('sources', multipleMap('source',
        (data, frame) => frame.id)),
      joints: hoist({
        input: multiple('inputUnshared'),
      }),
      vertex_weights: rename('weights', hierarchy({
        input: multiple('inputShared'),
        vcount: 'intArray',
        v: 'intArray'
      }))
    }, {
      push(node, frame) {
        frame.data.source = node.attributes.source;
      }
    })
  }, registerId),

  instanceController: hierarchy({
    skeleton: 'string',
    bind_material: unwrap('bindMaterial')
  }, handleInstance)
};
