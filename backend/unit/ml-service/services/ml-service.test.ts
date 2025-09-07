// Unit tests for ML Service (Python functions tested via JavaScript mocks)
describe('ML Service', () => {
  describe('Text Analysis', () => {
    it('should analyze text sentiment correctly', () => {
      // Mock sentiment analysis function
      const analyzeSentiment = (text: string): { sentiment: string; confidence: number } => {
        const positiveWords = ['good', 'great', 'awesome', 'amazing', 'love', 'happy', 'excited'];
        const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'sad', 'angry', 'disappointed'];
        
        const words = text.toLowerCase().split(/\s+/);
        const positiveCount = words.filter(word => positiveWords.includes(word)).length;
        const negativeCount = words.filter(word => negativeWords.includes(word)).length;
        
        if (positiveCount > negativeCount) {
          return { sentiment: 'positive', confidence: positiveCount / words.length };
        } else if (negativeCount > positiveCount) {
          return { sentiment: 'negative', confidence: negativeCount / words.length };
        } else {
          return { sentiment: 'neutral', confidence: 0.5 };
        }
      };

      const positiveText = 'I love this app, it is amazing and makes me happy!';
      const negativeText = 'This is terrible, I hate it and it makes me angry.';
      const neutralText = 'The weather is okay today.';

      const positiveResult = analyzeSentiment(positiveText);
      const negativeResult = analyzeSentiment(negativeText);
      const neutralResult = analyzeSentiment(neutralText);

      expect(positiveResult.sentiment).toBe('positive');
      expect(positiveResult.confidence).toBeGreaterThan(0);
      
      expect(negativeResult.sentiment).toBe('negative');
      expect(negativeResult.confidence).toBeGreaterThan(0);
      
      expect(neutralResult.sentiment).toBe('neutral');
      expect(neutralResult.confidence).toBe(0.5);
    });

    it('should extract keywords from text', () => {
      // Mock keyword extraction function
      const extractKeywords = (text: string, maxKeywords: number = 5): string[] => {
        const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'];
        
        const words = text.toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter(word => word.length > 2 && !stopWords.includes(word));
        
        const wordCounts = words.reduce((counts, word) => {
          counts[word] = (counts[word] || 0) + 1;
          return counts;
        }, {} as Record<string, number>);
        
        return Object.entries(wordCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, maxKeywords)
          .map(([word]) => word);
      };

      const text = 'I love drinking beer and listening to music. Beer is great and music makes me happy.';
      const keywords = extractKeywords(text, 3);

      expect(keywords).toContain('beer');
      expect(keywords).toContain('love');
      expect(keywords).toContain('music');
      expect(keywords.length).toBeLessThanOrEqual(3);
    });
  });

  describe('User Behavior Analysis', () => {
    it('should calculate user activity score', () => {
      // Mock user activity scoring function
      const calculateActivityScore = (userData: any): number => {
        const { loginCount, messageCount, eventParticipation, profileCompleteness } = userData;
        
        const loginScore = Math.min(loginCount / 30, 1) * 0.2; // Max 1 login per day
        const messageScore = Math.min(messageCount / 100, 1) * 0.3; // Max 100 messages
        const eventScore = Math.min(eventParticipation / 10, 1) * 0.3; // Max 10 events
        const profileScore = profileCompleteness * 0.2; // 0-1 completeness
        
        return Math.min(1, loginScore + messageScore + eventScore + profileScore);
      };

      const activeUser = {
        loginCount: 25,
        messageCount: 80,
        eventParticipation: 8,
        profileCompleteness: 0.9,
      };

      const inactiveUser = {
        loginCount: 5,
        messageCount: 10,
        eventParticipation: 1,
        profileCompleteness: 0.3,
      };

      const activeScore = calculateActivityScore(activeUser);
      const inactiveScore = calculateActivityScore(inactiveUser);

      expect(activeScore).toBeGreaterThan(inactiveScore);
      expect(activeScore).toBeGreaterThan(0.7);
      expect(inactiveScore).toBeLessThan(0.5);
    });

    it('should predict user preferences', () => {
      // Mock preference prediction function
      const predictPreferences = (userHistory: any): any => {
        const { pastEvents, messages } = userHistory;
        
        // Analyze past events to predict preferred categories
        const eventCategories = pastEvents.map((event: any) => event.category);
        const categoryCounts = eventCategories.reduce((counts: any, category: string) => {
          counts[category] = (counts[category] || 0) + 1;
          return counts;
        }, {});
        
        const preferredCategory = Object.entries(categoryCounts)
          .sort(([, a], [, b]) => (b as number) - (a as number))[0]?.[0] || 'social';
        
        // Analyze message content for interests
        const allMessages = messages.join(' ').toLowerCase();
        const interests = [];
        
        if (allMessages.includes('drink') || allMessages.includes('beer') || allMessages.includes('alcohol')) {
          interests.push('drinking');
        }
        if (allMessages.includes('music') || allMessages.includes('concert') || allMessages.includes('band')) {
          interests.push('music');
        }
        if (allMessages.includes('sport') || allMessages.includes('gym') || allMessages.includes('fitness')) {
          interests.push('sports');
        }
        
        return {
          preferredCategory,
          interests: interests.length > 0 ? interests : ['social'],
          confidence: Math.min(0.9, (pastEvents.length + messages.length) / 20),
        };
      };

      const userHistory = {
        pastEvents: [
          { category: 'drinking' },
          { category: 'drinking' },
          { category: 'music' },
        ],
        messages: [
          'I love drinking beer and listening to music',
          'Going to a concert tonight',
          'Had a great time at the bar',
        ],
        likes: [],
      };

      const preferences = predictPreferences(userHistory);

      expect(preferences.preferredCategory).toBe('drinking');
      expect(preferences.interests).toContain('drinking');
      expect(preferences.interests).toContain('music');
      expect(preferences.confidence).toBeGreaterThan(0);
    });
  });

  describe('Content Moderation', () => {
    it('should detect inappropriate content', () => {
      // Mock content moderation function
      const moderateContent = (content: string): { isAppropriate: boolean; reason?: string } => {
        const inappropriateWords = ['spam', 'scam', 'fake', 'inappropriate', 'offensive'];
        const contentLower = content.toLowerCase();
        
        for (const word of inappropriateWords) {
          if (contentLower.includes(word)) {
            return { isAppropriate: false, reason: `Contains inappropriate word: ${word}` };
          }
        }
        
        // Check for excessive caps (spam indicator)
        const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
        if (capsRatio > 0.7 && content.length > 10) {
          return { isAppropriate: false, reason: 'Excessive capitalization' };
        }
        
        // Check for excessive repetition
        const words = content.split(/\s+/);
        const uniqueWords = new Set(words);
        if (words.length > 5 && uniqueWords.size / words.length < 0.3) {
          return { isAppropriate: false, reason: 'Excessive repetition' };
        }
        
        return { isAppropriate: true };
      };

      const appropriateContent = 'Hello, I would like to meet new people and have a good time.';
      const inappropriateContent = 'This is CAPS CAPS CAPS CAPS CAPS CAPS CAPS CAPS CAPS CAPS';
      const offensiveContent = 'This is inappropriate content with offensive language.';

      const appropriateResult = moderateContent(appropriateContent);
      const inappropriateResult = moderateContent(inappropriateContent);
      const offensiveResult = moderateContent(offensiveContent);

      expect(appropriateResult.isAppropriate).toBe(true);
      expect(inappropriateResult.isAppropriate).toBe(false);
      expect(inappropriateResult.reason).toBe('Excessive capitalization');
      expect(offensiveResult.isAppropriate).toBe(false);
      expect(offensiveResult.reason).toContain('inappropriate');
    });

    it('should detect spam patterns', () => {
      // Mock spam detection function
      const detectSpam = (content: string): { isSpam: boolean; score: number } => {
        let spamScore = 0;
        
        // Check for excessive links
        const linkCount = (content.match(/https?:\/\/[^\s]+/g) || []).length;
        if (linkCount > 2) {
          spamScore += 0.3;
        }
        
        // Check for phone numbers (potential spam)
        const phonePattern = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/;
        if (phonePattern.test(content)) {
          spamScore += 0.2;
        }
        
        // Check for excessive punctuation
        const punctuationCount = (content.match(/[!]{2,}|[?]{2,}/g) || []).length;
        if (punctuationCount > 0) {
          spamScore += 0.1;
        }
        
        // Check for common spam phrases
        const spamPhrases = ['click here', 'free money', 'make money fast', 'urgent', 'act now'];
        const contentLower = content.toLowerCase();
        for (const phrase of spamPhrases) {
          if (contentLower.includes(phrase)) {
            spamScore += 0.2;
          }
        }
        
        return {
          isSpam: spamScore > 0.5,
          score: Math.min(1, spamScore),
        };
      };

      const normalContent = 'Hey, want to grab a drink tonight?';
      const spamContent = 'CLICK HERE for FREE MONEY!!! Make money fast! Call 555-123-4567';
      const suspiciousContent = 'Check out this link: https://example.com and this one: https://test.com';

      const normalResult = detectSpam(normalContent);
      const spamResult = detectSpam(spamContent);
      const suspiciousResult = detectSpam(suspiciousContent);

      expect(normalResult.isSpam).toBe(false);
      expect(normalResult.score).toBeLessThan(0.5);
      
      expect(spamResult.isSpam).toBe(true);
      expect(spamResult.score).toBeGreaterThan(0.5);
      
      expect(suspiciousResult.isSpam).toBe(false);
      expect(suspiciousResult.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Recommendation Engine', () => {
    it('should calculate user similarity score', () => {
      // Mock user similarity calculation
      const calculateUserSimilarity = (user1: any, user2: any): number => {
        const { interests: interests1, age: age1, location: location1 } = user1;
        const { interests: interests2, age: age2, location: location2 } = user2;
        
        // Interest similarity
        const commonInterests = interests1.filter((interest: string) => interests2.includes(interest));
        const interestScore = commonInterests.length / Math.max(interests1.length, interests2.length);
        
        // Age similarity (closer ages = higher score)
        const ageDiff = Math.abs(age1 - age2);
        const ageScore = Math.max(0, 1 - ageDiff / 20); // Max 20 year difference
        
        // Location similarity (closer locations = higher score)
        const distance = calculateDistance(location1.latitude, location1.longitude, location2.latitude, location2.longitude);
        const locationScore = Math.max(0, 1 - distance / 50); // Max 50km
        
        return (interestScore * 0.5 + ageScore * 0.3 + locationScore * 0.2);
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

      const user1 = {
        interests: ['drinking', 'music', 'sports'],
        age: 25,
        location: { latitude: 55.7558, longitude: 37.6176 },
      };

      const user2 = {
        interests: ['drinking', 'music', 'gaming'],
        age: 27,
        location: { latitude: 55.7600, longitude: 37.6200 },
      };

      const user3 = {
        interests: ['cooking', 'reading'],
        age: 45,
        location: { latitude: 55.8000, longitude: 37.7000 },
      };

      const similarity12 = calculateUserSimilarity(user1, user2);
      const similarity13 = calculateUserSimilarity(user1, user3);

      expect(similarity12).toBeGreaterThan(similarity13);
      expect(similarity12).toBeGreaterThan(0.5);
      expect(similarity13).toBeLessThan(0.3);
    });

    it('should generate event recommendations', () => {
      // Mock event recommendation function
      const generateEventRecommendations = (user: any, events: any[]): any[] => {
        const { interests, age, location, preferences } = user;
        
        return events
          .map(event => {
            let score = 0;
            
            // Interest matching
            const commonInterests = interests.filter((interest: string) => 
              event.tags.includes(interest) || event.category === interest
            );
            score += commonInterests.length * 0.3;
            
            // Age compatibility
            if (event.ageRange) {
              if (age >= event.ageRange.min && age <= event.ageRange.max) {
                score += 0.2;
              }
            }
            
            // Location proximity
            const distance = calculateDistance(
              location.latitude, location.longitude,
              event.location.latitude, event.location.longitude
            );
            if (distance <= preferences.maxDistance) {
              score += 0.3 * (1 - distance / preferences.maxDistance);
            }
            
            // Time preference (future events preferred)
            const timeUntilEvent = (new Date(event.dateTime).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
            if (timeUntilEvent > 0 && timeUntilEvent <= 7) {
              score += 0.2;
            }
            
            return { ...event, recommendationScore: score };
          })
          .filter(event => event.recommendationScore > 0.3)
          .sort((a, b) => b.recommendationScore - a.recommendationScore)
          .slice(0, 5);
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

      const user = {
        interests: ['drinking', 'music'],
        age: 25,
        location: { latitude: 55.7558, longitude: 37.6176 },
        preferences: { maxDistance: 10 },
      };

      const events = [
        {
          id: '1',
          title: 'Drinking Night',
          category: 'drinking',
          tags: ['drinking', 'social'],
          ageRange: { min: 21, max: 35 },
          location: { latitude: 55.7600, longitude: 37.6200 },
          dateTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        },
        {
          id: '2',
          title: 'Music Concert',
          category: 'music',
          tags: ['music', 'entertainment'],
          ageRange: { min: 18, max: 40 },
          location: { latitude: 55.7558, longitude: 37.6176 },
          dateTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        },
        {
          id: '3',
          title: 'Cooking Class',
          category: 'cooking',
          tags: ['cooking', 'learning'],
          ageRange: { min: 25, max: 50 },
          location: { latitude: 55.8000, longitude: 37.7000 },
          dateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        },
      ];

      const recommendations = generateEventRecommendations(user, events);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].recommendationScore).toBeGreaterThan(recommendations[recommendations.length - 1].recommendationScore);
      expect(recommendations.some(event => event.id === '1')).toBe(true); // Drinking event should be recommended
      expect(recommendations.some(event => event.id === '2')).toBe(true); // Music event should be recommended
    });
  });
});
