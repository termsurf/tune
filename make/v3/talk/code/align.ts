import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'

const csvPath = path.resolve(__dirname, '..', '..', '..', 'tune.csv')
const raw = fs.readFileSync(csvPath, 'utf-8')

const records: string[][] = parse(raw, {
  skip_empty_lines: true,
  relax_column_count: true,
})

const colCount = records[0].length
const widths: number[] = new Array(colCount).fill(0)

for (const row of records) {
  for (let i = 0; i < colCount; i++) {
    const val = row[i] || ''
    if (val.length > widths[i]) {
      widths[i] = val.length
    }
  }
}

const lines: string[] = []
for (const row of records) {
  const cols: string[] = []
  for (let i = 0; i < colCount; i++) {
    const val = row[i] || ''
    cols.push(val.padEnd(widths[i]))
  }
  lines.push(cols.join('\t'))
}

const tsvPath = path.resolve(__dirname, '..', '..', '..', 'tune.tsv')
fs.writeFileSync(tsvPath, lines.join('\n') + '\n')

console.log(`Wrote ${records.length} rows to ${tsvPath}`)
