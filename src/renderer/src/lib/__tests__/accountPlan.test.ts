import { describe, expect, it } from 'vitest'
import { getAccountPlan } from '../accountPlan'

describe('getAccountPlan', () => {
  it('should use the Antigravity plan reported with the usage', () => {
    expect(getAccountPlan('antigravity', {}, { plan: 'Google AI Pro', usage: [] })).toBe('Google AI Pro')
    expect(getAccountPlan('antigravity', {}, { usage: [] })).toBeUndefined()
  })

  it.each([
    ['free', 'Free'],
    ['plus', 'Plus'],
    ['prolite', 'Pro 100'],
    ['pro', 'Pro 200'],
    ['promax', 'Pro 300'],
    ['team', 'Business'],
    ['some_new_plan', 'some_new_plan']
  ])('should label the Codex plan %s', (planType, expected) => {
    expect(getAccountPlan('codex', { planType: 'free' }, { usage: { plan_type: planType } })).toBe(expected)
  })

  it('should fall back to the stored Codex plan without usage', () => {
    expect(getAccountPlan('codex', { planType: 'plus' }, { usage: null })).toBe('Plus')
    expect(getAccountPlan('codex', { planType: 'unknown' }, undefined)).toBeUndefined()
  })

  it.each([
    ['individual-goat', 'GOAT'],
    ['individual-max', 'Max 10x'],
    ['individual-ultra', 'Max 20x'],
    ['teams-pro', 'Teams'],
    ['enterprise-custom', 'enterprise-custom']
  ])('should label the Command Code plan %s', (planId, expected) => {
    expect(getAccountPlan('commandCode', {}, { usage: { limits: [], credits: { planId } } })).toBe(expected)
  })

  it('should use the Claude plan and ignore providers without plans', () => {
    expect(getAccountPlan('claude', {}, { usage: { plan: 'Max 5x', limits: [] } })).toBe('Max 5x')
    expect(getAccountPlan('claude', {}, { usage: { limits: [] } })).toBeUndefined()
    expect(getAccountPlan('zaiCoding', {}, { usage: { plan: 'x' } })).toBeUndefined()
  })
})
