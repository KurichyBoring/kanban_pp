import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  createBoard,
  getBoards,
  getBoard,
  updateBoard,
  deleteBoard,
  addMember,
} from '../controllers/boards.js';

const router = Router();

router.use(authMiddleware);

router.post('/', createBoard);
router.get('/', getBoards);
router.get('/:id', getBoard);
router.put('/:id', updateBoard);
router.delete('/:id', deleteBoard);
router.post('/:id/members', addMember);

export default router;