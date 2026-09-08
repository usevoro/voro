import { mkdir, writeFile } from 'node:fs/promises';
import { format } from 'prettier';
import { z } from 'zod';
import { reviewSchema, reviewExportSchema } from '../src/shared/contracts';

await mkdir('docs/schemas', { recursive: true });
for (const [name, schema] of [
  ['review-v1', reviewSchema],
  ['review-export-v1', reviewExportSchema],
] as const) {
  await writeFile(
    `docs/schemas/${name}.schema.json`,
    await format(JSON.stringify({ ...z.toJSONSchema(schema), title: name }), {
      parser: 'json',
      printWidth: 100,
    }),
  );
}
