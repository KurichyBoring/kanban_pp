import { Request, Response } from 'express';
import prisma from '../models/prisma.js';

export const createCard = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { listId } = req.params;
    const { title, description, dueDate, priority } = req.body;
    
    const list = await prisma.list.findUnique({
      where: { id: listId },
      include: { board: { include: { members: true } } },
    });
    
    if (!list) {
      res.status(404).json({ error: 'List not found' });
      return;
    }
    
    const hasAccess = list.board.ownerId === userId ||
      list.board.members.some((m) => m.userId === userId);
    
    if (!hasAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    
    const maxPosition = await prisma.card.aggregate({
      where: { listId },
      _max: { position: true },
    });
    
    const card = await prisma.card.create({
      data: {
        title,
        description,
        listId,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority || 'medium',
        position: (maxPosition._max.position ?? -1) + 1,
      },
    });
    
    res.status(201).json(card);
  } catch (error) {
    console.error('CreateCard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateCard = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { title, description, dueDate, priority, listId, position } = req.body;
    
    const card = await prisma.card.findUnique({
      where: { id },
      include: { list: { include: { board: true } } },
    });
    
    if (!card) {
      res.status(404).json({ error: 'Card not found' });
      return;
    }
    
    const hasAccess = card.list.board.ownerId === userId ||
      await prisma.boardMember.findFirst({
        where: { boardId: card.list.boardId, userId },
      });
    
    if (!hasAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    
    const data: any = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (priority !== undefined) data.priority = priority;
    if (position !== undefined) data.position = position;
    if (listId !== undefined) data.listId = listId;
    
    const updated = await prisma.card.update({
      where: { id },
      data,
    });
    
    res.json(updated);
  } catch (error) {
    console.error('UpdateCard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteCard = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    
    const card = await prisma.card.findUnique({
      where: { id },
      include: { list: { include: { board: true } } },
    });
    
    if (!card) {
      res.status(404).json({ error: 'Card not found' });
      return;
    }
    
    const hasAccess = card.list.board.ownerId === userId ||
      await prisma.boardMember.findFirst({
        where: { boardId: card.list.boardId, userId },
      });
    
    if (!hasAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    
    await prisma.card.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('DeleteCard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const moveCard = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { listId, position } = req.body;
    
    const card = await prisma.card.findUnique({
      where: { id },
      include: { list: { include: { board: true } } },
    });
    
    if (!card) {
      res.status(404).json({ error: 'Card not found' });
      return;
    }
    
    const hasAccess = card.list.board.ownerId === userId ||
      await prisma.boardMember.findFirst({
        where: { boardId: card.list.boardId, userId },
      });
    
    if (!hasAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    
    const updated = await prisma.card.update({
      where: { id },
      data: { listId, position },
    });
    
    res.json(updated);
  } catch (error) {
    console.error('MoveCard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};