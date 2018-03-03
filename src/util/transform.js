import { mat4 } from 'gl-matrix';

export const TYPES = {
  lookat(out, input) {
    let eye = input.subarray(0, 3);
    let center = input.subarray(3, 6);
    let up = input.subarray(6, 9);
    return mat4.lookAt(out, eye, center, up);
  },
  matrix(out, input) {
    return mat4.transpose(out, input);
  },
  rotate(out, input) {
    return mat4.fromRotation(out, input[3] / 180 * Math.PI,
      input.subarray(0, 3));
  },
  scale(out, input) {
    return mat4.fromScaling(out, input);
  },
  skew() {
    throw new Error('Skew operation is not supported');
  },
  translate(out, input) {
    return mat4.fromTranslation(out, input);
  }
};

let tmpMat4 = mat4.create();
let priority = ['scale', 'rotation', 'translate'];

export default function calcTransform(transforms) {
  let transformSorted = transforms.slice();
  transformSorted.sort((a, b) =>
    priority.indexOf(a.type) - priority.indexOf(b.type));
  return transformSorted.reduce((matrix, transform) => {
    // Calculate each matrix, then multiply it with original matrix.
    let type = TYPES[transform.type];
    if (type == null) throw new Error(`${transform.type} is not defined type`);
    let returned = type(tmpMat4, transform.data);
    return mat4.multiply(matrix, returned, matrix);
  }, mat4.create());
}
