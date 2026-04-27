import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { register, login, getMe } from '../controllers/auth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authMiddleware, getMe);

// Test user endpoint - создаёт тестового пользователя
router.post('/test-user', async (req, res) => {
  try {
    const { register: reg } = await import('../controllers/auth.js');
    req.body = { email: 'test@test.com', password: 'test123', name: 'Test User' };
    await reg(req, res);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;