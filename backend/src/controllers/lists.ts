import { Request, Response } from 'express';
import prisma from '../models/prisma.js';

export const createList = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { boardId } = req.params;
    const { title } = req.body;
    
    const board = await prisma.board.findFirst({
      where: { id: boardId, OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
    });
    
    if (!board) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    
    const maxPosition = await prisma.list.aggregate({
      where: { boardId },
      _max: { position: true },
    });
    
    const list = await prisma.list.create({
      data: { title, boardId, position: (maxPosition._max.position ?? -1) + 1 },
      include: { cards: { orderBy: { position: 'asc' } } },
    });
    
    res.status(201).json(list);
  } catch (error) {
    console.error('CreateList error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateList = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { title, position } = req.body;
    
    const list = await prisma.list.findUnique({ where: { id }, include: { board: true } });
    if (!list) {
      res.status(404).json({ error: 'List not found' });
      return;
    }
    
    const hasAccess = list.board.ownerId === userId || 
      await prisma.boardMember.findFirst({ where: { boardId: list.boardId, userId } });
    
    if (!hasAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    
    const updated = await prisma.list.update({
      where: { id },
      data: { ...(title && { title }), ...(position !== undefined && { position }) },
      include: { cards: { orderBy: { position: 'asc' } } },
    });
    
    res.json(updated);
  } catch (error) {
    console.error('UpdateList error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteList = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    
    const list = await prisma.list.findUnique({ where: { id }, include: { board: true } });
    if (!list) {
      res.status(404).json({ error: 'List not found' });
      return;
    }
    
    if (list.board.ownerId !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    
    await prisma.list.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('DeleteList error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const reorderLists = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { boardId } = req.params;
    const { listIds } = req.body;
    
    const board = await prisma.board.findFirst({
      where: { id: boardId, ownerId: userId },
    });
    
    if (!board) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    
    await prisma.$transaction(
      listIds.map((listId: string, index: number) =>
        prisma.list.update({ where: { id: listId }, data: { position: index } })
      )
    );
    
    res.json({ message: 'Lists reordered' });
  } catch (error) {
    console.error('ReorderLists error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};