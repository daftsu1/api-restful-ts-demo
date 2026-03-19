import type { Response } from 'express'
import type { IPaymentService } from '@interfaces/IPaymentService'
import { ResponseFactory } from '@utils/ResponseFactory'
import type { AuthenticatedRequest } from '@middlewares/roleGuard.middleware'

export class PaymentController {
  constructor(private readonly paymentService: IPaymentService) {}

  pay = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    const user = req.user!
    const { appointmentId } = req.body as { appointmentId: string }
    const result = await this.paymentService.payWithStripe(appointmentId, user.id)
    return ResponseFactory.success(res, result, result.message, 201)
  }
}
