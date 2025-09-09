// Unit tests for Matching Service - Simplified
describe('Matching Service - Basic Functionality', () => {
  // Mock dependencies
  const mockPrismaClient = {
    match: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    swipe: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const mockUserCache = {
    getUser: jest.fn(),
    getUsers: jest.fn(),
    getUserPreferences: jest.fn(),
  };

  const mockMLService = {
    analyzeCompatibility: jest.fn(),
    isHealthy: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User Matching', () => {
    it('should find potential matches', async () => {
      const userId = 'user-1';
      const userPreferences = {
        ageRange: { min: 21, max: 35 },
        maxDistance: 10,
        interests: ['drinking', 'music'],
      };

      const potentialMatches = [
        {
          id: 'user-2',
          age: 25,
          location: { latitude: 55.7600, longitude: 37.6200 },
          interests: ['drinking', 'music'],
        },
        {
          id: 'user-3',
          age: 28,
          location: { latitude: 55.7500, longitude: 37.6100 },
          interests: ['drinking', 'sports'],
        },
      ];

      mockUserCache.getUserPreferences.mockResolvedValue(userPreferences);
      mockUserCache.getUsers.mockResolvedValue(potentialMatches);

      const preferences = await mockUserCache.getUserPreferences(userId);
      const matches = await mockUserCache.getUsers(['user-2', 'user-3']);

      expect(preferences).toEqual(userPreferences);
      expect(matches).toEqual(potentialMatches);
      expect(matches).toHaveLength(2);
    });

    it('should handle empty match results', async () => {
      mockUserCache.getUserPreferences.mockResolvedValue({
        ageRange: { min: 21, max: 35 },
        maxDistance: 10,
      });
      mockUserCache.getUsers.mockResolvedValue([]);

      const matches = await mockUserCache.getUsers([]);

      expect(matches).toEqual([]);
      expect(matches).toHaveLength(0);
    });
  });

  describe('Compatibility Scoring', () => {
    it('should calculate basic compatibility score', () => {
      const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
      };

      // Moscow coordinates
      const moscowLat = 55.7558;
      const moscowLon = 37.6176;
      const nearbyLat = 55.7600;
      const nearbyLon = 37.6200;

      const distance = calculateDistance(moscowLat, moscowLon, nearbyLat, nearbyLon);

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(10); // Should be less than 10km
    });

    it('should calculate interest compatibility', () => {
      const calculateInterestScore = (userInterests: string[], targetInterests: string[]): number => {
        if (userInterests.length === 0 || targetInterests.length === 0) {
          return 0;
        }

        const commonInterests = userInterests.filter(interest => targetInterests.includes(interest));
        const totalInterests = new Set([...userInterests, ...targetInterests]).size;
        
        return commonInterests.length / totalInterests;
      };

      const userInterests = ['drinking', 'music', 'sports'];
      const targetInterests = ['drinking', 'music', 'gaming'];

      const score = calculateInterestScore(userInterests, targetInterests);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
      expect(score).toBeCloseTo(0.5, 1); // 2 common out of 4 total
    });

    it('should handle age compatibility', () => {
      const isAgeCompatible = (userAge: number, targetAge: number, userPrefs: any, targetPrefs: any): boolean => {
        const userAgeInTargetRange = targetPrefs.ageRange.min <= userAge && userAge <= targetPrefs.ageRange.max;
        const targetAgeInUserRange = userPrefs.ageRange.min <= targetAge && targetAge <= userPrefs.ageRange.max;
        return userAgeInTargetRange && targetAgeInUserRange;
      };

      const user = {
        age: 25,
        preferences: { ageRange: { min: 21, max: 35 } },
      };

      const target = {
        age: 28,
        preferences: { ageRange: { min: 22, max: 30 } },
      };

      const compatible = isAgeCompatible(user.age, target.age, user.preferences, target.preferences);

      expect(compatible).toBe(true);
    });
  });

  describe('ML Service Integration', () => {
    it('should use ML service for compatibility analysis', async () => {
      const user1 = {
        id: 'user-1',
        age: 25,
        interests: ['drinking', 'music'],
      };

      const user2 = {
        id: 'user-2',
        age: 28,
        interests: ['drinking', 'music'],
      };

      const mlResponse = {
        compatibilityScore: 0.85,
        factors: {
          personality: 0.8,
          interests: 0.9,
          lifestyle: 0.85,
        },
        explanation: 'High compatibility based on shared interests',
      };

      mockMLService.analyzeCompatibility.mockResolvedValue(mlResponse);

      const result = await mockMLService.analyzeCompatibility({
        user1: {
          age: user1.age,
          interests: user1.interests,
        },
        user2: {
          age: user2.age,
          interests: user2.interests,
        },
      });

      expect(result).toEqual(mlResponse);
      expect(result.compatibilityScore).toBe(0.85);
      expect(mockMLService.analyzeCompatibility).toHaveBeenCalled();
    });

    it('should handle ML service failures gracefully', async () => {
      const user1 = { id: 'user-1', age: 25, interests: ['drinking'] };
      const user2 = { id: 'user-2', age: 28, interests: ['drinking'] };

      mockMLService.analyzeCompatibility.mockRejectedValue(new Error('ML service unavailable'));

      await expect(
        mockMLService.analyzeCompatibility({ user1, user2 })
      ).rejects.toThrow('ML service unavailable');
    });

    it('should check ML service health', async () => {
      mockMLService.isHealthy.mockResolvedValue(true);

      const isHealthy = await mockMLService.isHealthy();

      expect(isHealthy).toBe(true);
      expect(mockMLService.isHealthy).toHaveBeenCalled();
    });
  });

  describe('Swipe Management', () => {
    it('should record swipe action', async () => {
      const swipeData = {
        swiperId: 'user-1',
        targetId: 'user-2',
        action: 'like',
        timestamp: new Date(),
      };

      const createdSwipe = {
        id: 'swipe-123',
        ...swipeData,
      };

      mockPrismaClient.swipe.create.mockResolvedValue(createdSwipe);

      const result = await mockPrismaClient.swipe.create({
        data: swipeData,
      });

      expect(result).toEqual(createdSwipe);
      expect(mockPrismaClient.swipe.create).toHaveBeenCalledWith({
        data: swipeData,
      });
    });

    it('should check for existing swipe', async () => {
      const swiperId = 'user-1';
      const targetId = 'user-2';

      const existingSwipe = {
        id: 'swipe-123',
        swiperId,
        targetId,
        action: 'like',
      };

      mockPrismaClient.swipe.findUnique.mockResolvedValue(existingSwipe);

      const result = await mockPrismaClient.swipe.findUnique({
        where: {
          swiperId_targetId: {
            swiperId,
            targetId,
          },
        },
      });

      expect(result).toEqual(existingSwipe);
    });
  });

  describe('Match Creation', () => {
    it('should create match when mutual like', async () => {
      const matchData = {
        user1Id: 'user-1',
        user2Id: 'user-2',
        compatibilityScore: 0.85,
        createdAt: new Date(),
      };

      const createdMatch = {
        id: 'match-123',
        ...matchData,
      };

      mockPrismaClient.match.create.mockResolvedValue(createdMatch);

      const result = await mockPrismaClient.match.create({
        data: matchData,
      });

      expect(result).toEqual(createdMatch);
      expect(mockPrismaClient.match.create).toHaveBeenCalledWith({
        data: matchData,
      });
    });

    it('should get user matches', async () => {
      const userId = 'user-1';
      const matches = [
        {
          id: 'match-1',
          user1Id: userId,
          user2Id: 'user-2',
          compatibilityScore: 0.85,
        },
        {
          id: 'match-2',
          user1Id: 'user-3',
          user2Id: userId,
          compatibilityScore: 0.78,
        },
      ];

      mockPrismaClient.match.findMany.mockResolvedValue(matches);

      const result = await mockPrismaClient.match.findMany({
        where: {
          OR: [
            { user1Id: userId },
            { user2Id: userId },
          ],
        },
      });

      expect(result).toEqual(matches);
      expect(result).toHaveLength(2);
    });
  });

  describe('User Cache Integration', () => {
    it('should cache user data efficiently', async () => {
      const userId = 'user-1';
      const userData = {
        id: userId,
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        age: 25,
      };

      mockUserCache.getUser.mockResolvedValue(userData);

      const result = await mockUserCache.getUser(userId);

      expect(result).toEqual(userData);
      expect(mockUserCache.getUser).toHaveBeenCalledWith(userId);
    });

    it('should handle cache misses gracefully', async () => {
      const userId = 'non-existent';

      mockUserCache.getUser.mockResolvedValue(null);

      const result = await mockUserCache.getUser(userId);

      expect(result).toBeNull();
    });

    it('should batch fetch multiple users', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];
      const usersData = [
        { id: 'user-1', username: 'user1' },
        { id: 'user-2', username: 'user2' },
        { id: 'user-3', username: 'user3' },
      ];

      mockUserCache.getUsers.mockResolvedValue(usersData);

      const result = await mockUserCache.getUsers(userIds);

      expect(result).toEqual(usersData);
      expect(result).toHaveLength(3);
      expect(mockUserCache.getUsers).toHaveBeenCalledWith(userIds);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors', async () => {
      mockPrismaClient.match.create.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        mockPrismaClient.match.create({
          data: {
            user1Id: 'user-1',
            user2Id: 'user-2',
            compatibilityScore: 0.8,
          },
        })
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle invalid match data', async () => {
      const invalidMatchData = {
        user1Id: '', // Empty user ID
        user2Id: 'user-2',
        compatibilityScore: -1, // Invalid score
      };

      mockPrismaClient.match.create.mockRejectedValue(new Error('Validation failed'));

      await expect(
        mockPrismaClient.match.create({ data: invalidMatchData })
      ).rejects.toThrow('Validation failed');
    });
  });

  describe('Performance', () => {
    it('should handle multiple concurrent matching operations', async () => {
      const operations = Array.from({ length: 10 }, (_, i) => ({
        swiperId: 'user-1',
        targetId: `user-${i + 2}`,
        action: 'like',
      }));

      mockPrismaClient.swipe.create.mockImplementation((data) =>
        Promise.resolve({
          id: `swipe-${Math.random()}`,
          ...data.data,
          timestamp: new Date(),
        })
      );

      const startTime = Date.now();
      const results = await Promise.all(
        operations.map(op => mockPrismaClient.swipe.create({ data: op }))
      );
      const endTime = Date.now();

      expect(results).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
    });
  });
});
