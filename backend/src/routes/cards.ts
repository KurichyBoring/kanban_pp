import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { createCard, updateCard, deleteCard, moveCard } from '../controllers/cards.js';

const router = Router();

router.use(authMiddleware);

router.post('/lists/:listId/cards', createCard);
router.put('/cards/:id', updateCard);
router.delete('/cards/:id', deleteCard);
router.put('/cards/:id/move', moveCard);

export default router;