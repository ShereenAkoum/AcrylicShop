import { describe, it, expect } from 'vitest';
import { resources } from '../src/lib/resources';
const product = {
  title: 'Reminder',
  sku: 'TEST',
  description: '',
  category_id: null,
  design_id: null,
  status: false,
  featured: false,
  bestseller: false,
  new_arrival: false,
  seo_title: null,
  seo_description: null,
};
describe('product dollar input', () => {
  it('converts whole and fractional dollars into checkout minor units', () => {
    for (const [price, cents] of [
      [24, 2400],
      [24.95, 2495],
      [0.29, 29],
      [0, 0],
    ]) {
      expect(resources.products.schema.parse({ ...product, price })).toMatchObject({
        price: cents,
      });
    }
  });
  it('rejects negative prices and fractions of a cent', () => {
    for (const price of [-1, 24.999])
      expect(resources.products.schema.safeParse({ ...product, price }).success).toBe(false);
  });
});
