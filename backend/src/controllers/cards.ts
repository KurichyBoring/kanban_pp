import { Request, Response } from 'express';
import prisma from '../models/prisma.js';

export const createCard = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { listId } = req.params;
    const listIdInt = parseInt(listId, 10);
    const { title, description, dueDate, priority } = req.body;

    if (isNaN(listIdInt)) {
      res.status(400).json({ error: 'Invalid list ID' });
      return;
    }

    const list = await prisma.list.findUnique({
      where: { id: listIdInt },
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
      where: { listId: listIdInt },
      _max: { position: true },
    });

    const card = await prisma.card.create({
      data: {
        title,
        description,
        listId: listIdInt,
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
    const cardId = parseInt(id, 10);
    const { title, description, dueDate, priority, listId, position } = req.body;

    if (isNaN(cardId)) {
      res.status(400).json({ error: 'Invalid card ID' });
      return;
    }

    const card = await prisma.card.findUnique({
      where: { id: cardId },
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
    if (listId !== undefined) data.listId = parseInt(listId, 10);

    const updated = await prisma.card.update({
      where: { id: cardId },
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
    const cardId = parseInt(id, 10);

    if (isNaN(cardId)) {
      res.status(400).json({ error: 'Invalid card ID' });
      return;
    }

    const card = await prisma.card.findUnique({
      where: { id: cardId },
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

    await prisma.card.delete({ where: { id: cardId } });
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
    const cardId = parseInt(id, 10);
    const { listId, position } = req.body;
    const listIdInt = parseInt(listId, 10);

    if (isNaN(cardId) || isNaN(listIdInt)) {
      res.status(400).json({ error: 'Invalid ID' });
      return;
    }

    const card = await prisma.card.findUnique({
      where: { id: cardId },
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
      where: { id: cardId },
      data: { listId: listIdInt, position },
    });

    res.json(updated);
  } catch (error) {
    console.error('MoveCard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
