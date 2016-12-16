import fs from 'fs';
import loadCollada from '../src';

loadCollada(fs.readFileSync('./geom/cat.dae', 'utf-8'));
