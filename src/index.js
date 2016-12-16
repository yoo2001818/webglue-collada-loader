import Parser from './xml/parser';
import xmlSchema from './xml/schema';

export default function loadCollada(data) {
  let parser = new Parser(xmlSchema, 'initial');
  parser.parse(data);
  console.log(parser.namespace);
}
