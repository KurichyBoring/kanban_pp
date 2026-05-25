import { Request, Response } from 'express';
import prisma from '../models/prisma.js';

export const createBoard = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { title } = req.body;
    
    const board = await prisma.board.create({
      data: { title, ownerId: userId },
      include: {
        lists: { orderBy: { position: 'asc' } },
        members: { include: { user: true } },
      },
    });
    
    res.status(201).json(board);
  } catch (error) {
    console.error('CreateBoard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getBoards = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    
    const boards = await prisma.board.findMany({
      where: {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      include: {
        lists: { orderBy: { position: 'asc' } },
        owner: { select: { id: true, name: true, email: true } },
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    
    res.json(boards);
  } catch (error) {
    console.error('GetBoards error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getBoard = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const boardId = parseInt(id, 10);
    
    if (isNaN(boardId)) {
      res.status(400).json({ error: 'Invalid board ID' });
      return;
    }
    
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      include: {
        lists: {
          orderBy: { position: 'asc' },
          include: {
            cards: { orderBy: { position: 'asc' } },
          },
        },
        owner: { select: { id: true, name: true, email: true } },
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });
    
    if (!board) {
      res.status(404).json({ error: 'Board not found' });
      return;
    }
    
    res.json(board);
  } catch (error) {
    console.error('GetBoard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateBoard = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const boardId = parseInt(id, 10);
    
    if (isNaN(boardId)) {
      res.status(400).json({ error: 'Invalid board ID' });
      return;
    }
    
    const { title } = req.body;
    
    const board = await prisma.board.findFirst({
      where: { id: boardId, ownerId: userId },
    });
    
    if (!board) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    
    const updated = await prisma.board.update({
      where: { id: boardId },
      data: { title },
    });
    
    res.json(updated);
  } catch (error) {
    console.error('UpdateBoard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteBoard = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const boardId = parseInt(id, 10);
    
    if (isNaN(boardId)) {
      res.status(400).json({ error: 'Invalid board ID' });
      return;
    }
    
    const board = await prisma.board.findFirst({
      where: { id: boardId, ownerId: userId },
    });
    
    if (!board) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    
    await prisma.board.delete({ where: { id: boardId } });
    res.status(204).send();
  } catch (error) {
    console.error('DeleteBoard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const boardId = parseInt(id, 10);
    const { email } = req.body;
    
    if (isNaN(boardId)) {
      res.status(400).json({ error: 'Invalid board ID' });
      return;
    }
    
    const board = await prisma.board.findFirst({
      where: { id: boardId, ownerId: userId },
    });
    
    if (!board) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    await prisma.boardMember.upsert({
      where: { boardId_userId: { boardId: boardId, userId: user.id } },
      update: {},
      create: { boardId: boardId, userId: user.id, role: 'MEMBER' },
    });
    
    res.status(201).json({ message: 'Member added' });
  } catch (error) {
    console.error('AddMember error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};