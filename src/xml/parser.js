import sax from 'sax';

export default class Parser {
  constructor(schema, initial) {
    this.stack = [];
    this.namespace = {};
    this.schema = schema;
    this.push(initial);
  }
  push(op, data) {
    let operator = this.resolveSchema(op);
    let stackFrame = { operator, parent: this.stack[this.stack.length - 1] };
    this.stack.push(stackFrame);
    if (operator.push != null) operator.push.call(this, data, stackFrame);
  }
  pop(data) {
    if (this.stack.length === 0) throw new Error('Unable to pop frame');
    let stackFrame = this.stack.pop();
    let popOp = stackFrame.operator.pop;
    let result = popOp && popOp.call(this, data, stackFrame);
    if (this.stack.length > 0) {
      let parentFrame = this.stack[this.stack.length - 1];
      let popChild = parentFrame.operator.popChild;
      popChild && popChild.call(this, result, parentFrame, stackFrame);
    }
  }
  get() {
    return this.stack[this.stack.length - 1];
  }
  getDelegator(getOp) {
    return (v) => {
      let frame = this.get();
      let func = getOp(frame.operator);
      if (func != null) func.call(this, v, frame);
    };
  }
  resolveSchema(schema) {
    if (typeof schema === 'string') return this.schema[schema];
    if (typeof schema === 'function') return schema.call(this);
    return schema;
  }
  parse(data) {
    // TODO Shouldn't this support streaming?
    let parser = sax.parser(true);
    parser.ontext = this.getDelegator(v => v.text);
    parser.onopentag = this.getDelegator(v => v.opentag);
    parser.onclosetag = this.getDelegator(v => v.closetag);
    parser.onattribute = this.getDelegator(v => v.attribute);
    parser.onend = this.getDelegator(v => v.end);
    parser.write(data).close();
    // TODO Return root context
  }
  resolveURI(name) {
    if (name.charAt(0) === '#') {
      return this.namespace[name.slice(1)];
    }
    throw new Error('This parser doesn\'t support outside URI (Only XPointer ' +
      'Syntax is supported)');
  }
}
