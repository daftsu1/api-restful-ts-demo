import type { Model } from 'mongoose'
import type { IPaymentRepository } from '@interfaces/IPaymentRepository'
import type { IPayment } from '@interfaces/IPayment'
import type { PaymentDocument } from '@models/Payment.model'

export class PaymentRepository implements IPaymentRepository {
  constructor(private readonly model: Model<PaymentDocument>) {}

  async findById(id: string): Promise<IPayment | null> {
    return this.model.findById(id).lean<IPayment>().exec()
  }

  async findAll(filter?: Partial<IPayment>): Promise<IPayment[]> {
    return this.model.find(filter ?? {}).lean<IPayment[]>().exec()
  }

  async create(data: Partial<IPayment>): Promise<IPayment> {
    const created = await this.model.create(data)
    return created.toJSON() as unknown as IPayment
  }

  async updateById(id: string, data: Partial<IPayment>): Promise<IPayment | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).lean<IPayment>().exec()
  }

  async deleteById(id: string): Promise<boolean> {
    const res = await this.model.deleteOne({ _id: id }).exec()
    return (res.deletedCount ?? 0) > 0
  }

  async findByAppointmentId(appointmentId: string): Promise<IPayment | null> {
    return this.model.findOne({ appointmentId }).lean<IPayment>().exec()
  }

  async findByStripePaymentIntentId(stripePaymentIntentId: string): Promise<IPayment | null> {
    return this.model.findOne({ stripePaymentIntentId }).lean<IPayment>().exec()
  }
}

