import { hierarchy, hoist, registerId, rename, handleInstance } from '../type';

export default {
  camera: hierarchy({
    optics: hoist({
      technique_common: hoist({
        orthographic: hierarchy({
          xmag: 'floatSid',
          ymag: 'floatSid',
          aspect_ratio: rename('aspect', 'floatSid'),
          znear: rename('near', 'floatSid'),
          zfar: rename('far', 'floatSid')
        }),
        perspective: hierarchy({
          xfov: 'floatSid',
          yfov: 'floatSid',
          aspect_ratio: rename('aspect', 'floatSid'),
          znear: rename('near', 'floatSid'),
          zfar: rename('far', 'floatSid')
        })
      })
    })
  }, registerId),
  instanceCamera: hierarchy({}, handleInstance)
};
