import { describe, it, expect } from 'vitest';
import {
  calculateTotal,
  canMove,
  checkoutSchema,
  usernameSchema,
  safeUrl,
} from '../src/lib/domain';
import { documentSchema } from '../src/lib/cms';
import { isPrivilegedKey } from '../src/lib/key-validation';
describe('commerce and access inputs', () => {
  it('distinguishes browser keys from server-only credentials', () => {
    expect(isPrivilegedKey('sb_publishable_example')).toBe(false);
    expect(isPrivilegedKey('sb_secret_example')).toBe(true);
    const legacy = (role: string) => `header.${btoa(JSON.stringify({ role }))}.signature`;
    expect(isPrivilegedKey(legacy('anon'))).toBe(false);
    expect(isPrivilegedKey(legacy('service_role'))).toBe(true);
    expect(isPrivilegedKey('invalid')).toBe(false);
  });
  it('uses integer cents and includes delivery', () =>
    expect(
      calculateTotal(
        [
          { quantity: 2, unit_price: 1850 },
          { quantity: 1, unit_price: 1200 },
        ],
        300,
      ),
    ).toBe(5200));
  it('rejects negative quantities and fractional prices', () => {
    expect(() => calculateTotal([{ quantity: -1, unit_price: 500 }], 0)).toThrow();
    expect(() => calculateTotal([{ quantity: 1, unit_price: 1.5 }], 0)).toThrow();
  });
  it('only accepts adjacent production stages', () => {
    expect(canMove('Approved', 'UV DTF')).toBe(true);
    expect(canMove('New Order', 'Completed')).toBe(false);
    expect(canMove('invalid', 'New Order')).toBe(false);
  });
  it('normalizes usernames and rejects unsafe identifiers', () => {
    expect(usernameSchema.parse(' Test_Owner ')).toBe('test_owner');
    expect(usernameSchema.safeParse('admin@example.com').success).toBe(false);
  });
  it('rejects script URLs in CMS', () => {
    expect(safeUrl.safeParse('javascript:alert(1)').success).toBe(false);
    expect(safeUrl.safeParse('//evil.example').success).toBe(false);
    expect(safeUrl.parse('/shop')).toBe('/shop');
  });
  it('preserves curated Arabic exactly', () => {
    const text = 'رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي';
    const doc = documentSchema.parse({
      sections: [{ id: 'x', type: 'hero', heading: 'Dua', enabled: true, arabic: text }],
    });
    expect(doc.sections[0].arabic).toBe(text);
  });
  it('rejects duplicate checkout lines', () => {
    const result = checkoutSchema.safeParse({
      request_id: crypto.randomUUID(),
      token: 'a'.repeat(64),
      customer: {
        full_name: 'Test Customer',
        phone: '12345678',
        email: '',
        address: '123 Road',
        city: 'Beirut',
      },
      items: Array(2).fill({ variant_id: '11111111-1111-4111-8111-111111111111', quantity: 1 }),
    });
    expect(result.success).toBe(false);
  });
});
