#version 100
// feature is required because of webglue bug.
// TODO Fix standalone count pragma
#pragma webglue: feature(JOINT_USED, uBindMatrices)
#pragma webglue: count(JOINT_COUNT, uBindMatrices, eqLength)

#ifndef JOINT_COUNT
  #define JOINT_COUNT 1
#endif

attribute vec3 aPosition;
attribute vec4 aSkinWeights;
attribute vec4 aSkinIndices;

uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uProjectionView;
uniform mat4 uModel;
uniform mat3 uNormal;
uniform mat4 uBindMatrices[JOINT_COUNT];

varying lowp vec3 vColor;

vec3 getIndices(float value) {
  float offset = mod(value, 3.0);
  if (offset > 1.5) return vec3(1.0, 0.0, 0.0);
  else if (offset > 0.5) return vec3(0.0, 1.0, 0.0);
  else return vec3(0.0, 0.0, 1.0);
}

void main(void) {
  ivec4 skinIndices = ivec4(aSkinIndices);
  vec4 position = vec4(0.0);
  for (int i = 0; i < 4; i++) {
    int index = skinIndices[i];
    // if (index > JOINT_COUNT) return;
    position += aSkinWeights[i] * (uBindMatrices[index] *
      vec4(aPosition, 1.0));
  }
  gl_Position = uProjectionView * uModel * position;

  vec3 values = vec3(0.0);
  values += getIndices(aSkinIndices.r) * aSkinWeights.r;
  values += getIndices(aSkinIndices.g) * aSkinWeights.g;
  values += getIndices(aSkinIndices.b) * aSkinWeights.b;
  values += getIndices(aSkinIndices.a) * aSkinWeights.a;

  vColor = values;
}
