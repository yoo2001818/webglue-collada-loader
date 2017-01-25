import { vec3, quat, mat3, mat4 } from 'gl-matrix';
import bakeMesh from 'webglue/lib/util/bakeMesh';
import calcTransform from '../util/transform';

let tmpTranslation = vec3.create(), tmpTranslation2 = vec3.create();
let tmpScaling = vec3.create(), tmpScaling2 = vec3.create();
let tmpRotation = quat.create(), tmpRotation2 = quat.create();

function getMatrix(node, time) {
  // Calculate matrix, with animations.
  if (node.animations == null || node.animations.length === 0) {
    return node.matrix;
  }
  return calcTransform(node.transform.map(transform => {
    if (transform.animations == null) return transform;
    // TODO Support multiple channels
    let modified = new Float32Array(transform.data);
    transform.animations.forEach(animation => {
      // This is actually equivalent to kkiro3d's logic, though.
      let index = animation.input.findIndex(v => v > time);
      if (index === -1) index = animation.input.length - 1;
      let prevIndex = index - 1;
      if (prevIndex < 0) prevIndex = 0;
      // Interpolate each other.
      // TODO Support other than linear interpolation
      let currentIn = animation.input[index];
      let prevIn = animation.input[prevIndex];
      let offset = (time - prevIn) / (currentIn - prevIn);
      if (isNaN(offset)) offset = 0;
      if (offset > 1) offset = 1;
      // TODO This should be changed if channel is specified.
      if (animation.axis != null) {
        let currentOut = animation.output[index];
        let prevOut = animation.output[prevIndex];
        modified[animation.axis] = (currentOut - prevOut) * offset + prevOut;
      } else {
        let stride = modified.length;
        if (stride === 16) {
          // Assume a matrix; we need to separate translation / rotation /
          // scale and interpolate them separately, then merge them.
          // This'd be quite slow..
          let currentMat = animation.output.subarray(index * stride,
            index * stride + 16);
          let prevMat = animation.output.subarray(prevIndex * stride,
            prevIndex * stride + 16);
          mat4.getTranslation(tmpTranslation2, prevMat);
          mat4.getTranslation(tmpTranslation, currentMat);
          mat4.getRotation(tmpRotation2, prevMat);
          mat4.getRotation(tmpRotation, currentMat);
          // TODO Skip scale for now
          vec3.lerp(tmpTranslation, tmpTranslation2, tmpTranslation, offset);
          quat.slerp(tmpRotation, tmpRotation2, tmpRotation, offset);
          mat4.fromRotationTranslation(modified, tmpRotation, tmpTranslation);
        } else {
          for (let i = 0; i < stride; ++i) {
            let currentOut = animation.output[index * stride + i];
            let prevOut = animation.output[prevIndex * stride + i];
            modified[i] = (currentOut - prevOut) * offset + prevOut;
          }
        }
      }
    });
    if (modified.length === 16) mat4.transpose(modified, modified);
    return { type: transform.type, data: modified };
  }));
}

function lookupSkeleton(lut, node, parentMatrix, time) {
  // Calculate matrix
  let localMatrix = getMatrix(node, time);
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
    node.children.forEach(node => lookupSkeleton(lut, node, matrix, time));
  }
}

export default function render(collada, geometries, materials, time) {
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
    let localMatrix = getMatrix(node, time);
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
          lookupSkeleton(lookupTable, controller.skeleton, null, time);
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
  // console.log(renderNodes, lightNodes);
  // Bake camera / light information
  return {
    uniforms: {
      uPointLight: lightNodes.point,
      uDirectionalLight: lightNodes.directional
    },
    passes: renderNodes
  };
}
