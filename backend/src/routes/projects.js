const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const authMiddleware = require('../middleware/auth');

// All project routes require authentication
router.use(authMiddleware);

// POST /api/projects — create a project
router.post('/', projectController.create);

// GET /api/projects — list all projects for the current user (paginated)
router.get('/', projectController.list);

// GET /api/projects/:id — get a single project
router.get('/:id', projectController.getOne);

// PUT /api/projects/:id — update a project
router.put('/:id', projectController.update);

// DELETE /api/projects/:id — delete a project
router.delete('/:id', projectController.delete);

// POST /api/projects/:id/duplicate — duplicate a project
router.post('/:id/duplicate', projectController.duplicate);

module.exports = router;
