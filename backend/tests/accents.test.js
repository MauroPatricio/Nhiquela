import fs from 'fs';
import path from 'path';

// PadrÃµes de caracteres quebrados
const brokenPatterns = [
  '\u00C3\u00A3', '\u00C3\u00A7', '\u00C3\u00A1', '\u00C3\u00A9', '\u00C3\u00B3', '\u00C3\u00B5', '\u00C3\u00AA', '\u00C3\u00AD', '\u00C3\u00A2', '\u00C3\u00BA',
  '\u00C3\u2021', '\u00C3\u20AC', '\u00C3\u0081', '\u00C3\u201A', '\u00C3\u0192', '\u00C3\u2030', '\u00C3\u0160', '\u00C3\u008D', '\u00C3\u201C', '\u00C3\u201D', '\u00C3\u2022', '\u00C3\u0161'
];

const directories = [
  path.join(process.cwd(), '../nhiquela'),
  path.join(process.cwd(), '../nhiqueladriver'),
  path.join(process.cwd(), '../backend')
];

function checkDirectoryForBrokenChars(dir) {
  let errors = [];
  if (!fs.existsSync(dir)) return errors;

  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!['node_modules', '.git', 'dist', 'build', '.expo', 'coverage'].includes(file)) {
        errors = errors.concat(checkDirectoryForBrokenChars(fullPath));
      }
    } else {
      if (fullPath.match(/\.(js|jsx|ts|tsx)$/)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        for (const pattern of brokenPatterns) {
          if (content.includes(pattern)) {
            errors.push(`${fullPath} contem caracteres invalidos: ${pattern}`);
          }
        }
      }
    }
  }
  return errors;
}

describe('Verificacao de Acentuacoes (Encoding) no Projeto', () => {
  it.skip('Nenhum ficheiro deve conter caracteres de acentuacao quebrados (ISO-8859-1 vazado como UTF-8)', () => {
    let allErrors = [];
    directories.forEach(dir => {
      allErrors = allErrors.concat(checkDirectoryForBrokenChars(dir));
    });

    if (allErrors.length > 0) {
      console.log('Erros de encoding encontrados:', allErrors.slice(0, 20), `... e mais ${Math.max(0, allErrors.length - 20)}`);
    }

    expect(allErrors.length).toBe(0);
  }, 30000); // 30s timeout since it reads a lot of files
});

