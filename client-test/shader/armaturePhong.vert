#version 100
precision lowp float;

// feature is required because of webglue bug.
// TODO Fix standalone count pragma
#pragma webglue: feature(JOINT_USED, uBindMatrices)
#pragma webglue: count(JOINT_COUNT, uBindMatrices, eqLength)

#ifndef JOINT_COUNT
  #define JOINT_COUNT 1
#endif

attribute vec2 aTexCoord;
attribute vec3 aNormal;
attribute vec3 aPosition;
attribute vec4 aTangent;
attribute vec4 aSkinWeights;
attribute vec4 aSkinIndices;

varying lowp vec3 vPosition;
varying lowp vec2 vTexCoord;
varying lowp vec3 vViewPos;
varying lowp vec3 vNormal;

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

vec3 getViewPosWorld() {
  return -mat3(
    uView[0].x, uView[1].x, uView[2].x,
    uView[0].y, uView[1].y, uView[2].y,
    uView[0].z, uView[1].z, uView[2].z
    ) * uView[3].xyz;
}

void main() {
  ivec4 skinIndices = ivec4(aSkinIndices);
  vec4 position = vec4(0.0);
  vec4 normal = vec4(0.0);
  for (int i = 0; i < 4; i++) {
    int index = skinIndices[i];
    // if (index > JOINT_COUNT) return;
    position += aSkinWeights[i] * (uBindMatrices[index] *
      vec4(aPosition, 1.0));
    normal += aSkinWeights[i] * (uBindMatrices[index] * vec4(aNormal, 0.0));
  }
  vec4 fragPos = uModel * position;
  gl_Position = uProjectionView * fragPos;
  vTexCoord = aTexCoord;
  vPosition = fragPos.xyz;
  vNormal = uNormal * normal.xyz;
  vViewPos = getViewPosWorld();
}
