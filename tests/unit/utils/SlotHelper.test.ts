import { SlotHelper } from '@utils/SlotHelper'

describe('SlotHelper (unitario ampliado)', () => {
  describe('getAllSlots', () => {
    const slots = SlotHelper.getAllSlots()

    test('retorna 18 slots', () => {
      expect(slots).toHaveLength(18)
    })

    test('primer slot es 07:00', () => {
      expect(slots[0]).toBe('07:00')
    })

    test('último slot es 17:30', () => {
      expect(slots[slots.length - 1]).toBe('17:30')
    })

    test('no incluye horario de almuerzo (12:00-13:30)', () => {
      const lunch = ['12:00', '12:30', '13:00', '13:30']
      lunch.forEach(s => expect(slots).not.toContain(s))
    })

    test('incluye 14:00 (inicio tarde)', () => {
      expect(slots).toContain('14:00')
    })

    test('todos tienen formato HH:MM', () => {
      slots.forEach(s => expect(s).toMatch(/^\d{2}:\d{2}$/))
    })
  })

  describe('isValidSlot', () => {
    test('07:00 → true', () => expect(SlotHelper.isValidSlot('07:00')).toBe(true))
    test('11:30 → true', () => expect(SlotHelper.isValidSlot('11:30')).toBe(true))
    test('14:00 → true', () => expect(SlotHelper.isValidSlot('14:00')).toBe(true))
    test('17:30 → true', () => expect(SlotHelper.isValidSlot('17:30')).toBe(true))
    test('13:00 → false (almuerzo)', () => expect(SlotHelper.isValidSlot('13:00')).toBe(false))
    test('18:00 → false (fuera)', () => expect(SlotHelper.isValidSlot('18:00')).toBe(false))
    test('06:30 → false (antes de apertura)', () => expect(SlotHelper.isValidSlot('06:30')).toBe(false))
    test('07:15 → false (no alineado a 30 min)', () => expect(SlotHelper.isValidSlot('07:15')).toBe(false))
    test('string vacío → false', () => expect(SlotHelper.isValidSlot('')).toBe(false))
  })

  describe('isDateInPast', () => {
    test('2020-01-01 → true', () => expect(SlotHelper.isDateInPast('2020-01-01')).toBe(true))
    test('2099-12-31 → false', () => expect(SlotHelper.isDateInPast('2099-12-31')).toBe(false))
  })

  describe('getAvailableSlots', () => {
    test('sin ocupados → retorna todos', () => {
      expect(SlotHelper.getAvailableSlots([])).toHaveLength(18)
    })

    test('con ocupados → los filtra', () => {
      const available = SlotHelper.getAvailableSlots(['07:00', '07:30'])
      expect(available).toHaveLength(16)
      expect(available).not.toContain('07:00')
      expect(available).not.toContain('07:30')
    })

    test('todos ocupados → vacío', () => {
      const all = SlotHelper.getAllSlots()
      expect(SlotHelper.getAvailableSlots(all)).toHaveLength(0)
    })
  })
})
