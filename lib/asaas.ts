// Cliente da API do Asaas (fetch puro, sem SDK).
// Sandbox/produção definidos por ASAAS_BASE_URL; chave em ASAAS_API_KEY (só server-side).

export class AsaasError extends Error {
  status: number
  body: string
  constructor(status: number, body: string) {
    super(`Asaas ${status}: ${body.slice(0, 300)}`)
    this.name = 'AsaasError'
    this.status = status
    this.body = body
  }
}

async function asaasFetch(path: string, init?: RequestInit): Promise<any> {
  const base = process.env.ASAAS_BASE_URL
  const key = process.env.ASAAS_API_KEY
  if (!base || !key) throw new Error('ASAAS_BASE_URL/ASAAS_API_KEY não configurados')

  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      access_token: key,
      'User-Agent': 'academy-valeriote',
      ...init?.headers,
    },
    cache: 'no-store',
  })

  const text = await res.text()
  if (!res.ok) throw new AsaasError(res.status, text)
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export interface AsaasCustomer {
  id: string
  name: string
  email: string
  cpfCnpj: string
}

// Busca customer por CPF; se não existir, cria.
// Telefone inválido não derruba a inscrição: tenta com ele e, se o Asaas
// recusar (invalid_mobilePhone), cria o customer sem telefone.
export async function findOrCreateCustomer(input: {
  name: string
  email: string
  cpf: string
  phone?: string
}): Promise<AsaasCustomer> {
  const cpf = input.cpf.replace(/\D/g, '')
  const found = await asaasFetch(`/customers?cpfCnpj=${cpf}&limit=1`)
  if (found?.data?.length) return found.data[0]

  const base = {
    name: input.name,
    email: input.email,
    cpfCnpj: cpf,
    notificationDisabled: false,
  }
  const phone = input.phone?.replace(/\D/g, '')

  try {
    return await asaasFetch('/customers', {
      method: 'POST',
      body: JSON.stringify({ ...base, mobilePhone: phone || undefined }),
    })
  } catch (error) {
    if (
      phone &&
      error instanceof AsaasError &&
      error.status === 400 &&
      error.body.includes('mobilePhone')
    ) {
      return asaasFetch('/customers', { method: 'POST', body: JSON.stringify(base) })
    }
    throw error
  }
}

export interface AsaasPayment {
  id: string
  status: string
  invoiceUrl: string
  value: number
  dueDate?: string
  bankSlipUrl?: string
  externalReference?: string
}

// Cria a cobrança. externalReference = Registration.id (amarração webhook → inscrição).
export async function createPayment(input: {
  customerId: string
  valueCents: number
  description: string
  externalReference: string
  billingType?: string
}): Promise<AsaasPayment> {
  const dueDays = Number(process.env.ASAAS_DUE_DAYS || 3)
  const dueDate = new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  return asaasFetch('/payments', {
    method: 'POST',
    body: JSON.stringify({
      customer: input.customerId,
      billingType: input.billingType || process.env.ASAAS_BILLING_TYPE || 'UNDEFINED',
      value: input.valueCents / 100,
      dueDate,
      description: input.description,
      externalReference: input.externalReference,
    }),
  })
}

export async function getPayment(paymentId: string): Promise<AsaasPayment> {
  return asaasFetch(`/payments/${paymentId}`)
}

// QR Code PIX da cobrança (checkout transparente na página de obrigado da LP).
export interface AsaasPixQrCode {
  encodedImage: string // PNG base64
  payload: string // copia e cola
  expirationDate?: string
}
export async function getPixQrCode(paymentId: string): Promise<AsaasPixQrCode> {
  return asaasFetch(`/payments/${paymentId}/pixQrCode`)
}

// Linha digitável do boleto (idem).
export async function getIdentificationField(
  paymentId: string
): Promise<{ identificationField: string }> {
  return asaasFetch(`/payments/${paymentId}/identificationField`)
}

// Paga a cobrança com cartão de crédito (checkout transparente do modal da LP).
// Os dados do cartão só transitam: nada é gravado em banco nem em log.
export async function payWithCreditCard(
  paymentId: string,
  input: {
    creditCard: {
      holderName: string
      number: string
      expiryMonth: string
      expiryYear: string
      ccv: string
    }
    holderInfo: {
      name: string
      email: string
      cpfCnpj: string
      postalCode: string
      addressNumber: string
      phone?: string
    }
    remoteIp?: string
  }
): Promise<AsaasPayment> {
  return asaasFetch(`/payments/${paymentId}/payWithCreditCard`, {
    method: 'POST',
    body: JSON.stringify({
      creditCard: input.creditCard,
      creditCardHolderInfo: input.holderInfo,
      remoteIp: input.remoteIp,
    }),
  })
}

// Cobranças confirmadas a partir de uma data (YYYY-MM-DD) — usado pela reconciliação diária.
export async function listConfirmedPayments(sinceDate: string): Promise<AsaasPayment[]> {
  const out: AsaasPayment[] = []
  for (const status of ['CONFIRMED', 'RECEIVED']) {
    let offset = 0
    for (;;) {
      const page = await asaasFetch(
        // atenção: o filtro de data do Asaas é dateCreatedGe (dateCreated[ge] retorna 0)
        `/payments?status=${status}&dateCreatedGe=${sinceDate}&limit=100&offset=${offset}`
      )
      out.push(...(page?.data || []))
      if (!page?.hasMore) break
      offset += 100
    }
  }
  return out
}
