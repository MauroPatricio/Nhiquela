import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawData = fs.readFileSync(path.join(__dirname, 'dump_subcats.json'), 'utf8');
const subcategoriesData = JSON.parse(rawData);

export default subcategoriesData;
