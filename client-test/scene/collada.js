import loadCollada from '../../src';
import channelGeom from 'webglue/lib/geom/channel/channelOld';
import { mat3, mat4 } from 'gl-matrix';

export default function collada(renderer) {
  const gl = renderer.gl;
  let data = loadCollada(require('../geom/cat.dae'));
  let geom = renderer.geometries.create(channelGeom(data.geometries[1][0]));
  let shader = renderer.shaders.create(
    require('../shader/normal.vert'),
    require('../shader/normal.frag')
  );
  let model1Mat = mat4.create();
  let model1Normal = mat3.create();

  return (delta, context) => {
    // mat4.rotateY(model1Mat, model1Mat, Math.PI * delta / 1000 / 2);
    // mat3.normalFromMat4(model1Normal, model1Mat);

    renderer.render({
      options: {
        clearColor: new Float32Array([0, 0, 0, 1]),
        clearDepth: 1,
        cull: gl.BACK,
        depth: gl.LEQUAL
      },
      uniforms: context.camera,
      passes: [{
        shader: shader,
        uniforms: {
          uModel: model1Mat,
          uNormal: model1Normal
        },
        geometry: geom
      }]
    });
  };
}
