
import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

describe('Deprecated table usage', () => {
  it('should not find any usage of the "content" table in actions files', async () => {
    const actionFiles = await glob('src/app/**/actions.ts');
    for (const file of actionFiles) {
      const filePath = path.resolve(__dirname, `../../../${file}`);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      expect(fileContent).not.toContain("from('content')");
    }
  });
});
