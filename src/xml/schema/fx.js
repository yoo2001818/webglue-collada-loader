import { NOOP, attributes, hierarchy, hoist, rename, registerSid, registerId,
  registerSidOptional, multiple, multipleMap } from '../type';

const MATERIAL_STRUCTURE = {
  emission: 'colorOrTexture',
  ambient: 'colorOrTexture',
  diffuse: 'colorOrTexture',
  specular: 'colorOrTexture',
  shininess: 'floatOrParam',
  reflective: 'colorOrTexture',
  reflectivity: 'floatOrParam',
  transparent: 'colorOrTexture',
  transparency: 'floatOrParam',
  index_of_refraction: rename('refraction', 'floatOrParam')
};

const CORE_PARAM_TYPE = {
  bool: 'boolean',
  bool2: 'booleanArray',
  bool3: 'booleanArray',
  bool4: 'booleanArray',
  int: 'int',
  int2: 'intArray',
  int3: 'intArray',
  int4: 'intArray',
  float: 'float',
  float2: 'floatArray',
  float3: 'floatArray',
  float4: 'floatArray',
  surface: 'surface',
  sampler2D: 'sampler',
  samplerCUBE: 'sampler'
};

for (let i = 1; i <= 4; ++i) {
  for (let j = 1; j <= 4; ++j) {
    CORE_PARAM_TYPE[`float${i}x${j}`] = 'floatArray';
  }
}


export default {
  effect: hierarchy({
    asset: 'asset',
    image: rename('images', multiple('image')),
    // Only accept COMMON profile for now
    profile_COMMON: rename('common', hierarchy({
      asset: 'asset',
      image: rename('images', multiple('image')),
      newparam: rename('params', multipleMap('newparam',
        (data, frame) => frame.sid
      )),
      technique: hoist({
        // TODO Accept image / newparam at this point
        // image: rename('images', multiple('image')),
        // newparam: rename('params', multiple('newparam')),
        blinn: hierarchy(MATERIAL_STRUCTURE,
          (node, frame) => frame.data.type = 'blinn'),
        constant: hierarchy(MATERIAL_STRUCTURE,
          (node, frame) => frame.data.type = 'constant'),
        lambert: hierarchy(MATERIAL_STRUCTURE,
          (node, frame) => frame.data.type = 'lambert'),
        phong: hierarchy(MATERIAL_STRUCTURE,
          (node, frame) => frame.data.type = 'phong')
      }, registerSid)
    }, registerId))
  }, {
    push: registerId.push,
    pop(data, frame) {
      if (frame.data.common) {
        let { common } = frame.data;
        let newImages = (frame.data.images || []).concat(common.images || []);
        Object.assign(frame.data, common);
        frame.data.images = newImages;
        delete frame.data.common;
      }
      return registerId.pop.call(this, frame.data, frame);
    }
  }),
  newparam: hoist(CORE_PARAM_TYPE, registerSid),
  colorOrTexture: hoist({
    color: 'floatArray',
    param: attributes(v => v.attributes.ref),
    // Ignore 'texCoord' for now
    texture: attributes(v => v.attributes.texture)
  }),
  floatOrParam: hoist({
    float: 'float',
    param: attributes(v => v.attributes.ref)
  }),
  surface: hierarchy({
    size: 'floatArray',
    mipmap_generate: 'boolean',
    channels: 'string',
    range: 'string',
    // TODO Cube texture
    init_cube: NOOP,
    init_from: 'string'
  }),
  sampler: hierarchy({
    source: 'string',
    wrap_s: 'fxSamplerWrapCommon',
    wrap_t: 'fxSamplerWrapCommon',
    minfilter: 'fxSamplerFilterCommon',
    magfilter: 'fxSamplerFilterCommon',
    mipfilter: 'fxSamplerFilterCommon'
  }),
  material: hoist({
    instance_effect: 'instanceEffect'
  }, registerId),
  instanceEffect: hierarchy({
    setparam: rename('params', multipleMap(
      hoist(CORE_PARAM_TYPE, (node, frame) => {
        frame.ref = node.attributes.ref;
      }),
      (data, frame) => frame.ref
    ))
  }, {
    push(node, frame) {
      frame.data.effect = node.attributes.url;
    }
  }),

  bindMaterial: hierarchy({
    param: rename('params', multiple(attributes())),
    technique_common: rename('materials', hoist({
      instance_material: multipleMap(hierarchy({}, {
        push(node, frame) {
          registerSidOptional.push.call(this, node, frame);
          frame.data.target = node.attributes.target;
          frame.data.symbol = node.attributes.symbol;
        },
        pop: registerSidOptional.pop
      }), (data, frame) => frame.data.symbol)
    }))
  })
};
