import { nanoid } from 'https://deno.land/x/nanoid@v3.0.0/async.ts'
import MemoryStore from './stores/MemoryStore.js'
import CookieStore from './stores/CookieStore.js'

export default class Session {
  constructor (store = null) {
    this.store = store || new MemoryStore
  }

  initMiddleware() {
    return async (ctx, next) => {

      if (this.store instanceof CookieStore) {
        this.store.data = ctx.cookies.get('session_data') 
          ? JSON.parse(ctx.cookies.get('session_data')) 
          : {}

        this.store.data['_flash'] = {}

        ctx.session = this
      } else {
        const sid = ctx.cookies.get('session')

        if (sid && await this.sessionExists(sid)) {
          ctx.session = this.getSession(sid)
        } else {
          ctx.session = await this.createSession()
          ctx.cookies.set('session', ctx.session.id)
        }

        ctx.session.set('_flash', {})
      }

      await next()

      if (this.store instanceof CookieStore) {
        ctx.cookies.set('session_data', JSON.stringify(this.store.data))
      }
    }
  }

  async sessionExists(id) {
    return await this.store.sessionExists(id)
  }

  async createSession() {
    this.id = await nanoid()
    await this.store.createSession(this.id)
    return this
  }

  getSession(id) {
    this.id = id
    return this
  }

  async deleteSession(oakContext) {
    this.store instanceof CookieStore ? oakContext.cookies.delete('session_data') : await this.store.deleteSession(oakContext.cookies.get('session'))
  }

  async get(key) {
    const session = this.store instanceof CookieStore 
      ? this.store.data 
      : await this.store.getSessionById(this.id)

    if (session.hasOwnProperty(key)) {
      return session[key]
    } else {
      return session['_flash'][key]
    }
  }

  async set(key, value) {
    const session = this.store instanceof CookieStore 
      ? this.store.data 
      : await this.store.getSessionById(this.id)

    session[key] = value

    await this.store instanceof CookieStore 
      ? this.store.data = session 
      : this.store.persistSessionData(this.id, session)
  }

  async flash(key, value) {
    const session = this.store instanceof CookieStore 
      ? this.store.data 
      : await this.store.getSessionById(this.id)

    session['_flash'][key] = value

    await this.store instanceof CookieStore 
      ? this.store.data = session 
      : this.store.persistSessionData(this.id, session)
  }

  async has(key) {
    const session = this.store instanceof CookieStore 
      ? this.store.data 
      : await this.store.getSessionById(this.id)

    if (session.hasOwnProperty(key)) {
      return true
    } else {
      if (session['_flash'].hasOwnProperty(key)) {
        return true
      } else {
        return false
      }
    }
  }
}