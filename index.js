'use strict'

const { EventEmitter, once } = require('node:events')
const { WebSocket } = require('undici')

async function connect (url) {
  const ws = new WebSocket(url)

  await new Promise((resolve, reject) => {
    ws.onopen = resolve
    ws.onerror = reject
  })

  ws.onopen = undefined
  ws.onerror = undefined

  try {
    return new Client(ws)
    /* c8 ignore next 4 */
  } catch (err) {
    ws.close()
    throw err
  }
}

class Client extends EventEmitter {
  #ws
  #state
  #id = 0
  #pending = new Map()

  constructor (ws) {
    super()

    this.#ws = ws
    this.#state = 'open'

    this.#ws.addEventListener('message', (event) => {
      this.emit('message', event)
      const message = JSON.parse(event.data)
      const { id, result } = message
      const { resolve } = this.#pending.get(id)
      this.#pending.delete(id)
      resolve(result)
    })

    this.#ws.addEventListener('error', (err) => {
      console.log('error', err)
      this.emit('error', err)
    })

    this.#ws.addEventListener('close', () => {
      this.#state = 'closed'
      this.emit('close')
    })
  }

  post (method, params = {}) {
    const id = this.#id++
    const payload = JSON.stringify({ id, method, params })
    this.#ws.send(payload)

    let _resolve
    const promise = new Promise((resolve, reject) => {
      _resolve = resolve
    })
    this.#pending.set(id, { resolve: _resolve })
    return promise
  }

  async close () {
    if (this.#state === 'closed') {
      return
    }

    this.#ws.close()

    await once(this, 'close')
  }
}

module.exports.connect = connect
