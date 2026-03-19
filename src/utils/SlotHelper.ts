export class SlotHelper {
  private static readonly MORNING_START = '07:00'
  private static readonly MORNING_END = '11:30'
  private static readonly AFTERNOON_START = '14:00'
  private static readonly AFTERNOON_END = '17:30'
  private static readonly SLOT_DURATION = 30

  static getAllSlots(): string[] {
    const toMinutes = (hhmm: string): number => {
      const [hh, mm] = hhmm.split(':').map(Number)
      return hh * 60 + mm
    }
    const toHHMM = (minutes: number): string => {
      const hh = Math.floor(minutes / 60)
      const mm = minutes % 60
      return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
    }

    const buildRange = (start: string, end: string): string[] => {
      const startMin = toMinutes(start)
      const endMin = toMinutes(end)
      const slots: string[] = []
      for (let t = startMin; t <= endMin; t += SlotHelper.SLOT_DURATION) {
        slots.push(toHHMM(t))
      }
      return slots
    }

    return [
      ...buildRange(SlotHelper.MORNING_START, SlotHelper.MORNING_END),
      ...buildRange(SlotHelper.AFTERNOON_START, SlotHelper.AFTERNOON_END)
    ]
  }

  static isValidSlot(slot: string): boolean {
    return this.getAllSlots().includes(slot)
  }

  static isDateInPast(date: string): boolean {
    const [y, m, d] = date.split('-').map(Number)
    const target = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0))
    const now = new Date()
    const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0))
    return target.getTime() < todayUtc.getTime()
  }

  static getAvailableSlots(occupiedSlots: string[]): string[] {
    return this.getAllSlots().filter(s => !occupiedSlots.includes(s))
  }
}

