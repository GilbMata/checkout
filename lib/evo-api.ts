const EVO_BASE_URL = process.env.EVO_API_URL || 'https://evo-integracao-api.w12app.com.br'
const EVO_API_KEY = process.env.EVO_API_KEY || ''

interface EvoPackage {
  id: string
  name: string
  description: string
  price: number
  duration: number
  durationType: string
}

interface EvoBranch {
  id: string
  name: string
  address: string
}

async function evoFetch(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${EVO_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(EVO_API_KEY).toString('base64')}`,
      ...options.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`EVO API Error: ${response.status}`)
  }

  return response.json()
}

export async function getPackage(packageId: string): Promise<EvoPackage | null> {
  try {
    const data = await evoFetch('/api/v2/membership')
    const memberships = data as any[]
    const packageInfo = memberships.find((m: any) => m.id === packageId)

    if (!packageInfo) return null

    return {
      id: packageInfo.id,
      name: packageInfo.name,
      description: packageInfo.description || '',
      price: parseFloat(packageInfo.price) || 0,
      duration: packageInfo.duration || 1,
      durationType: packageInfo.durationType || 'month',
    }
  } catch (error) {
    console.error('Error fetching package:', error)
    return null
  }
}
// https://evo-integracao-api.w12app.com.br/api/v1/configuration
export async function getBranc(branchId: string): Promise<EvoBranch | null> {
  try {
    const data = await evoFetch('/api/v1/branches')
    const branches = data as any[]
    const branch = branches.find((b: any) => b.id === branchId)

    if (!branch) return null

    return {
      id: branch.id,
      name: branch.name,
      address: branch.address || '',
    }
  } catch (error) {
    console.error('Error fetching branch:', error)
    return null
  }
}

export async function getBranch(branchId: string): Promise<EvoBranch | null> {
  try {
    // https://evo-integracao-api.w12app.com.br/api/v1/configuration
    const data = await evoFetch('/api/v1/configuration')
    const branches = data as any[]
    const branch = branches.find((b: any) => b.id === branchId)

    if (!branch) return null

    return {
      id: branch.id,
      name: branch.name,
      address: branch.address || '',
    }
  } catch (error) {
    console.error('Error fetching branch:', error)
    return null
  }
}


export async function getMembers(membershipId: string,): Promise<EvoPackage | null> {
  try {
    const data = await evoFetch(`/api/v2/membership?idMembership=${membershipId}`)
    console.log("🚀 ~ getMembership ~ data:", data)

    if (!data) return null

    return data
  } catch (error) {
    console.error('Error fetching package:', error)
    return null
  }
}

export async function createProspectEvo(data: {
  curp: string
  name: string
  email: string
  phone?: string
}) {
  return evoFetch('/api/v1/prospects', {
    method: 'POST',
    body: JSON.stringify({
      document: data.curp,
      name: data.name,
      email: data.email,
      phone: data.phone,
    }),
  })
}
