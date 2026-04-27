import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { List, Card } from '../types';
import api from '../utils/api';
import { CardItem } from './CardItem';

interface ListColumnProps {
  list: List;
  onDelete: () => void;
  onCardClick: (card: Card) => void;
}

export const ListColumn = ({ list, onDelete, onCardClick }: ListColumnProps) => {
  const [addingCard, setAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: list.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const addCard = async () => {
    if (!newCardTitle.trim()) return;
    try {
      const res = await api.post(`/lists/${list.id}/cards`, { title: newCardTitle });
      list.cards.push(res.data);
      setNewCardTitle('');
      setAddingCard(false);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="flex-shrink-0 w-72 flex flex-col">
      <div {...attributes} {...listeners} className="bg-gray-200 rounded-lg shadow-sm p-3 cursor-grab active:cursor-grabbing">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold text-gray-700">{list.title}</h3>
          <button onClick={onDelete} className="text-gray-500 hover:text-red-600">✕</button>
        </div>
        
        <div className="space-y-2 max-h-[calc(100vh-240px)] overflow-y-auto">
          {list.cards.map((card) => (
            <CardItem key={card.id} card={card} onClick={() => onCardClick(card)} />
          ))}
        </div>
        
        {addingCard ? (
          <div className="mt-2">
            <input
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              placeholder="Card title..."
              autoFocus
              className="w-full px-2 py-1 border rounded text-sm"
              onKeyDown={(e) => e.key === 'Enter' && addCard()}
            />
            <div className="flex gap-2 mt-2">
              <button onClick={addCard} className="flex-1 py-1 bg-blue-600 text-white rounded text-sm">
                Add
              </button>
              <button onClick={() => setAddingCard(false)} className="py-1 px-2 text-gray-600">
                ✕
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingCard(true)}
            className="mt-2 w-full py-1 text-left text-gray-600 hover:bg-gray-300 rounded text-sm"
          >
            + Add card
          </button>
        )}
      </div>
    </div>
  );
};