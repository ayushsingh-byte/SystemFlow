const { validationResult } = require('express-validator');

/**
 * Middleware factory that runs express-validator checks and returns
 * a 400 response with an errors array if any validation fails.
 *
 * Usage:
 *   router.post('/route', validateBody([
 *     body('email').isEmail(),
 *     body('password').isLength({ min: 8 }),
 *   ]), controller);
 *
 * @param {Array} schema - Array of express-validator check() / body() chains
 * @returns {Array} Array of middleware functions (schema + validation runner)
 */
function validateBody(schema) {
  return [
    ...schema,
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          errors: errors.array().map((e) => ({
            field: e.path || e.param,
            message: e.msg,
          })),
        });
      }
      return next();
    },
  ];
}

module.exports = { validateBody };
