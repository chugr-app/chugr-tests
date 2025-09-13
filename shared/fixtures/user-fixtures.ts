/**
 * User fixtures with improved test isolation
 */

export interface UserFixture {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  birthDate: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  bio?: string;
  location?: string;
  interests?: string[];
}

/**
 * Generate unique user data to avoid conflicts between tests
 */
export const generateUniqueUser = (overrides: Partial<UserFixture> = {}): UserFixture => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  const uniqueId = `${timestamp}${random}`;

  return {
    firstName: `Test${uniqueId}`,
    lastName: `User${uniqueId}`,
    email: `test${uniqueId}@example.com`,
    password: 'TestPassword123!',
    birthDate: '1995-01-01',
    gender: 'MALE',
    bio: `Test bio for user ${uniqueId}`,
    location: 'Test City',
    interests: ['music', 'sports'],
    ...overrides,
  };
};

/**
 * Generate multiple unique users
 */
export const generateUniqueUsers = (count: number, overrides: Partial<UserFixture> = {}): UserFixture[] => {
  return Array.from({ length: count }, (_, index) => 
    generateUniqueUser({
      ...overrides,
      firstName: `${overrides.firstName || 'Test'}${Date.now()}${index}`,
      email: `test${Date.now()}${index}@example.com`,
    })
  );
};

/**
 * Generate users with specific characteristics for matching tests
 */
export const generateMatchingUsers = () => {
  const baseTimestamp = Date.now();
  
  return {
    user1: generateUniqueUser({
      firstName: `Match1${baseTimestamp}`,
      email: `match1${baseTimestamp}@example.com`,
      gender: 'FEMALE',
      birthDate: '1990-01-01',
      interests: ['music', 'dancing'],
      location: 'New York',
    }),
    user2: generateUniqueUser({
      firstName: `Match2${baseTimestamp}`,
      email: `match2${baseTimestamp}@example.com`,
      gender: 'MALE',
      birthDate: '1992-01-01',
      interests: ['music', 'sports'],
      location: 'New York',
    }),
    user3: generateUniqueUser({
      firstName: `Match3${baseTimestamp}`,
      email: `match3${baseTimestamp}@example.com`,
      gender: 'MALE',
      birthDate: '1988-01-01',
      interests: ['reading', 'movies'],
      location: 'Los Angeles',
    }),
  };
};

/**
 * Generate users for performance testing
 */
export const generatePerformanceUsers = (count: number): UserFixture[] => {
  const baseTimestamp = Date.now();
  
  return Array.from({ length: count }, (_, index) => ({
    firstName: `Perf${baseTimestamp}${index}`,
    lastName: `Test${baseTimestamp}${index}`,
    email: `perf${baseTimestamp}${index}@example.com`,
    password: 'TestPassword123!',
    birthDate: '1995-01-01',
    gender: (index % 2 === 0 ? 'MALE' : 'FEMALE') as 'MALE' | 'FEMALE',
    bio: `Performance test user ${index}`,
    location: `Test City ${index % 5}`, // Distribute across 5 cities
    interests: ['music', 'sports', 'reading'].slice(0, (index % 3) + 1),
  }));
};
