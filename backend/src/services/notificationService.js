const database = require('../config/database');
const { QueryTypes } = require('sequelize');

class NotificationService {
  /**
   * Get notification groups for a user
   * @param {string} companyId - Company ID
   * @param {string} userId - User ID
   * @param {string} userRole - User role
   * @returns {Promise<Array>} List of notification groups
   */
  async getGroupsForUser(companyId, userId, userRole) {
    try {
      const query = `
        SELECT
          ng.group_id,
          ng.company_id,
          ng.context_type,
          ng.status,
          ng.priority,
          ng.participants,
          ng.group_metadata,
          ng.created_at,
          COUNT(nm.message_id) as message_count,
          COUNT(nm.message_id) FILTER (WHERE NOT (nm.read_by @> ARRAY[:userId]::text[])) as unread_count,
          MAX(nm.created_at) as last_message_at
        FROM notification_groups ng
        LEFT JOIN notification_messages nm ON ng.group_id = nm.group_id
        WHERE ng.company_id = :companyId
          AND ng.participants @> ARRAY[:userId]::text[]
          AND ng.status != 'resolved'
        GROUP BY ng.group_id
        ORDER BY ng.priority DESC, MAX(nm.created_at) DESC NULLS LAST
      `;

      const groups = await database.sequelize.query(query, {
        replacements: { companyId, userId },
        type: QueryTypes.SELECT
      });

      return groups;
    } catch (error) {
      throw new Error(`Error getting groups for user: ${error.message}`);
    }
  }

  /**
   * Get messages from a notification group
   * @param {string} groupId - Group ID
   * @param {string} userId - User ID
   * @returns {Promise<Array>} List of messages
   */
  async getGroupMessages(groupId, userId) {
    try {
      // First verify user has access to this group
      const accessQuery = `
        SELECT group_id
        FROM notification_groups
        WHERE group_id = :groupId
          AND participants @> ARRAY[:userId]::text[]
      `;

      const accessCheck = await database.sequelize.query(accessQuery, {
        replacements: { groupId, userId },
        type: QueryTypes.SELECT
      });

      if (accessCheck.length === 0) {
        throw new Error('User does not have access to this group');
      }

      // Get messages
      const query = `
        SELECT
          message_id,
          group_id,
          sender_id,
          sender_type,
          message_text,
          message_metadata,
          read_by,
          created_at
        FROM notification_messages
        WHERE group_id = :groupId
        ORDER BY created_at ASC
      `;

      const messages = await database.sequelize.query(query, {
        replacements: { groupId },
        type: QueryTypes.SELECT
      });

      return messages;
    } catch (error) {
      throw new Error(`Error getting group messages: ${error.message}`);
    }
  }

  /**
   * Create a new message in a notification group
   * @param {string} groupId - Group ID
   * @param {string} senderId - Sender ID
   * @param {string} senderType - Sender type (user, system, admin)
   * @param {string} messageText - Message text
   * @param {object} metadata - Message metadata
   * @returns {Promise<object>} Created message
   */
  async createMessage(groupId, senderId, senderType, messageText, metadata = {}) {
    try {
      // Verify group exists
      const groupQuery = `
        SELECT group_id, status
        FROM notification_groups
        WHERE group_id = :groupId
      `;

      const groupCheck = await database.sequelize.query(groupQuery, {
        replacements: { groupId },
        type: QueryTypes.SELECT
      });

      if (groupCheck.length === 0) {
        throw new Error('Group not found');
      }

      if (groupCheck[0].status === 'resolved') {
        throw new Error('Cannot add messages to a resolved group');
      }

      // Create message
      const query = `
        INSERT INTO notification_messages
          (message_id, group_id, sender_id, sender_type, message_text, message_metadata, read_by, created_at)
        VALUES
          (gen_random_uuid(), :groupId, :senderId, :senderType, :messageText, :metadata, ARRAY[]::text[], NOW())
        RETURNING *
      `;

      const messages = await database.sequelize.query(query, {
        replacements: {
          groupId,
          senderId,
          senderType,
          messageText,
          metadata: JSON.stringify(metadata)
        },
        type: QueryTypes.INSERT
      });

      return messages[0][0];
    } catch (error) {
      throw new Error(`Error creating message: ${error.message}`);
    }
  }

  /**
   * Mark a notification group as read for a user
   * @param {string} groupId - Group ID
   * @param {string} userId - User ID
   * @returns {Promise<object>} Update result
   */
  async markGroupAsRead(groupId, userId) {
    try {
      const query = `
        UPDATE notification_messages
        SET read_by = array_append(read_by, :userId)
        WHERE group_id = :groupId
          AND NOT (read_by @> ARRAY[:userId]::text[])
        RETURNING message_id
      `;

      const result = await database.sequelize.query(query, {
        replacements: { groupId, userId },
        type: QueryTypes.UPDATE
      });

      return {
        success: true,
        messagesMarked: result[1]
      };
    } catch (error) {
      throw new Error(`Error marking group as read: ${error.message}`);
    }
  }

  /**
   * Mark all notification groups as read for a user
   * @param {string} companyId - Company ID
   * @param {string} userId - User ID
   * @returns {Promise<object>} Update result
   */
  async markAllAsRead(companyId, userId) {
    try {
      const query = `
        UPDATE notification_messages nm
        SET read_by = array_append(read_by, :userId)
        FROM notification_groups ng
        WHERE nm.group_id = ng.group_id
          AND ng.company_id = :companyId
          AND ng.participants @> ARRAY[:userId]::text[]
          AND NOT (nm.read_by @> ARRAY[:userId]::text[])
        RETURNING nm.message_id
      `;

      const result = await database.sequelize.query(query, {
        replacements: { companyId, userId },
        type: QueryTypes.UPDATE
      });

      return {
        success: true,
        messagesMarked: result[1]
      };
    } catch (error) {
      throw new Error(`Error marking all as read: ${error.message}`);
    }
  }

  /**
   * Resolve a notification group
   * @param {string} groupId - Group ID
   * @param {string} userId - User ID
   * @returns {Promise<object>} Update result
   */
  async resolveGroup(groupId, userId) {
    try {
      // Verify user has access
      const accessQuery = `
        SELECT group_id
        FROM notification_groups
        WHERE group_id = :groupId
          AND participants @> ARRAY[:userId]::text[]
      `;

      const accessCheck = await database.sequelize.query(accessQuery, {
        replacements: { groupId, userId },
        type: QueryTypes.SELECT
      });

      if (accessCheck.length === 0) {
        throw new Error('User does not have access to this group');
      }

      // Resolve group
      const query = `
        UPDATE notification_groups
        SET status = 'resolved'
        WHERE group_id = :groupId
        RETURNING *
      `;

      const result = await database.sequelize.query(query, {
        replacements: { groupId },
        type: QueryTypes.UPDATE
      });

      return result[0][0];
    } catch (error) {
      throw new Error(`Error resolving group: ${error.message}`);
    }
  }

  /**
   * Create a new notification group
   * @param {string} companyId - Company ID
   * @param {string} contextType - Context type
   * @param {Array<string>} participants - Array of participant IDs
   * @param {object} metadata - Group metadata
   * @param {string} priority - Priority level (high, normal, low)
   * @returns {Promise<object>} Created group
   */
  async createGroup(companyId, contextType, participants, metadata = {}, priority = 'normal') {
    try {
      const query = `
        INSERT INTO notification_groups
          (group_id, company_id, context_type, status, priority, participants, group_metadata, created_at)
        VALUES
          (gen_random_uuid(), :companyId, :contextType, 'active', :priority, :participants, :metadata, NOW())
        RETURNING *
      `;

      const groups = await database.sequelize.query(query, {
        replacements: {
          companyId,
          contextType,
          priority,
          participants: `{${participants.join(',')}}`,
          metadata: JSON.stringify(metadata)
        },
        type: QueryTypes.INSERT
      });

      return groups[0][0];
    } catch (error) {
      throw new Error(`Error creating group: ${error.message}`);
    }
  }

  /**
   * Get notification statistics for a user
   * @param {string} companyId - Company ID
   * @param {string} userId - User ID
   * @param {string} userRole - User role
   * @returns {Promise<object>} Statistics object
   */
  async getStats(companyId, userId, userRole) {
    try {
      const query = `
        SELECT
          COUNT(DISTINCT ng.group_id) as total_groups,
          COUNT(DISTINCT CASE WHEN ng.status = 'active' THEN ng.group_id END) as active_groups,
          COUNT(DISTINCT CASE WHEN ng.priority = 'high' THEN ng.group_id END) as high_priority_groups,
          COUNT(nm.message_id) as total_messages,
          COUNT(nm.message_id) FILTER (WHERE NOT (nm.read_by @> ARRAY[:userId]::text[])) as unread_messages
        FROM notification_groups ng
        LEFT JOIN notification_messages nm ON ng.group_id = nm.group_id
        WHERE ng.company_id = :companyId
          AND ng.participants @> ARRAY[:userId]::text[]
          AND ng.status != 'resolved'
      `;

      const stats = await database.sequelize.query(query, {
        replacements: { companyId, userId },
        type: QueryTypes.SELECT
      });

      return stats[0];
    } catch (error) {
      throw new Error(`Error getting stats: ${error.message}`);
    }
  }
}

module.exports = new NotificationService();
