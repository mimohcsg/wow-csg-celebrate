import { onRequest } from 'firebase-functions/v2/https'
import { setGlobalOptions } from 'firebase-functions/v2'
import { createApp } from './app.mjs'

setGlobalOptions({
  region: 'asia-south1',
  memory: '512MiB',
  timeoutSeconds: 120,
  maxInstances: 5,
})

const app = createApp()

export const api = onRequest(
  {
    cors: true,
    invoker: 'public',
  },
  app,
)
