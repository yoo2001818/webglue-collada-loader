import { NOOP, attributes, textValue, hierarchy, library, rename,
  multiple, addTrigger, hoist, registerIdSilent, registerId,
  registerSidOptional } from '../type';

export default {
  noop: NOOP,
  attributes: attributes(),
  boolean: textValue(v => v === 'true'),
  booleanArray: textValue(v => v.split(/\s+/).map(v => v === 'true')),
  string: textValue(v => v),
  // Should be the date parsed?
  date: textValue(v => v),
  stringArray: textValue(v => v.split(/\s+/)),
  float: textValue(v => parseFloat(v)),
  floatArray: textValue(v => new Float32Array(v.split(/\s+/).map(parseFloat))),
  int: textValue(v => parseFloat(v)),
  intArray: textValue(v => new Int32Array(v.split(/\s+/).map(parseFloat))),

  floatSid: addTrigger('float', registerSidOptional),
  floatArraySid: addTrigger('floatArray', registerSidOptional),

  COLLADA: hierarchy({
    asset: 'asset',
    library_animations: rename('animations', library('animation', 'animation')),
    library_animation_clips: rename('animationClips', library('animation_clip',
      'animationClip')),
    library_cameras: rename('cameras', library('camera', 'camera')),
    library_controllers: rename('controllers', library('controller',
      'controller')),
    library_geometries: rename('geometries', library('geometry', 'geometry')),
    library_lights: rename('lights', library('light', 'light')),
    library_nodes: rename('nodes', library('node', 'node')),
    library_visual_scenes: rename('visualScenes', library('visual_scene',
      'visualScene')),
    // COLLADA FX
    library_images: rename('images', library('image', 'image')),
    library_effects: rename('effects', library('effect', 'effect')),
    library_materials: rename('materials', library('material', 'material')),
    scene: hierarchy({
      instance_visual_scene: rename('visualScene',
        attributes(v => v.attributes.url))
    })
  }, ({ attributes }) => {
    // Check version
    if (attributes.version.slice(0, 3) !== '1.4') {
      throw new Error('COLLADA parser only supports 1.4.x format');
    }
  }),
  asset: hierarchy({
    contributor: multiple('contributor'),
    created: 'date',
    modified: 'date',
    keywords: 'stringArray',
    revision: 'string',
    subject: 'string',
    title: 'string',
    unit: 'attributes',
    up_axis: rename('upAxis', 'string')
  }),
  contributor: hierarchy({
    author: 'string',
    authoring_tool: 'string',
    comments: 'string',
    copyright: 'string',
    source_data: rename('sourceData', 'string')
  }),
  initial: {
    opentag: function (node) {
      if (node.name !== 'COLLADA') {
        throw new Error('Provided file is not COLLADA format');
      }
      this.push('COLLADA', node);
    },
    popChild(data) {
      this.result = data;
    }
  },

  source: hierarchy({
    Name_array: rename('data', addTrigger('stringArray', registerIdSilent)),
    bool_array: rename('data', addTrigger('booleanArray', registerIdSilent)),
    float_array: rename('data', addTrigger('floatArray', registerIdSilent)),
    int_array: rename('data', addTrigger('intArray', registerIdSilent)),
    // TODO Read param names
    technique_common: rename('options', hoist({
      accessor: hierarchy(
        {
          param: rename('params', multiple(attributes(
            ({ attributes }) => attributes.name
          )))
        },
        ({ attributes }, frame) => {
          frame.data = Object.assign(attributes, {
            count: parseInt(attributes.count),
            offset: parseInt(attributes.offset) || 0,
            stride: parseInt(attributes.stride)
          });
        }
      )
    }))
  }, registerId)
};
