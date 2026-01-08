/**
 * Mock de @faker-js/faker para Jest
 * Evita problemas con ES modules en tests
 */

const faker = {
  locale: 'es',
  name: {
    firstName: () => 'Juan',
    lastName: () => 'Pérez',
    fullName: () => 'Juan Pérez'
  },
  internet: {
    email: () => 'test@example.com',
    userName: () => 'testuser',
    password: () => 'password123'
  },
  address: {
    city: () => 'Madrid',
    street: () => 'Calle Principal',
    zipCode: () => '28001',
    country: () => 'España'
  },
  phone: {
    number: () => '+34 666 123 456'
  },
  company: {
    name: () => 'Test Company',
    catchPhrase: () => 'Test Slogan'
  },
  lorem: {
    sentence: () => 'Test sentence',
    paragraph: () => 'Test paragraph',
    text: () => 'Test text'
  },
  datatype: {
    uuid: () => '550e8400-e29b-41d4-a716-446655440000',
    number: (opts) => opts?.max || 100,
    boolean: () => true,
    datetime: () => new Date()
  },
  helpers: {
    arrayElement: (arr) => arr[0],
    arrayElements: (arr, count) => arr.slice(0, count),
    shuffle: (arr) => arr
  },
  date: {
    past: () => new Date('2024-01-01'),
    future: () => new Date('2026-12-31'),
    recent: () => new Date()
  }
};

module.exports = { faker };
