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
          ng.id,
          ng.company_id,
          ng.group_type,
          ng.initiator_type,
          ng.initiator_id,
          ng.subject,
          ng.status,
          ng.priority,
          ng.metadata,
          ng.created_at,
          ng.closed_at,
          ng.closed_by,
          COUNT(nm.id) as message_count,
          COUNT(nm.id) FILTER (WHERE nm.read_at IS NULL) as unread_count,
          MAX(nm.created_at) as last_message_at
        FROM notification_groups ng
        LEFT JOIN notification_messages nm ON ng.id = nm.group_id
        WHERE ng.company_id = :companyId
          AND ng.metadata->'participants' @> :userIdJson::jsonb
          AND ng.status != 'resolved'
          AND ng.status != 'closed'
        GROUP BY ng.id
        ORDER BY
          CASE ng.priority
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
            ELSE 5
          END,
          MAX(nm.created_at) DESC NULLS LAST
      `;

      const groups = await database.sequelize.query(query, {
        replacements: {
          companyId,
          userId,
          userIdJson: JSON.stringify([userId])
        },
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
        SELECT id
        FROM notification_groups
        WHERE id = :groupId
          AND metadata->'participants' @> :userIdJson::jsonb
      `;

      const accessCheck = await database.sequelize.query(accessQuery, {
        replacements: {
          groupId,
          userIdJson: JSON.stringify([userId])
        },
        type: QueryTypes.SELECT
      });

      if (accessCheck.length === 0) {
        throw new Error('User does not have access to this group');
      }

      // Get messages
      const query = `
        SELECT
          id,
          group_id,
          sequence_number,
          sender_type,
          sender_id,
          sender_name,
          recipient_type,
          recipient_id,
          recipient_name,
          message_type,
          subject,
          content,
          created_at,
          deadline_at,
          requires_response,
          delivered_at,
          read_at,
          responded_at,
          channels,
          channel_status,
          attachments,
          is_deleted,
          company_id
        FROM notification_messages
        WHERE group_id = :groupId
          AND is_deleted = false
        ORDER BY sequence_number ASC, created_at ASC
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
   * @param {string} senderName - Sender name
   * @param {string} content - Message content
   * @param {object} options - Message options (recipientType, recipientId, recipientName, subject, attachments, etc)
   * @returns {Promise<object>} Created message
   */
  async createMessage(groupId, senderId, senderType, senderName, content, options = {}) {
    try {
      // Verify group exists
      const groupQuery = `
        SELECT id, status, company_id
        FROM notification_groups
        WHERE id = :groupId
      `;

      const groupCheck = await database.sequelize.query(groupQuery, {
        replacements: { groupId },
        type: QueryTypes.SELECT
      });

      if (groupCheck.length === 0) {
        throw new Error('Group not found');
      }

      if (groupCheck[0].status === 'resolved' || groupCheck[0].status === 'closed') {
        throw new Error('Cannot add messages to a resolved or closed group');
      }

      // Get next sequence number
      const sequenceQuery = `
        SELECT COALESCE(MAX(sequence_number), 0) + 1 as next_sequence
        FROM notification_messages
        WHERE group_id = :groupId
      `;

      const sequenceResult = await database.sequelize.query(sequenceQuery, {
        replacements: { groupId },
        type: QueryTypes.SELECT
      });

      const sequenceNumber = sequenceResult[0].next_sequence;

      // Create message
      const query = `
        INSERT INTO notification_messages
          (id, group_id, sequence_number, sender_type, sender_id, sender_name,
           recipient_type, recipient_id, recipient_name, message_type, subject,
           content, created_at, requires_response, attachments, is_deleted, company_id)
        VALUES
          (gen_random_uuid(), :groupId, :sequenceNumber, :senderType, :senderId, :senderName,
           :recipientType, :recipientId, :recipientName, :messageType, :subject,
           :content, NOW(), :requiresResponse, :attachments, false, :companyId)
        RETURNING *
      `;

      const messages = await database.sequelize.query(query, {
        replacements: {
          groupId,
          sequenceNumber,
          senderId,
          senderType,
          senderName,
          recipientType: options.recipientType || null,
          recipientId: options.recipientId || null,
          recipientName: options.recipientName || null,
          messageType: options.messageType || 'text',
          subject: options.subject || null,
          content,
          requiresResponse: options.requiresResponse || false,
          attachments: options.attachments ? JSON.stringify(options.attachments) : null,
          companyId: groupCheck[0].company_id
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
        SET read_at = NOW()
        WHERE group_id = :groupId
          AND read_at IS NULL
        RETURNING id
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
        SET read_at = NOW()
        FROM notification_groups ng
        WHERE nm.group_id = ng.id
          AND ng.company_id = :companyId
          AND ng.metadata->'participants' @> :userIdJson::jsonb
          AND nm.read_at IS NULL
        RETURNING nm.id
      `;

      const result = await database.sequelize.query(query, {
        replacements: {
          companyId,
          userId,
          userIdJson: JSON.stringify([userId])
        },
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
        SELECT id
        FROM notification_groups
        WHERE id = :groupId
          AND metadata->'participants' @> :userIdJson::jsonb
      `;

      const accessCheck = await database.sequelize.query(accessQuery, {
        replacements: {
          groupId,
          userIdJson: JSON.stringify([userId])
        },
        type: QueryTypes.SELECT
      });

      if (accessCheck.length === 0) {
        throw new Error('User does not have access to this group');
      }

      // Resolve group
      const query = `
        UPDATE notification_groups
        SET status = 'resolved',
            closed_at = NOW(),
            closed_by = :userId
        WHERE id = :groupId
        RETURNING *
      `;

      const result = await database.sequelize.query(query, {
        replacements: { groupId, userId },
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
   * @param {string} groupType - Group type
   * @param {string} subject - Group subject/title
   * @param {string} initiatorType - Initiator type (employee, system, admin)
   * @param {string} initiatorId - Initiator ID
   * @param {Array<string>} participants - Array of participant IDs
   * @param {object} metadata - Group metadata
   * @param {string} priority - Priority level (critical, high, medium, low)
   * @param {string} status - Initial status (default: 'open')
   * @returns {Promise<object>} Created group
   */
  async createGroup(companyId, groupType, subject, initiatorType, initiatorId, participants, metadata = {}, priority = 'medium', status = 'open') {
    try {
      // Merge participants into metadata
      const fullMetadata = {
        ...metadata,
        participants: participants
      };

      const query = `
        INSERT INTO notification_groups
          (id, group_type, initiator_type, initiator_id, subject, status, priority, company_id, created_at, metadata)
        VALUES
          (gen_random_uuid(), :groupType, :initiatorType, :initiatorId, :subject, :status, :priority, :companyId, NOW(), :metadata)
        RETURNING *
      `;

      const groups = await database.sequelize.query(query, {
        replacements: {
          companyId,
          groupType,
          subject,
          initiatorType,
          initiatorId,
          status,
          priority,
          metadata: JSON.stringify(fullMetadata)
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
          COUNT(DISTINCT ng.id) as total_groups,
          COUNT(DISTINCT CASE WHEN ng.status = 'open' THEN ng.id END) as open_groups,
          COUNT(DISTINCT CASE WHEN ng.status = 'pending' THEN ng.id END) as pending_groups,
          COUNT(DISTINCT CASE WHEN ng.priority = 'critical' THEN ng.id END) as critical_priority_groups,
          COUNT(DISTINCT CASE WHEN ng.priority = 'high' THEN ng.id END) as high_priority_groups,
          COUNT(nm.id) as total_messages,
          COUNT(nm.id) FILTER (WHERE nm.read_at IS NULL) as unread_messages
        FROM notification_groups ng
        LEFT JOIN notification_messages nm ON ng.id = nm.group_id
        WHERE ng.company_id = :companyId
          AND ng.metadata->'participants' @> :userIdJson::jsonb
          AND ng.status != 'resolved'
          AND ng.status != 'closed'
      `;

      const stats = await database.sequelize.query(query, {
        replacements: {
          companyId,
          userId,
          userIdJson: JSON.stringify([userId])
        },
        type: QueryTypes.SELECT
      });

      return stats[0];
    } catch (error) {
      throw new Error(`Error getting stats: ${error.message}`);
    }
  }
}

module.exports = new NotificationService();
