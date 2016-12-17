import { hierarchy, rename, registerId, multiple, merge,
  addTrigger, registerIdSilent } from '../type';
import { mat4 } from 'gl-matrix';

let tmpMat4 = mat4.create();

function matrixOp(op) {
  return rename('matrix', merge(
    addTrigger('floatArray', registerIdSilent), (prev, current) => {
      return mat4.multiply(prev, op(current), prev);
    })
  );
}

export default {
  node: hierarchy({
    asset: 'asset',
    node: rename('children', multiple('node')),
    // If we do animation, this might have to be updated often - it shouldn't
    // be coupled with XML parser.
    lookat: matrixOp(input => {
      let eye = input.subarray(0, 3);
      let center = input.subarray(3, 6);
      let up = input.subarray(6, 9);
      return mat4.lookAt(tmpMat4, eye, center, up);
    }),
    matrix: matrixOp(input => {
      return mat4.copy(tmpMat4, input);
    }),
    rotate: matrixOp(input => {
      return mat4.fromRotation(tmpMat4,
        input[3] / 180 * Math.PI, input.subarray(0, 3));
    }),
    scale: matrixOp(input => {
      return mat4.fromScaling(tmpMat4, input);
    }),
    skew: matrixOp(() => {
      throw new Error('Skew operation is not supported');
    }),
    translate: matrixOp(input => {
      return mat4.fromTranslation(tmpMat4, input);
    }),
    instance_geometry: rename('geometries', multiple('instanceGeometry')),
    instance_controller: rename('controllers', multiple('instanceController')),
    instance_camera: rename('cameras', multiple('instanceCamera')),
    instance_light: rename('lights', multiple('instanceLight')),
    instance_node: rename('nodes', multiple('instanceNode'))
  }, {
    push(node, frame) {
      registerId.push.call(this, node, frame);
      frame.data.matrix = mat4.create();
      frame.data.type = node.attributes.type || 'NODE';
    },
    pop: registerId.pop
  }),

  visualScene: hierarchy({
    node: rename('children', multiple('node'))
  }, registerId)
};
