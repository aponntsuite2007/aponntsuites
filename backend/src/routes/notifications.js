const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');

/**
 * GET /groups - Get notification groups for the current user
 */
router.get('/groups', async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'];
    const userId = req.headers['x-user-id'];
    const userRole = req.headers['x-role'];

    if (!companyId || !userId || !userRole) {
      return res.status(400).json({
        success: false,
        error: 'Missing required headers: x-company-id, x-user-id, x-role'
      });
    }

    const groups = await notificationService.getGroupsForUser(companyId, userId, userRole);

    res.json({
      success: true,
      data: groups
    });
  } catch (error) {
    console.error('Error getting notification groups:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /groups/:groupId/messages - Get messages from a specific group
 */
router.get('/groups/:groupId/messages', async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required header: x-user-id'
      });
    }

    const messages = await notificationService.getGroupMessages(groupId, userId);

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Error getting group messages:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /groups/:groupId/messages - Create a new message in a group
 */
router.post('/groups/:groupId/messages', async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.headers['x-user-id'];
    const { messageText, metadata } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required header: x-user-id'
      });
    }

    if (!messageText) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: messageText'
      });
    }

    const message = await notificationService.createMessage(
      groupId,
      userId,
      'user',
      messageText,
      metadata
    );

    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /groups/:groupId/read - Mark a group as read
 */
router.put('/groups/:groupId/read', async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required header: x-user-id'
      });
    }

    const result = await notificationService.markGroupAsRead(groupId, userId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error marking group as read:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /groups/mark-all-read - Mark all groups as read
 */
router.put('/groups/mark-all-read', async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'];
    const userId = req.headers['x-user-id'];

    if (!companyId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required headers: x-company-id, x-user-id'
      });
    }

    const result = await notificationService.markAllAsRead(companyId, userId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /groups/:groupId/resolve - Resolve a notification group
 */
router.put('/groups/:groupId/resolve', async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required header: x-user-id'
      });
    }

    const result = await notificationService.resolveGroup(groupId, userId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error resolving group:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /stats - Get notification statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'];
    const userId = req.headers['x-user-id'];
    const userRole = req.headers['x-role'];

    if (!companyId || !userId || !userRole) {
      return res.status(400).json({
        success: false,
        error: 'Missing required headers: x-company-id, x-user-id, x-role'
      });
    }

    const stats = await notificationService.getStats(companyId, userId, userRole);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting notification stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
