import { Request, Response } from 'express';
import prisma from '../models/prisma.js';

export const createList = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { boardId } = req.params;
    const boardIdInt = parseInt(boardId, 10);
    const { title } = req.body;

    if (isNaN(boardIdInt)) {
      res.status(400).json({ error: 'Invalid board ID' });
      return;
    }

    const board = await prisma.board.findFirst({
      where: { id: boardIdInt, OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
    });

    if (!board) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const maxPosition = await prisma.list.aggregate({
      where: { boardId: boardIdInt },
      _max: { position: true },
    });

    const list = await prisma.list.create({
      data: { title, boardId: boardIdInt, position: (maxPosition._max.position ?? -1) + 1 },
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
    const listId = parseInt(id, 10);
    const { title, position } = req.body;

    if (isNaN(listId)) {
      res.status(400).json({ error: 'Invalid list ID' });
      return;
    }

    const list = await prisma.list.findUnique({ where: { id: listId }, include: { board: true } });
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
      where: { id: listId },
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
    const listId = parseInt(id, 10);

    if (isNaN(listId)) {
      res.status(400).json({ error: 'Invalid list ID' });
      return;
    }

    const list = await prisma.list.findUnique({ where: { id: listId }, include: { board: true } });
    if (!list) {
      res.status(404).json({ error: 'List not found' });
      return;
    }

    if (list.board.ownerId !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    await prisma.list.delete({ where: { id: listId } });
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
    const boardIdInt = parseInt(boardId, 10);
    const { listIds } = req.body;

    if (isNaN(boardIdInt)) {
      res.status(400).json({ error: 'Invalid board ID' });
      return;
    }

    const board = await prisma.board.findFirst({
      where: { id: boardIdInt, ownerId: userId },
    });

    if (!board) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    await prisma.$transaction(
      listIds.map((listId: string, index: number) => {
        const lid = parseInt(listId, 10);
        if (isNaN(lid)) throw new Error('Invalid list ID in listIds');
        return prisma.list.update({ where: { id: lid }, data: { position: index } });
      })
    );

    res.json({ message: 'Lists reordered' });
  } catch (error) {
    console.error('ReorderLists error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
