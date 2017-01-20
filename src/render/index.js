import { vec3, mat3, mat4 } from 'gl-matrix';
import bakeMesh from 'webglue/lib/util/bakeMesh';

function lookupSkeleton(lut, node, parentMatrix) {
  // Calculate matrix
  let localMatrix = node.matrix;
  let matrix = localMatrix;
  if (parentMatrix != null) {
    matrix = mat4.create();
    mat4.multiply(matrix, parentMatrix, localMatrix);
  }
  if (lut[node.id] != null) mat4.multiply(lut[node.id], matrix, lut[node.id]);
  if (lut[node.sid] != null) {
    mat4.multiply(lut[node.sid], matrix, lut[node.sid]);
  }
  if (node.children != null) {
    node.children.forEach(node => lookupSkeleton(lut, node, matrix));
  }
}

export default function render(collada, geometries, materials) {
  // Bake Collada scene to render nodes.
  // Since webglue-collada-loader doesn't provide any default shaders,
  // users must pre-bake the materials into render nodes.
  // Same for geometries - users must provide webglue geometries.
  // Controllers must be provided in geometries object.
  const { cameras, lights, controllers, scene, flipAxis } = collada;
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
          return bakeMesh(geometries[geometry.url], materialIndex);
        })
      };
      renderNodes.push(renderNode);
    }
    // Add controllers
    if (node.controllers != null) {
      // Treat controllers as regular geometries for now.
      let normalMat = mat3.create();
      mat3.normalFromMat4(normalMat, matrix);
      let renderNode = {
        uniforms: {
          uModel: matrix,
          uNormal: normalMat
        },
        passes: node.controllers.map(controller => {
          // We need to create bind matrix; This can be done more efficiently,
          // but, this is using a slow method.
          let lookupTable = {};
          let controllerObj = controllers[controller.url];
          let matrices = controllerObj.joints.map(joint => {
            let output = mat4.clone(joint.bindMatrix);
            lookupTable[joint.name] = output;
            return output;
          });
          // Look up child objects to create matrix.
          lookupSkeleton(lookupTable, controller.skeleton);
          console.log(matrices);
          // Generate material index
          let materialIndex = {};
          for (let key in controller.materials) {
            materialIndex[key] = materials[controller.materials[key]];
          }
          return {
            uniforms: {
              uBindMatrices: matrices
            },
            passes: bakeMesh(geometries[controller.url], materialIndex)
          };
        })
      };
      renderNodes.push(renderNode);
    }
    if (node.children != null) {
      node.children.forEach(node => bakeNode(node, matrix));
    }
  }
  scene.forEach(node => bakeNode(node, flipAxis && [
    1, 0, 0, 0,
    0, 0, -1, 0,
    0, 1, 0, 0,
    0, 0, 0, 1
  ]));
  console.log(renderNodes, lightNodes);
  // Bake camera / light information
  return {
    uniforms: {
      uPointLight: lightNodes.point,
      uDirectionalLight: lightNodes.directional
    },
    passes: renderNodes
  };
}
