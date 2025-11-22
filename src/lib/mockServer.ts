import { AxiosInstance } from 'axios'

const mockData = {
  users: [
    { id: 'u1', name: 'Alex Artist', email: 'alex@artx.com', role: 'artist' },
    { id: 'u2', name: 'Bea Buyer', email: 'bea@artx.com', role: 'buyer' },
  ],
  listings: [
    { id: 'l1', title: 'Sunrise', price: 250, artistId: 'u1', image: '', status: 'for-sale' },
    { id: 'l2', title: 'Cityscape', price: 450, artistId: 'u1', image: '', status: 'for-sale' },
  ],
}

const intercept = (client: AxiosInstance) => {
  ;(client as any).get = async (url: string, opts?: any) => {
    await new Promise((r) => setTimeout(r, 150))
    if (url === '/marketplace') return { data: mockData.listings }
    if (url.startsWith('/artists/')) {
      const id = url.split('/').pop()!
      return { data: mockData.users.find((u) => u.id === id) }
    }
    if (url === '/commissions') return { data: [] }
    return { data: {} }
  }

  ;(client as any).post = async (url: string, body: any) => {
    await new Promise((r) => setTimeout(r, 150))
    if (url === '/auth/login') {
      const u = mockData.users.find((x) => x.email === body.email)
      if (!u) throw { response: { status: 401, data: { message: 'Invalid credentials' } } }
      return { data: { user: u, token: 'mock-token' } }
    }
    if (url === '/auth/register') {
      const newUser = { id: 'u' + (mockData.users.length + 1), ...body }
      mockData.users.push(newUser)
      return { data: { user: newUser, token: 'mock-token' } }
    }
    return { data: {} }
  }
}

export default { intercept }