const { test } = require('node:test');
const assert = require('node:assert/strict');
const { productImages } = require('../src/utils/product-images');
test('product gallery validates URLs, limits and legacy cover input', () => {
  assert.equal(productImages({}), undefined);
  assert.deepEqual(productImages({imageUrl:'https://example.com/a.jpg'}), ['https://example.com/a.jpg']);
  assert.deepEqual(productImages({imageUrls:[]}), []);
  const images = ['https://example.com/a.jpg','https://example.com/b.jpg'];
  assert.deepEqual(productImages({imageUrls:images}), images);
  for (const value of [null, 'invalid', Array(11).fill(images[0]), [images[0],images[0]],
    ['http://example.com/a.jpg'],['https://'],[''],[42],['https://user:secret@example.com/a.jpg']]) {
    assert.throws(() => productImages({imageUrls:value}), e => e.status === 400 || e.statusCode === 400);
  }
});
