// Whitelisted accounts for special roles
// Add accounts here to grant admin or CSR access

type WhitelistedAccount = {
  email: string
  password: string
}

export const ADMIN_ACCOUNTS: WhitelistedAccount[] = [
  { email: 'admin@artx.com', password: 'admin123' },
]

export const CSR_ACCOUNTS: WhitelistedAccount[] = [
  { email: 'support@artx.com', password: 'support123' },
  { email: 'csr@artx.com', password: 'csr123' },
]

export const getRoleFromEmail = (email: string): 'admin' | 'csr' | null => {
  const normalizedEmail = email.toLowerCase()

  if (ADMIN_ACCOUNTS.map(a => a.email.toLowerCase()).includes(normalizedEmail)) {
    return 'admin'
  }

  if (CSR_ACCOUNTS.map(a => a.email.toLowerCase()).includes(normalizedEmail)) {
    return 'csr'
  }

  return null
}

export const getWhitelistedAccount = (email: string): WhitelistedAccount | null => {
  const normalizedEmail = email.toLowerCase()

  const adminAccount = ADMIN_ACCOUNTS.find(a => a.email.toLowerCase() === normalizedEmail)
  if (adminAccount) return adminAccount

  const csrAccount = CSR_ACCOUNTS.find(a => a.email.toLowerCase() === normalizedEmail)
  if (csrAccount) return csrAccount

  return null
}

export const validateWhitelistedCredentials = (email: string, password: string): boolean => {
  const account = getWhitelistedAccount(email)
  if (!account) return true // Not a whitelisted account, skip validation
  return account.password === password
}
