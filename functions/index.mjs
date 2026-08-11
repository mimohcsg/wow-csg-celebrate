import { onRequest } from 'firebase-functions/v2/https'
import { defineString } from 'firebase-functions/params'
import { createApp } from './app.mjs'
import { setGlobalOptions } from 'firebase-functions/v2'

setGlobalOptions({
  region: 'asia-south1',
  memory: '512MiB',
  timeoutSeconds: 120,
  maxInstances: 5,
})

const adminEmails = defineString('ADMIN_EMAILS', { default: '' })

const app = createApp()

export const api = onRequest(
  {
    cors: true,
    invoker: 'public',
  },
  (req, res) => {
    process.env.ADMIN_EMAILS = adminEmails.value()
    return app(req, res)
  },
)
