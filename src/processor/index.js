export default class Processor {
  // Processes the information parsed by parser.
  constructor(schema, namespacePre) {
    this.namespacePre = namespacePre;
    this.namespace = {};
    this.schema = schema;
  }
  resolveSchema(schema) {
    if (typeof schema === 'string') {
      return this.resolveSchema(this.schema[schema]);
    }
    return schema;
  }
  // We'd have these kind of processing methods -
  // - Process schema, without ID value
  // - Process schema, with ID value
  // - Resolve ID value, with schema. This is identical to resolving
  //   it first then processing the schema.
  // TODO What about sid?
  process(schema, data, options, _id) {
    if (data.id != null && this.namespace[data.id] != null) {
      return this.namespace[data.id];
    }
    let id = _id;
    if (_id == null) id = data.id;
    let schemaResolved = this.resolveSchema(schema);
    let result = schemaResolved.call(this, data, options);
    if (id != null) this.namespace[id] = result;
    return result;
  }
  resolve(schema, id, options) {
    if (id.charAt(0) === '#') return this.resolve(schema, id.slice(1), options);
    if (this.namespace[id] != null) return this.namespace[id];
    return this.process(schema, this.namespacePre[id], options, id);
  }
}
