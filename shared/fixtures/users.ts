import { faker } from '@faker-js/faker';

export const testUsers = {
  // Valid test user
  validUser: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    age: 25,
    location: {
      latitude: 55.7558,
      longitude: 37.6176,
      city: 'Moscow',
      country: 'Russia',
    },
    preferences: {
      ageRange: { min: 21, max: 35 },
      maxDistance: 10,
      interests: ['drinking', 'socializing', 'music'],
    },
    isVerified: true,
    createdAt: new Date('2023-01-01T00:00:00Z'),
    updatedAt: new Date('2023-01-01T00:00:00Z'),
  },

  // User with minimal required fields
  minimalUser: {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'minimal@example.com',
    firstName: 'Minimal',
    lastName: 'User',
    age: 22,
    location: {
      latitude: 55.7558,
      longitude: 37.6176,
      city: 'Moscow',
      country: 'Russia',
    },
    preferences: {
      ageRange: { min: 18, max: 30 },
      maxDistance: 5,
      interests: ['drinking'],
    },
    isVerified: false,
  },

  // User for matching tests
  matchingUser1: {
    id: '550e8400-e29b-41d4-a716-446655440002',
    email: 'matching1@example.com',
    firstName: 'Matching',
    lastName: 'User1',
    age: 28,
    location: {
      latitude: 55.7558,
      longitude: 37.6176,
      city: 'Moscow',
      country: 'Russia',
    },
    preferences: {
      ageRange: { min: 25, max: 35 },
      maxDistance: 15,
      interests: ['drinking', 'sports', 'music'],
    },
    isVerified: true,
  },

  matchingUser2: {
    id: '550e8400-e29b-41d4-a716-446655440003',
    email: 'matching2@example.com',
    firstName: 'Matching',
    lastName: 'User2',
    age: 26,
    location: {
      latitude: 55.7558,
      longitude: 37.6176,
      city: 'Moscow',
      country: 'Russia',
    },
    preferences: {
      ageRange: { min: 20, max: 30 },
      maxDistance: 10,
      interests: ['drinking', 'socializing', 'gaming'],
    },
    isVerified: true,
  },

  // Invalid users for validation tests
  invalidUsers: {
    missingEmail: {
      firstName: 'No',
      lastName: 'Email',
      age: 25,
    },
    invalidEmail: {
      email: 'invalid-email',
      firstName: 'Invalid',
      lastName: 'Email',
      age: 25,
    },
    underage: {
      email: 'underage@example.com',
      firstName: 'Under',
      lastName: 'Age',
      age: 17,
    },
    missingLocation: {
      email: 'nolocation@example.com',
      firstName: 'No',
      lastName: 'Location',
      age: 25,
    },
  },

  // Users for load testing
  loadTestUsers: Array.from({ length: 100 }, (_, index) => ({
    id: `load-test-user-${index}`,
    email: `loadtest${index}@example.com`,
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    age: faker.number.int({ min: 18, max: 65 }),
    location: {
      latitude: faker.location.latitude({ min: 55.5, max: 56.0 }),
      longitude: faker.location.longitude({ min: 37.5, max: 38.0 }),
      city: 'Moscow',
      country: 'Russia',
    },
    preferences: {
      ageRange: { 
        min: faker.number.int({ min: 18, max: 25 }), 
        max: faker.number.int({ min: 26, max: 40 }) 
      },
      maxDistance: faker.number.int({ min: 5, max: 50 }),
      interests: faker.helpers.arrayElements(
        ['drinking', 'socializing', 'music', 'sports', 'gaming', 'travel', 'food'],
        { min: 1, max: 4 }
      ),
    },
    isVerified: faker.datatype.boolean(),
  })),
};

export const userFixtures = {
  // Generate random user data
  generateUser: (overrides: any = {}) => ({
    id: faker.string.uuid(),
    email: faker.internet.email(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    age: faker.number.int({ min: 18, max: 65 }),
    location: {
      latitude: faker.location.latitude({ min: 55.5, max: 56.0 }),
      longitude: faker.location.longitude({ min: 37.5, max: 38.0 }),
      city: 'Moscow',
      country: 'Russia',
    },
    preferences: {
      ageRange: { 
        min: faker.number.int({ min: 18, max: 25 }), 
        max: faker.number.int({ min: 26, max: 40 }) 
      },
      maxDistance: faker.number.int({ min: 5, max: 50 }),
      interests: faker.helpers.arrayElements(
        ['drinking', 'socializing', 'music', 'sports', 'gaming', 'travel', 'food'],
        { min: 1, max: 4 }
      ),
    },
    isVerified: faker.datatype.boolean(),
    ...overrides,
  }),

  // Generate user registration data
  generateRegistrationData: (overrides: any = {}) => ({
    email: faker.internet.email(),
    password: 'TestPassword123!',
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    age: faker.number.int({ min: 18, max: 65 }),
    ...overrides,
  }),

  // Generate user login data
  generateLoginData: (overrides: any = {}) => ({
    email: faker.internet.email(),
    password: 'TestPassword123!',
    ...overrides,
  }),
};
