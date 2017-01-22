import { hierarchy, hoist, registerId, rename, multiple, multipleMap,
  attributes, handleInstance } from '../type';

export default {
  animation: hierarchy({
    animation: rename('children', multiple('animation')),
    source: rename('sources', multipleMap('source',
      (data, frame) => frame.id)),
    sampler: multiple(hoist({
      input: multiple('inputUnshared')
    }, registerId)),
    channel: multiple(attributes())
  }, registerId),
  instanceCamera: hierarchy({}, handleInstance)
};
