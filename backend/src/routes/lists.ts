import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { createList, updateList, deleteList, reorderLists } from '../controllers/lists.js';

const router = Router();

router.use(authMiddleware);

router.post('/boards/:boardId/lists', createList);
router.put('/lists/:id', updateList);
router.delete('/lists/:id', deleteList);
router.put('/boards/:boardId/lists/reorder', reorderLists);

export default router;