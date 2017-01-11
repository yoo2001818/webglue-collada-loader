import { vec3, mat4 } from 'gl-matrix';

export default function render(collada, materials) {
  // Bake Collada scene to render nodes.
  // Since webglue-collada-loader doesn't provide any default shaders,
  // users must pre-bake the materials into render nodes.
  const { geometries, cameras, lights, scene } = collada;
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
      node.lights.forEach(light => {
        let lightNode = {};
        lightNode.color = light.color;
        lightNode.intensity = new Float32Array([1, 1, 1,
          lightNode.attenuationQuadratic]);
        let position = vec3.create();
        vec3.transformMat4(position, position, matrix);
        lightNode.position = position;
        lightNodes[light.type].push(lightNode);
      });
    }
    // Add cameras
    // Add geometries

    if (node.children != null) {
      node.children.forEach(node => bakeNode(node, matrix));
    }
  }
  scene.forEach(node => bakeNode(node));
  console.log(renderNodes);
}
