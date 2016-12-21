import loadCollada from '../../src';

export default function collada() {
  let data = loadCollada(require('../geom/multiMaterial.dae'));
  return () => {};
}
