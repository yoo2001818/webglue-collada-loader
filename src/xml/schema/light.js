import { hierarchy, hoist, registerId, rename, handleInstance } from '../type';

export default {
  light: hoist({
    technique_common: hoist({
      ambient: hierarchy({
        color: 'floatArraySid'
      }, null, {
        type: 'ambient'
      }),
      directional: hierarchy({
        color: 'floatArraySid'
      }, null, {
        type: 'directional'
      }),
      point: hierarchy({
        color: 'floatArraySid',
        constant_attenuation: rename('attenuationConstant', 'floatSid'),
        linear_attenuation: rename('attenuationLinear', 'floatSid'),
        quadratic_attenuation: rename('attenuationQuadratic', 'floatSid'),
        zfar: 'floatSid'
      }, null, {
        type: 'point',
        attenuationConstant: 1,
        attenuationLinear: 0,
        zfar: 0
      }),
      spot: hierarchy({
        color: 'floatArraySid',
        constant_attenuation: rename('attenuationConstant', 'floatSid'),
        linear_attenuation: rename('attenuationLinear', 'floatSid'),
        quadratic_attenuation: rename('attenuationQuadratic', 'floatSid'),
        falloff_angle: rename('falloffAngle', 'floadSid'),
        falloff_exponent: rename('falloffExponent', 'floadSid'),
      }, null, {
        type: 'point',
        attenuationConstant: 1,
        attenuationLinear: 0,
        zfar: 0,
        falloffAngle: 180,
        falloffExponent: 0
      })
    })
  }, registerId),
  instanceLight: hierarchy({}, handleInstance)
};
