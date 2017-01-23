import loadCollada from '../../src';
import render from '../../src/render';
import channelGeom from 'webglue/lib/geom/channel/channelOld';
// import bakeMesh from 'webglue/lib/util/bakeMesh';
// import { mat3, mat4 } from 'gl-matrix';

export default function collada(renderer) {
  const gl = renderer.gl;
  renderer.shaders.governors.eqLength = {
    checker: (shader, current) =>
      shader === (current == null ? 0 : current.length),
    allocator: current => current == null ? 0 : current.length
  };
  let shader = renderer.shaders.create(
    require('../shader/phong.vert'),
    require('../shader/phong.frag')
  );
  function bakeMaterial(material) {
    return {
      shader,
      uniforms: {
        uMaterial: {
          ambient: material.ambient.map((v, i) => v * material.diffuse[i]),
          diffuse: material.diffuse,
          specular: material.type === 'lambert' ?
            new Float32Array([0, 0, 0]) :
            material.specular,
          shininess: material.type === 'lambert' ? 0 : material.shininess
        }
      }
    };
  }
  let world = [];
  let bakedMaterials = {};
  let bakedGeometries = {};
  loadCollada(require('../geom/pencil.dae'), true).then(data => {
    let collada = data;
    // Bake materials
    for (let key in collada.materials) {
      bakedMaterials[key] = bakeMaterial(collada.materials[key]);
    }
    // Bake geometries
    for (let key in collada.geometries) {
      bakedGeometries[key] = renderer.geometries.create(
        collada.geometries[key].map(v => channelGeom(v)));
    }
    // Bake controllers
    for (let key in collada.controllers) {
      bakedGeometries[key] = renderer.geometries.create(
        collada.controllers[key].geometry.map(v => channelGeom(v)));
    }
    world = render(collada, bakedGeometries, bakedMaterials);
  });
  return (delta, context) => {
    renderer.render({
      options: {
        clearColor: new Float32Array([255, 255, 255, 1]),
        clearDepth: 1,
        cull: gl.BACK,
        depth: gl.LEQUAL
      },
      uniforms: context.camera,
      passes: world
    });
  };
}
