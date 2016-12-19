import fs from 'fs';
import loadCollada from '../src';

loadCollada(fs.readFileSync('./geom/multiMaterial.dae', 'utf-8'));
