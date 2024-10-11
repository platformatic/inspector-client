'use strict'

const { test, after } = require('node:test')
const { deepStrictEqual, strictEqual } = require('node:assert')
const inspector = require('node:inspector')
const { connect } = require('./index.js')

inspector.open()

after(() => inspector.close())

test('connects and close (twice and close (twice))', async (t) => {
  const client = await connect(inspector.url())
  t.after(() => client.close())

  await client.close()
})

test('evaluates', async (t) => {
  const client = await connect(inspector.url())
  t.after(() => client.close())

  const result = await client.post('Runtime.evaluate', {
    expression: '2 + 2',
    returnByValue: true,
    generatePreview: true
  })

  deepStrictEqual(result, {
    result: {
      description: '4',
      type: 'number',
      value: 4
    }
  })

  const result2 = await client.post('Runtime.evaluate', {
    expression: 'throw new Error("test")',
    returnByValue: true,
    generatePreview: true
  })

  strictEqual(result2.result.className, 'Error')
})
