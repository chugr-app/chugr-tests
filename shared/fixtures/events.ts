import { faker } from '@faker-js/faker';

export const testEvents = {
  // Valid test event
  validEvent: {
    id: 'event-550e8400-e29b-41d4-a716-446655440000',
    title: 'Test Drinking Event',
    description: 'A test event for drinking and socializing',
    location: {
      latitude: 55.7558,
      longitude: 37.6176,
      address: 'Test Address, Moscow, Russia',
      venue: 'Test Bar',
    },
    dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    maxParticipants: 10,
    currentParticipants: 1,
    organizerId: '550e8400-e29b-41d4-a716-446655440000',
    category: 'drinking',
    tags: ['social', 'drinking', 'fun'],
    isPublic: true,
    requiresApproval: false,
    createdAt: new Date('2023-01-01T00:00:00Z'),
    updatedAt: new Date('2023-01-01T00:00:00Z'),
  },

  // Event with minimal required fields
  minimalEvent: {
    id: 'event-550e8400-e29b-41d4-a716-446655440001',
    title: 'Minimal Event',
    description: 'Minimal event description',
    location: {
      latitude: 55.7558,
      longitude: 37.6176,
      address: 'Minimal Address, Moscow',
    },
    dateTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
    maxParticipants: 5,
    currentParticipants: 0,
    organizerId: '550e8400-e29b-41d4-a716-446655440001',
    category: 'social',
    isPublic: true,
  },

  // Event for matching tests
  matchingEvent: {
    id: 'event-550e8400-e29b-41d4-a716-446655440002',
    title: 'Matching Test Event',
    description: 'Event for testing matching algorithm',
    location: {
      latitude: 55.7558,
      longitude: 37.6176,
      address: 'Matching Address, Moscow',
      venue: 'Matching Bar',
    },
    dateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // In 3 days
    maxParticipants: 8,
    currentParticipants: 2,
    organizerId: '550e8400-e29b-41d4-a716-446655440002',
    category: 'drinking',
    tags: ['matching', 'test', 'social'],
    isPublic: true,
    requiresApproval: true,
  },

  // Invalid events for validation tests
  invalidEvents: {
    missingTitle: {
      description: 'Event without title',
      location: {
        latitude: 55.7558,
        longitude: 37.6176,
        address: 'Test Address',
      },
      dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      maxParticipants: 10,
      organizerId: '550e8400-e29b-41d4-a716-446655440000',
    },
    pastDate: {
      title: 'Past Event',
      description: 'Event in the past',
      location: {
        latitude: 55.7558,
        longitude: 37.6176,
        address: 'Test Address',
      },
      dateTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      maxParticipants: 10,
      organizerId: '550e8400-e29b-41d4-a716-446655440000',
    },
    invalidLocation: {
      title: 'Invalid Location Event',
      description: 'Event with invalid location',
      location: {
        latitude: 999, // Invalid latitude
        longitude: 999, // Invalid longitude
        address: 'Invalid Address',
      },
      dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      maxParticipants: 10,
      organizerId: '550e8400-e29b-41d4-a716-446655440000',
    },
    negativeParticipants: {
      title: 'Negative Participants Event',
      description: 'Event with negative max participants',
      location: {
        latitude: 55.7558,
        longitude: 37.6176,
        address: 'Test Address',
      },
      dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      maxParticipants: -5, // Invalid negative value
      organizerId: '550e8400-e29b-41d4-a716-446655440000',
    },
  },

  // Events for load testing
  loadTestEvents: Array.from({ length: 50 }, (_, index) => ({
    id: `load-test-event-${index}`,
    title: faker.lorem.words(3),
    description: faker.lorem.sentence(),
    location: {
      latitude: faker.location.latitude({ min: 55.5, max: 56.0 }),
      longitude: faker.location.longitude({ min: 37.5, max: 38.0 }),
      address: faker.location.streetAddress(),
      venue: faker.company.name(),
    },
    dateTime: faker.date.future(),
    maxParticipants: faker.number.int({ min: 2, max: 20 }),
    currentParticipants: faker.number.int({ min: 0, max: 5 }),
    organizerId: `load-test-user-${faker.number.int({ min: 0, max: 99 })}`,
    category: faker.helpers.arrayElement(['drinking', 'social', 'sports', 'music', 'food']),
    tags: faker.helpers.arrayElements(
      ['social', 'drinking', 'fun', 'music', 'sports', 'food', 'travel'],
      { min: 1, max: 3 }
    ),
    isPublic: faker.datatype.boolean(),
    requiresApproval: faker.datatype.boolean(),
  })),
};

export const eventFixtures = {
  // Generate random event data
  generateEvent: (overrides: any = {}) => ({
    id: faker.string.uuid(),
    title: faker.lorem.words(3),
    description: faker.lorem.sentence(),
    location: {
      latitude: faker.location.latitude({ min: 55.5, max: 56.0 }),
      longitude: faker.location.longitude({ min: 37.5, max: 38.0 }),
      address: faker.location.streetAddress(),
      venue: faker.company.name(),
    },
    dateTime: faker.date.future(),
    maxParticipants: faker.number.int({ min: 2, max: 20 }),
    currentParticipants: faker.number.int({ min: 0, max: 5 }),
    organizerId: faker.string.uuid(),
    category: faker.helpers.arrayElement(['drinking', 'social', 'sports', 'music', 'food']),
    tags: faker.helpers.arrayElements(
      ['social', 'drinking', 'fun', 'music', 'sports', 'food', 'travel'],
      { min: 1, max: 3 }
    ),
    isPublic: faker.datatype.boolean(),
    requiresApproval: faker.datatype.boolean(),
    ...overrides,
  }),

  // Generate event creation data
  generateEventCreationData: (overrides: any = {}) => ({
    title: faker.lorem.words(3),
    description: faker.lorem.sentence(),
    location: {
      latitude: faker.location.latitude({ min: 55.5, max: 56.0 }),
      longitude: faker.location.longitude({ min: 37.5, max: 38.0 }),
      address: faker.location.streetAddress(),
      venue: faker.company.name(),
    },
    dateTime: faker.date.future(),
    maxParticipants: faker.number.int({ min: 2, max: 20 }),
    category: faker.helpers.arrayElement(['drinking', 'social', 'sports', 'music', 'food']),
    tags: faker.helpers.arrayElements(
      ['social', 'drinking', 'fun', 'music', 'sports', 'food', 'travel'],
      { min: 1, max: 3 }
    ),
    isPublic: faker.datatype.boolean(),
    requiresApproval: faker.datatype.boolean(),
    ...overrides,
  }),

  // Generate event update data
  generateEventUpdateData: (overrides: any = {}) => ({
    title: faker.lorem.words(3),
    description: faker.lorem.sentence(),
    maxParticipants: faker.number.int({ min: 2, max: 20 }),
    ...overrides,
  }),
};
