import axios from 'axios'
import mockServer from './mockServer'

const client = axios.create({ baseURL: '/api' })

// Attach mock server when running in dev without backend
mockServer.intercept(client)

export const api = {
  auth: {
    login: async (email: string, password: string) => {
      const r = await (client as any).post('/auth/login', { email, password })
      return r.data
    },
    register: async (payload: any) => {
      const r = await (client as any).post('/auth/register', payload)
      return r.data
    },
  },
  marketplace: {
    list: async (params?: any) => {
      const r = await (client as any).get('/marketplace', { params })
      return r.data
    },
    getListing: async (id: string) => {
      const r = await (client as any).get(`/listing/${id}`)
      return r.data
    },
  },
  artist: {
    get: async (id: string) => {
      const r = await (client as any).get(`/artists/${id}`)
      return r.data
    },
  },
  commissions: {
    list: async () => {
      const r = await (client as any).get('/commissions')
      return r.data
    },
  },
}