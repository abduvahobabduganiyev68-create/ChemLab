import { openDatabase } from './database.js'
import { createApiServer } from './http.js'
import { createSyncCoordinator, startSyncScheduler, syncRhea } from './sync.js'

const db = openDatabase()
const sync = createSyncCoordinator(() => syncRhea(db))
const server = createApiServer(db, { sync })
const stopScheduler = startSyncScheduler(db, { sync })
const port = Number(process.env.API_PORT) || 3001

server.listen(port, '127.0.0.1', () => {
  console.log(`ChemLab API listening on http://127.0.0.1:${port}`)
})

function shutdown() {
  stopScheduler()
  server.close(() => {
    db.close()
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
