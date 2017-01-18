#version 100

attribute vec3 aPosition;
attribute vec4 aSkinWeights;
attribute vec4 aSkinIndices;

uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uProjectionView;
uniform mat4 uModel;
uniform mat3 uNormal;

varying lowp vec3 vColor;

vec3 getIndices(float value) {
  float offset = mod(value, 3.0);
  if (offset > 1.5) return vec3(1.0, 0.0, 0.0);
  else if (offset > 0.5) return vec3(0.0, 1.0, 0.0);
  else return vec3(0.0, 0.0, 1.0);
}

void main(void) {
  gl_Position = uProjectionView * uModel * vec4(aPosition, 1.0);
  vec3 values = vec3(0.0);
  values += getIndices(aSkinIndices.r) * aSkinWeights.r;
  values += getIndices(aSkinIndices.g) * aSkinWeights.g;
  values += getIndices(aSkinIndices.b) * aSkinWeights.b;
  values += getIndices(aSkinIndices.a) * aSkinWeights.a;
  vColor = values;
}
