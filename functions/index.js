const { onRequest } = require('firebase-functions/v2/https')
const { setGlobalOptions } = require('firebase-functions/v2')
const { createApp } = require('./app')

setGlobalOptions({
  region: 'asia-south1',
  memory: '512MiB',
  timeoutSeconds: 120,
  maxInstances: 5,
})

const app = createApp()

exports.api = onRequest(
  {
    cors: true,
    invoker: 'public',
  },
  app,
)
