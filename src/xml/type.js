// Stores parser types

export const NOOP = {
  opentag(node) {
    this.push(NOOP, node);
  },
  closetag() {
    this.pop();
  },
};

export function cached(schema, manipulator) {
  // We use cache to make hoisting available.... what?
  let cached = null;
  return function() {
    if (cached !== null) return cached;
    cached = manipulator(this.resolveSchema(schema));
    return cached;
  };
}

export const rename =
  (target, schema) => cached(schema, v => v && Object.assign({ target }, v));
export const multiple =
  (schema) => cached(schema, v => v && Object.assign({}, v, {
    // merge is *always* executed by hierarchy, even though no prev object
    // is available.
    merge: (prev = [], current) => (prev.push(current), prev)
  }));
export const multipleMap =
  (schema, getKey) => cached(schema, v => v && Object.assign({}, v, {
    // merge is *always* executed by hierarchy, even though no prev object
    // is available.
    merge: (prev = {}, current, frame) => {
      prev[getKey(current, frame)] = current;
      return prev;
    }
  }));
export const unwrap = (schema) => cached(schema,
  v => v && Object.assign({}, v, {
    merge: (prev, current, frame) => {
      Object.assign(frame.parent.data, current);
      return undefined;
    }
  }
));
export const merge =
  (schema, merge) => cached(schema, v => v && Object.assign({ merge }, v));


export function createNamespace(createLocal, sidNecessary, overwrite = true) {
  return {
    push(node, frame) {
      const { id, sid, name } = node.attributes;
      if (sid != null) {
        let parent = frame.parent;
        while (parent != null && parent.namespace == null) {
          parent = node.parent;
        }
        if (parent != null) {
          frame.namespaceParent = parent;
          frame.sid = sid;
        }
      } else if (sidNecessary) {
        throw new Error('sid is required but was not specified');
      }
      if (id != null) {
        frame.id = id;
      }
      frame.name = name;
      if (overwrite && createLocal) {
        frame.namespace = {};
      }
    },
    pop(data, frame) {
      if (frame.namespaceParent != null) {
        frame.namespaceParent.namespace[frame.sid] = data;
        if (overwrite) data.sid = frame.sid;
      }
      if (frame.id != null) {
        this.namespace[frame.id] = data;
        if (overwrite) data.id = frame.id;
      }
      if (overwrite && createLocal) {
        data.namespace = Object.assign({}, data.namespace, frame.namespace);
      }
      if (overwrite && frame.name != null) data.name = frame.name;
      return data;
    }
  };
}

export const registerId = createNamespace(true, false, true);
export const registerIdSilent = createNamespace(true, false, false);
export const registerSid = createNamespace(false, true, true);
export const registerSidOptional = createNamespace(false, false, true);
export const registerSidOptionalSilent = createNamespace(false, false, false);
export const handleInstance = {
  push(node, frame) {
    registerSidOptional.push.call(this, node, frame);
    frame.url = node.attributes.url;
  },
  pop(data, frame) {
    frame.data.url = frame.url;
    return registerSidOptional.pop.call(this, frame.data, frame);
  }
};

export function addTrigger(schema, triggers) {
  let onPush, onPop;
  if (typeof triggers === 'function') onPush = triggers;
  else if (triggers != null) {
    onPush = triggers.push;
    onPop = triggers.pop;
  }
  return cached(schema, v => {
    return v && Object.assign({}, v, {
      push(node, frame) {
        v.push(node, frame);
        if (onPush != null) onPush.call(this, node, frame);
      },
      pop(data, frame) {
        let result = v.pop(data, frame);
        if (onPop != null) return onPop.call(this, result, frame);
        return result;
      }
    });
  });
}

export function hoist(children, triggers, initialValue = undefined) {
  let onPush, onPop;
  if (typeof triggers === 'function') onPush = triggers;
  else if (triggers != null) {
    onPush = triggers.push;
    onPop = triggers.pop;
  }
  return {
    push(node, frame) {
      frame.data = initialValue;
      if (onPush != null) onPush.call(this, node, frame);
    },
    opentag(node, frame) {
      let child = children[node.name];
      // Ignore if node name doesn't match
      if (child == null) return this.push(NOOP, node);
      let schema = this.resolveSchema(child);
      // TODO Remove this
      if (schema == null) return this.push(NOOP, node);
      frame.targetSchema = schema;
      this.push(schema, node);
    },
    closetag() {
      // TODO This should be default operation if not specified
      this.pop();
    },
    pop(data, frame) {
      if (onPop != null) return onPop.call(this, frame.data, frame);
      return frame.data;
    },
    popChild(data, frame, childFrame) {
      let result = data;
      if (result == null) return;
      if (frame.targetSchema && frame.targetSchema.merge != null) {
        result = frame.targetSchema.merge(frame.data, result, childFrame);
      }
      frame.data = result;
    }
  };
}

export function hierarchy(children, triggers, initialValue) {
  let onPush, onPop;
  if (typeof triggers === 'function') onPush = triggers;
  else if (triggers != null) {
    onPush = triggers.push;
    onPop = triggers.pop;
  }
  return {
    push(node, frame) {
      // TODO attributes
      frame.data = Object.assign({}, initialValue);
      if (onPush != null) onPush.call(this, node, frame);
    },
    opentag(node, frame) {
      let child = children[node.name];
      frame.target = null;
      // Ignore if node name doesn't match
      if (child == null) return this.push(NOOP, node);
      let schema = this.resolveSchema(child);
      // TODO Remove this
      if (schema == null) return this.push(NOOP, node);
      frame.target = schema.target || node.name;
      frame.targetSchema = schema;
      this.push(schema, node);
    },
    closetag() {
      // TODO This should be default operation if not specified
      this.pop();
    },
    pop(data, frame) {
      if (onPop != null) return onPop.call(this, frame.data, frame);
      return frame.data;
    },
    popChild(data, frame, childFrame) {
      let prev = frame.data[frame.target];
      let result = data;
      if (frame.target == null) return;
      if (frame.targetSchema && frame.targetSchema.merge != null) {
        result = frame.targetSchema.merge(prev, result, childFrame);
      }
      if (result !== undefined) frame.data[frame.target] = result;
    }
  };
}

export function library(nodeName, schema) {
  return {
    push(node, frame) {
      frame.data = [];
    },
    opentag(node) {
      // TODO Maybe we should handle this?
      if (nodeName !== node.name) return this.push(NOOP, node);
      let schemaResolved = this.resolveSchema(schema);
      if (schemaResolved == null) return this.push(NOOP, node);
      this.push(schemaResolved, node);
    },
    closetag() {
      // TODO This should be default operation if not specified
      this.pop();
    },
    pop(data, frame) {
      return frame.data;
    },
    popChild(data, frame) {
      if (data == null) return;
      frame.data.push(data);
    },
    merge(prev = [], current) {
      return prev.concat(current);
    }
  };
}

export function attributes(proc) {
  return {
    push(node, frame) {
      if (proc != null) frame.data = proc(node);
      else frame.data = node.attributes;
    },
    opentag(node) {
      return this.push(NOOP, node);
    },
    closetag() {
      // TODO This should be default operation if not specified
      this.pop();
    },
    pop(data, frame) {
      return frame.data;
    },
    merge(prev = {}, current) {
      if (proc != null) return current;
      return Object.assign(prev, current);
    }
  };
}

export function textValue(proc) {
  return {
    push(data, frame) {
      frame.value = null;
    },
    opentag(node) {
      return this.push(NOOP, node);
    },
    closetag() {
      // TODO This should be default operation if not specified
      this.pop();
    },
    text(data, frame) {
      let value = data.trim();
      if (value === '') return;
      frame.value = value;
    },
    pop(data, frame) {
      return proc(frame.value);
    }
  };
}
