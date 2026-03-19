export interface IRepository<T> {
  findById(id: string): Promise<T | null>
  findAll(filter?: Partial<T>): Promise<T[]>
  create(data: Partial<T>): Promise<T>
  updateById(id: string, data: Partial<T>): Promise<T | null>
  deleteById(id: string): Promise<boolean>
}

