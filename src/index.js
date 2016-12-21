import Parser from './xml/parser';
import xmlSchema from './xml/schema';

const SEMANTIC_ATTRIBUTE_TABLE = {
  POSITION: 'aPosition',
  NORMAL: 'aNormal',
  TEXCOORD: 'aTexCoord',
  TANGENT: 'aTangent',
  COLOR: 'aColor'
};

export default function loadCollada(data) {
  let parser = new Parser(xmlSchema, 'initial');
  let result = parser.parse(data);
  result.geometries.forEach(geometry => {
    // Change geometry to webglue format
    console.log(geometry);
    let polylist = geometry.polylist;
    // 1. Read
  });
}
