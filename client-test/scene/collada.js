import loadCollada from '../../src';
import channelGeom from 'webglue/lib/geom/channel/channelOld';
import bakeMesh from 'webglue/lib/util/bakeMesh';
import { mat3, mat4 } from 'gl-matrix';

export default function collada(renderer) {
  const gl = renderer.gl;
  let data = loadCollada(require('../geom/cat.dae'));
  let geom = renderer.geometries.create(channelGeom(data.geometries[1][0]));
  let shader = renderer.shaders.create(
    require('../shader/phong.vert'),
    require('../shader/phong.frag')
  );
  let model1Mat = mat4.create();
  let model1Normal = mat3.create();

  // Bake Material to WebglueRenderNode
  function bakeMaterial(material) {
    return {
      shader,
      uniforms: {
        uMaterial: {
          ambient: material.ambient.map((v, i) => v * material.diffuse[i]),
          diffuse: material.diffuse,
          specular: material.specular,
          shininess: material.shininess,
          reflectivity: material.model === 3 ? new Float32Array([
            material.specular[0], material.specular[1], material.specular[2], 1
          ]) : '#00000000'
        }
      }
    };
  }
  let bakedMaterials = data.materials.map(v => bakeMaterial(v));

  let nodes = bakeMesh(geom, {
    'Catmat-material': bakedMaterials[0]
  });

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
      uniforms: Object.assign({}, context.camera, {
        uPointLight: [{
          position: [0, 1, 1],
          color: '#ffffff',
          intensity: [0.3, 0.8, 1.0, 0.00015]
        }]
      }),
      passes: [{
        uniforms: {
          uModel: model1Mat,
          uNormal: model1Normal
        },
        passes: nodes
      }]
    });
  };
}
