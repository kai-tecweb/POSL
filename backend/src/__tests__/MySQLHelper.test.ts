import { MySQLHelper } from '../libs/mysql';

// MySQLテスト用のモック設定
jest.mock('mysql2/promise', () => ({
  createPool: jest.fn(() => ({
    execute: jest.fn(),
    end: jest.fn()
  }))
}));

describe('MySQLHelper', () => {
  let mockPool: any;
  
  beforeEach(() => {
    const mysql = require('mysql2/promise');
    mockPool = {
      execute: jest.fn(),
      end: jest.fn()
    };
    mysql.createPool.mockReturnValue(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getItem', () => {
    it('should retrieve a user item successfully', async () => {
      const mockUser = {
        user_id: 'test_user',
        user_data: JSON.stringify({ name: 'Test User', email: 'test@example.com' })
      };
      
      mockPool.execute.mockResolvedValue([[mockUser]]);
      
      const result = await MySQLHelper.getItem('Users', { userId: 'test_user' });
      
      expect(mockPool.execute).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE user_id = ?',
        ['test_user']
      );
      expect(result).toEqual({
        userId: 'test_user',
        name: 'Test User',
        email: 'test@example.com'
      });
    });

    it('should return null when item not found', async () => {
      mockPool.execute.mockResolvedValue([[]]);
      
      const result = await MySQLHelper.getItem('Users', { userId: 'nonexistent' });
      
      expect(result).toBeNull();
    });

    it('should retrieve a settings item successfully', async () => {
      const mockSetting = {
        user_id: 'test_user',
        setting_type: 'tone',
        setting_data: JSON.stringify({ politeness: 85, casualness: 30 })
      };
      
      mockPool.execute.mockResolvedValue([[mockSetting]]);
      
      const result = await MySQLHelper.getItem('Settings', { 
        userId: 'test_user', 
        settingType: 'tone' 
      });
      
      expect(mockPool.execute).toHaveBeenCalledWith(
        'SELECT * FROM settings WHERE user_id = ? AND setting_type = ?',
        ['test_user', 'tone']
      );
      expect(result).toEqual({
        userId: 'test_user',
        settingType: 'tone',
        politeness: 85,
        casualness: 30
      });
    });
  });

  describe('putItem', () => {
    it('should insert/update a user item successfully', async () => {
      const userItem = {
        userId: 'test_user',
        name: 'Test User',
        email: 'test@example.com'
      };
      
      mockPool.execute.mockResolvedValue([{ affectedRows: 1 }]);
      
      await MySQLHelper.putItem('Users', userItem);
      
      expect(mockPool.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining(['test_user'])
      );
    });

    it('should insert/update a settings item successfully', async () => {
      const settingsItem = {
        userId: 'test_user',
        settingType: 'tone',
        politeness: 75,
        casualness: 45
      };
      
      mockPool.execute.mockResolvedValue([{ affectedRows: 1 }]);
      
      await MySQLHelper.putItem('Settings', settingsItem);
      
      expect(mockPool.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO settings'),
        expect.arrayContaining(['test_user', 'tone'])
      );
    });
  });

  describe('query', () => {
    it('should query items with key condition successfully', async () => {
      const mockResults = [
        {
          user_id: 'test_user',
          post_id: 'post_1',
          timestamp: '2025-11-17T10:00:00Z',
          post_data: JSON.stringify({ content: 'Test post 1' })
        },
        {
          user_id: 'test_user', 
          post_id: 'post_2',
          timestamp: '2025-11-17T11:00:00Z',
          post_data: JSON.stringify({ content: 'Test post 2' })
        }
      ];
      
      mockPool.execute.mockResolvedValue([mockResults]);
      
      const result = await MySQLHelper.query(
        'PostLogs',
        'userId = :userId',
        { ':userId': 'test_user' },
        'timestamp-index'
      );
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        userId: 'test_user',
        postId: 'post_1', 
        timestamp: '2025-11-17T10:00:00Z',
        content: 'Test post 1'
      });
    });

    it('should handle query with limit and sort order', async () => {
      const mockResults = [{
        user_id: 'test_user',
        diary_id: 'diary_1',
        created_at: '2025-11-17T10:00:00Z',
        diary_data: JSON.stringify({ title: 'Test diary', content: 'Test content' })
      }];
      
      mockPool.execute.mockResolvedValue([mockResults]);
      
      const result = await MySQLHelper.query(
        'Diaries',
        'userId = :userId',
        { ':userId': 'test_user' },
        'created-at-index',
        undefined,
        5,
        false // DESC order
      );
      
      expect(mockPool.execute).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC LIMIT 5'),
        ['test_user']
      );
    });
  });

  describe('updateItem', () => {
    it('should update an item successfully', async () => {
      const mockUpdatedItem = {
        user_id: 'test_user',
        setting_type: 'tone',
        setting_data: JSON.stringify({ politeness: 90, casualness: 25 })
      };
      
      mockPool.execute
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // UPDATE
        .mockResolvedValueOnce([[mockUpdatedItem]]); // SELECT (getItem)
      
      const result = await MySQLHelper.updateItem(
        'Settings',
        { userId: 'test_user', settingType: 'tone' },
        'SET politeness = :politeness, casualness = :casualness',
        { ':politeness': 90, ':casualness': 25 }
      );
      
      expect(mockPool.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE settings SET'),
        expect.arrayContaining([90, 25, 'test_user', 'tone'])
      );
      expect(result).toBeDefined();
    });
  });

  describe('deleteItem', () => {
    it('should delete an item successfully', async () => {
      mockPool.execute.mockResolvedValue([{ affectedRows: 1 }]);
      
      await MySQLHelper.deleteItem('Users', { userId: 'test_user' });
      
      expect(mockPool.execute).toHaveBeenCalledWith(
        'DELETE FROM users WHERE user_id = ?',
        ['test_user']
      );
    });
  });

  describe('scan', () => {
    it('should scan table with filter expression', async () => {
      const mockResults = [
        {
          user_id: 'user1',
          diary_id: 'diary_1',
          created_at: '2025-11-17T10:00:00Z',
          diary_data: JSON.stringify({ mood: 'happy' })
        },
        {
          user_id: 'user2',
          diary_id: 'diary_2', 
          created_at: '2025-11-17T11:00:00Z',
          diary_data: JSON.stringify({ mood: 'happy' })
        }
      ];
      
      mockPool.execute.mockResolvedValue([mockResults]);
      
      const result = await MySQLHelper.scan(
        'Diaries',
        'mood = :mood',
        { ':mood': 'happy' },
        undefined,
        10
      );
      
      expect(mockPool.execute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE mood = ? LIMIT 10'),
        ['happy']
      );
      expect(result).toHaveLength(2);
    });
  });

  describe('batchGetItems', () => {
    it('should batch get multiple items', async () => {
      const mockUser1 = {
        user_id: 'user1',
        user_data: JSON.stringify({ name: 'User 1' })
      };
      const mockUser2 = {
        user_id: 'user2', 
        user_data: JSON.stringify({ name: 'User 2' })
      };
      
      mockPool.execute
        .mockResolvedValueOnce([[mockUser1]])
        .mockResolvedValueOnce([[mockUser2]]);
      
      const keys = [{ userId: 'user1' }, { userId: 'user2' }];
      const result = await MySQLHelper.batchGetItems('Users', keys);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ userId: 'user1', name: 'User 1' });
      expect(result[1]).toEqual({ userId: 'user2', name: 'User 2' });
    });
  });

  describe('Error handling', () => {
    it('should handle database connection errors', async () => {
      mockPool.execute.mockRejectedValue(new Error('Connection failed'));
      
      await expect(
        MySQLHelper.getItem('Users', { userId: 'test_user' })
      ).rejects.toThrow('Failed to get item from Users');
    });

    it('should handle JSON parse errors gracefully', async () => {
      const invalidJsonRow = {
        user_id: 'test_user',
        user_data: 'invalid json {'
      };
      
      mockPool.execute.mockResolvedValue([[invalidJsonRow]]);
      
      await expect(
        MySQLHelper.getItem('Users', { userId: 'test_user' })
      ).rejects.toThrow('Failed to parse JSON data from users');
    });
  });

  describe('Table name normalization', () => {
    it('should normalize DynamoDB table names to MySQL names', async () => {
      mockPool.execute.mockResolvedValue([[]]);
      
      // DynamoDB形式のテーブル名をテスト
      await MySQLHelper.getItem('posl-dev-users', { userId: 'test' });
      expect(mockPool.execute).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE user_id = ?',
        ['test']
      );
      
      await MySQLHelper.getItem('posl-dev-settings', { userId: 'test', settingType: 'tone' });
      expect(mockPool.execute).toHaveBeenCalledWith(
        'SELECT * FROM settings WHERE user_id = ? AND setting_type = ?',
        ['test', 'tone']
      );
    });
  });
});