
const fs = require('fs')
const { marked } = require('marked')

const template = fs.readFileSync('script/book.html.template', 'utf-8')
const html = marked(fs.readFileSync('script/book.md.template', 'utf-8'))
  .split(/\n/)
  .map(x => `  ${x}`)
  .join('\n')

const text = template.replace(/\{\{ html \}\}/, html.trim())

fs.writeFileSync('tmp/book.html', text)
