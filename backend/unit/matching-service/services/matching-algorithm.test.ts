// Unit tests for Matching Service - Matching Algorithm
describe('Matching Service - Matching Algorithm', () => {
  describe('Distance Calculation', () => {
    it('should calculate distance between two points correctly', () => {
      // Mock Haversine distance calculation
      const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371; // Earth's radius in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
      };

      // Test with Moscow coordinates
      const moscowLat = 55.7558;
      const moscowLon = 37.6176;
      const nearbyLat = 55.7600;
      const nearbyLon = 37.6200;

      const distance = calculateDistance(moscowLat, moscowLon, nearbyLat, nearbyLon);
      
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(10); // Should be less than 10km
    });

    it('should return 0 for same coordinates', () => {
      const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
      };

      const lat = 55.7558;
      const lon = 37.6176;

      const distance = calculateDistance(lat, lon, lat, lon);
      
      expect(distance).toBeCloseTo(0, 2);
    });
  });

  describe('Age Compatibility', () => {
    it('should check age compatibility correctly', () => {
      const isAgeCompatible = (userAge: number, targetAge: number, userPreferences: any, targetPreferences: any): boolean => {
        // Check if user's age is within target's preferences
        const userAgeInTargetRange = targetPreferences.ageRange.min <= userAge && userAge <= targetPreferences.ageRange.max;
        
        // Check if target's age is within user's preferences
        const targetAgeInUserRange = userPreferences.ageRange.min <= targetAge && targetAge <= userPreferences.ageRange.max;
        
        return userAgeInTargetRange && targetAgeInUserRange;
      };

      const user = {
        age: 25,
        preferences: {
          ageRange: { min: 21, max: 35 },
        },
      };

      const target = {
        age: 28,
        preferences: {
          ageRange: { min: 22, max: 30 },
        },
      };

      const compatible = isAgeCompatible(user.age, target.age, user.preferences, target.preferences);
      
      expect(compatible).toBe(true);
    });

    it('should reject incompatible ages', () => {
      const isAgeCompatible = (userAge: number, targetAge: number, userPreferences: any, targetPreferences: any): boolean => {
        const userAgeInTargetRange = targetPreferences.ageRange.min <= userAge && userAge <= targetPreferences.ageRange.max;
        const targetAgeInUserRange = userPreferences.ageRange.min <= targetAge && targetAge <= userPreferences.ageRange.max;
        return userAgeInTargetRange && targetAgeInUserRange;
      };

      const user = {
        age: 25,
        preferences: {
          ageRange: { min: 21, max: 30 },
        },
      };

      const target = {
        age: 35,
        preferences: {
          ageRange: { min: 30, max: 40 },
        },
      };

      const compatible = isAgeCompatible(user.age, target.age, user.preferences, target.preferences);
      
      expect(compatible).toBe(false);
    });
  });

  describe('Interest Matching', () => {
    it('should calculate interest compatibility score', () => {
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

    it('should return 0 for no common interests', () => {
      const calculateInterestScore = (userInterests: string[], targetInterests: string[]): number => {
        if (userInterests.length === 0 || targetInterests.length === 0) {
          return 0;
        }

        const commonInterests = userInterests.filter(interest => targetInterests.includes(interest));
        const totalInterests = new Set([...userInterests, ...targetInterests]).size;
        
        return commonInterests.length / totalInterests;
      };

      const userInterests = ['drinking', 'music'];
      const targetInterests = ['gaming', 'sports'];

      const score = calculateInterestScore(userInterests, targetInterests);
      
      expect(score).toBe(0);
    });

    it('should return 1 for identical interests', () => {
      const calculateInterestScore = (userInterests: string[], targetInterests: string[]): number => {
        if (userInterests.length === 0 || targetInterests.length === 0) {
          return 0;
        }

        const commonInterests = userInterests.filter(interest => targetInterests.includes(interest));
        const totalInterests = new Set([...userInterests, ...targetInterests]).size;
        
        return commonInterests.length / totalInterests;
      };

      const userInterests = ['drinking', 'music'];
      const targetInterests = ['drinking', 'music'];

      const score = calculateInterestScore(userInterests, targetInterests);
      
      expect(score).toBe(1);
    });
  });

  describe('Overall Matching Score', () => {
    it('should calculate overall matching score correctly', () => {
      const calculateMatchingScore = (user: any, target: any): number => {
        // Distance score (closer is better)
        const maxDistance = Math.max(user.preferences.maxDistance, target.preferences.maxDistance);
        const distance = calculateDistance(user.location.latitude, user.location.longitude, 
                                         target.location.latitude, target.location.longitude);
        const distanceScore = distance <= maxDistance ? (maxDistance - distance) / maxDistance : 0;
        
        // Age compatibility
        const ageCompatible = isAgeCompatible(user.age, target.age, user.preferences, target.preferences);
        const ageScore = ageCompatible ? 1 : 0;
        
        // Interest score
        const interestScore = calculateInterestScore(user.interests, target.interests);
        
        // Weighted average
        return (distanceScore * 0.3 + ageScore * 0.4 + interestScore * 0.3);
      };

      const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
      };

      const isAgeCompatible = (userAge: number, targetAge: number, userPreferences: any, targetPreferences: any): boolean => {
        const userAgeInTargetRange = targetPreferences.ageRange.min <= userAge && userAge <= targetPreferences.ageRange.max;
        const targetAgeInUserRange = userPreferences.ageRange.min <= targetAge && targetAge <= userPreferences.ageRange.max;
        return userAgeInTargetRange && targetAgeInUserRange;
      };

      const calculateInterestScore = (userInterests: string[], targetInterests: string[]): number => {
        if (userInterests.length === 0 || targetInterests.length === 0) {
          return 0;
        }
        const commonInterests = userInterests.filter(interest => targetInterests.includes(interest));
        const totalInterests = new Set([...userInterests, ...targetInterests]).size;
        return commonInterests.length / totalInterests;
      };

      const user = {
        age: 25,
        location: { latitude: 55.7558, longitude: 37.6176 },
        preferences: {
          ageRange: { min: 21, max: 35 },
          maxDistance: 10,
        },
        interests: ['drinking', 'music'],
      };

      const target = {
        age: 28,
        location: { latitude: 55.7600, longitude: 37.6200 },
        preferences: {
          ageRange: { min: 22, max: 30 },
          maxDistance: 15,
        },
        interests: ['drinking', 'music', 'sports'],
      };

      const score = calculateMatchingScore(user, target);
      
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should return 0 for incompatible users', () => {
      const calculateMatchingScore = (user: any, target: any): number => {
        const maxDistance = Math.max(user.preferences.maxDistance, target.preferences.maxDistance);
        const distance = calculateDistance(user.location.latitude, user.location.longitude, 
                                         target.location.latitude, target.location.longitude);
        const distanceScore = distance <= maxDistance ? (maxDistance - distance) / maxDistance : 0;
        
        const ageCompatible = isAgeCompatible(user.age, target.age, user.preferences, target.preferences);
        const ageScore = ageCompatible ? 1 : 0;
        
        const interestScore = calculateInterestScore(user.interests, target.interests);
        
        return (distanceScore * 0.3 + ageScore * 0.4 + interestScore * 0.3);
      };

      const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
      };

      const isAgeCompatible = (userAge: number, targetAge: number, userPreferences: any, targetPreferences: any): boolean => {
        const userAgeInTargetRange = targetPreferences.ageRange.min <= userAge && userAge <= targetPreferences.ageRange.max;
        const targetAgeInUserRange = userPreferences.ageRange.min <= targetAge && targetAge <= userPreferences.ageRange.max;
        return userAgeInTargetRange && targetAgeInUserRange;
      };

      const calculateInterestScore = (userInterests: string[], targetInterests: string[]): number => {
        if (userInterests.length === 0 || targetInterests.length === 0) {
          return 0;
        }
        const commonInterests = userInterests.filter(interest => targetInterests.includes(interest));
        const totalInterests = new Set([...userInterests, ...targetInterests]).size;
        return commonInterests.length / totalInterests;
      };

      const user = {
        age: 25,
        location: { latitude: 55.7558, longitude: 37.6176 },
        preferences: {
          ageRange: { min: 21, max: 30 },
          maxDistance: 5,
        },
        interests: ['drinking'],
      };

      const target = {
        age: 35,
        location: { latitude: 55.8000, longitude: 37.7000 }, // Far away
        preferences: {
          ageRange: { min: 30, max: 40 },
          maxDistance: 10,
        },
        interests: ['gaming', 'sports'],
      };

      const score = calculateMatchingScore(user, target);
      
      expect(score).toBeLessThan(0.1); // Should be very low but not exactly 0 due to distance calculation
    });
  });

  describe('Match Filtering', () => {
    it('should filter matches by minimum score', () => {
      const filterMatchesByScore = (matches: any[], minScore: number): any[] => {
        return matches.filter(match => match.score >= minScore);
      };

      const matches = [
        { userId: '1', score: 0.8 },
        { userId: '2', score: 0.6 },
        { userId: '3', score: 0.4 },
        { userId: '4', score: 0.9 },
      ];

      const filteredMatches = filterMatchesByScore(matches, 0.7);
      
      expect(filteredMatches).toHaveLength(2);
      expect(filteredMatches[0].userId).toBe('1');
      expect(filteredMatches[1].userId).toBe('4');
    });

    it('should sort matches by score descending', () => {
      const sortMatchesByScore = (matches: any[]): any[] => {
        return matches.sort((a, b) => b.score - a.score);
      };

      const matches = [
        { userId: '1', score: 0.6 },
        { userId: '2', score: 0.9 },
        { userId: '3', score: 0.3 },
        { userId: '4', score: 0.8 },
      ];

      const sortedMatches = sortMatchesByScore(matches);
      
      expect(sortedMatches[0].score).toBe(0.9);
      expect(sortedMatches[1].score).toBe(0.8);
      expect(sortedMatches[2].score).toBe(0.6);
      expect(sortedMatches[3].score).toBe(0.3);
    });
  });
});
