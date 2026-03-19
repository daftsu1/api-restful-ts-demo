import { PaymentController } from '@modules/payments/payment.controller'
import type { IPaymentService } from '@interfaces/IPaymentService'

function mockRes() {
  const res: any = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

const payResult = {
  payment: { _id: 'p1', appointmentId: 'a1', status: 'COMPLETED' },
  message: 'Pago registrado; cita en estado PAID'
}

describe('PaymentController (unitario)', () => {
  test('pay → llama payWithStripe y responde 201', async () => {
    const svc: IPaymentService = { payWithStripe: jest.fn().mockResolvedValue(payResult) }
    const ctrl = new PaymentController(svc)
    const req = { user: { id: 'u1', role: 'patient' }, body: { appointmentId: 'a1' } } as any
    const res = mockRes()
    await ctrl.pay(req, res)
    expect(svc.payWithStripe).toHaveBeenCalledWith('a1', 'u1')
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: payResult,
      message: payResult.message
    }))
  })
})
