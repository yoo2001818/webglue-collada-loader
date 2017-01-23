import { hierarchy, rename, registerId, multiple,
  addTrigger, registerSidOptionalSilent } from '../type';

function transformOp(type) {
  return rename('transform', multiple(addTrigger('floatArray', {
    push: registerSidOptionalSilent.push,
    pop(result, frame) {
      registerSidOptionalSilent.pop(result, frame);
      return {
        id: frame.id, sid: frame.sid, type, data: result
      };
    }
  })));
}

export default {
  node: hierarchy({
    asset: 'asset',
    node: rename('children', multiple('node')),
    // If we do animation, this might have to be updated often - it shouldn't
    // be coupled with XML parser.
    lookat: transformOp('lookat'),
    matrix: transformOp('matrix'),
    rotate: transformOp('rotate'),
    scale: transformOp('scale'),
    skew: transformOp('skew'),
    translate: transformOp('translate'),
    instance_geometry: rename('geometries', multiple('instanceGeometry')),
    instance_controller: rename('controllers', multiple('instanceController')),
    instance_camera: rename('cameras', multiple('instanceCamera')),
    instance_light: rename('lights', multiple('instanceLight')),
    instance_node: rename('nodes', multiple('instanceNode'))
  }, {
    push(node, frame) {
      registerId.push.call(this, node, frame);
      frame.data.type = node.attributes.type || 'NODE';
    },
    pop: registerId.pop
  }),

  visualScene: hierarchy({
    node: rename('children', multiple('node'))
  }, registerId)
};
