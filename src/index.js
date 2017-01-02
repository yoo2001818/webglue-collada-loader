import Parser from './xml/parser';
import xmlSchema from './xml/schema';

import processorSchema from './processor/schema';
import Processor from './processor';

export default function loadCollada(data) {
  let parser = new Parser(xmlSchema, 'initial');
  let result = parser.parse(data);
  // Process the data.
  let processor = new Processor(processorSchema, parser.namespace);
  return processor.process('document', result);
}
