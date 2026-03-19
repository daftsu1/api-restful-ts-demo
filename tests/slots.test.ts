import { SlotHelper } from '@utils/SlotHelper'

describe('SlotHelper', () => {
  test('isValidSlot(07:00) → true', () => {
    expect(SlotHelper.isValidSlot('07:00')).toBe(true)
  })

  test('isValidSlot(13:00) → false (almuerzo)', () => {
    expect(SlotHelper.isValidSlot('13:00')).toBe(false)
  })

  test('isValidSlot(18:00) → false (fuera de horario)', () => {
    expect(SlotHelper.isValidSlot('18:00')).toBe(false)
  })

  test('isDateInPast(2020-01-01) → true', () => {
    expect(SlotHelper.isDateInPast('2020-01-01')).toBe(true)
  })

  test('getAllSlots().length → 18', () => {
    expect(SlotHelper.getAllSlots()).toHaveLength(18)
  })
})

