import { vec3, mat3, mat4 } from 'gl-matrix';
import bakeMesh from 'webglue/lib/util/bakeMesh';

export default function render(collada, geometries, materials) {
  // Bake Collada scene to render nodes.
  // Since webglue-collada-loader doesn't provide any default shaders,
  // users must pre-bake the materials into render nodes.
  // Same for geometries - users must provide webglue geometries.
  const { cameras, lights, scene } = collada;
  let lightNodes = {
    ambient: [], point: [], directional: [], spot: []
  };
  let renderNodes = [];
  function bakeNode(node, parentMatrix) {
    // Calculate matrix
    let localMatrix = node.matrix;
    let matrix = localMatrix;
    if (parentMatrix != null) {
      matrix = mat4.create();
      mat4.multiply(matrix, parentMatrix, localMatrix);
    }
    // Add lights
    if (node.lights != null) {
      node.lights.forEach(name => {
        const light = lights[name];
        let lightNode = {};
        lightNode.color = light.color;
        lightNode.intensity = new Float32Array([1, 1, 1,
          light.attenuationQuadratic]);
        let position = vec3.create();
        vec3.transformMat4(position, position, matrix);
        lightNode.position = position;
        lightNodes[light.type].push(lightNode);
      });
    }
    // Add cameras
    // Add geometries
    if (node.geometries != null) {
      let normalMat = mat3.create();
      mat3.normalFromMat4(normalMat, matrix);
      let renderNode = {
        uniforms: {
          uModel: matrix,
          uNormal: normalMat
        },
        passes: node.geometries.map(geometry => {
          // Generate material index
          let materialIndex = {};
          for (let key in geometry.materials) {
            materialIndex[key] = materials[geometry.materials[key]];
          }
          return bakeMesh(geometries[geometry.name], materialIndex);
        })
      };
      renderNodes.push(renderNode);
    }
    if (node.children != null) {
      node.children.forEach(node => bakeNode(node, matrix));
    }
  }
  scene.forEach(node => bakeNode(node));
  console.log(renderNodes, lightNodes);
}
