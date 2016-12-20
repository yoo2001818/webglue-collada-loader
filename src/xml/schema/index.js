import base from './base';
import controller from './controller';
import fx from './fx';
import geometry from './geometry';
import node from './node';
import camera from './camera';
import light from './light';

// Uh.. what?
export default Object.assign({}, base, controller, fx, geometry, node,
  camera, light);
