import { attributes, hierarchy, hoist, rename, registerId, unwrap,
  multipleMap } from '../type';

export default {
  controller: hoist({
    skin: hierarchy({
      bindShapeMatrix: 'floatArray',
      source: rename('sources', multipleMap('source',
        (data, frame) => frame.id)),
      joints: hoist({
        input: multipleMap(attributes(), (data, frame) => frame.data.semantic)
      }),
      vertex_weights: rename('weights', hierarchy({
        input: rename('inputs', multipleMap(attributes(),
          (data, frame) => frame.data.semantic)),
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
  })
};
