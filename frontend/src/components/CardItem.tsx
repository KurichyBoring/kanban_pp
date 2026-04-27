import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '../types';

interface CardItemProps {
  card: Card;
  onClick: () => void;
}

export const CardItem = ({ card, onClick }: CardItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="bg-white rounded shadow-sm p-3 cursor-pointer hover:shadow-md transition card-drag"
    >
      <h4 className="text-sm text-gray-800">{card.title}</h4>
      {card.description && (
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{card.description}</p>
      )}
      {card.dueDate && (
        <p className="text-xs text-gray-400 mt-2">
          📅 {new Date(card.dueDate).toLocaleDateString()}
        </p>
      )}
      {card.labels && card.labels.length > 0 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {card.labels.map((label) => (
            <span
              key={label.id}
              className="text-xs px-2 py-0.5 rounded"
              style={{ backgroundColor: label.color, color: '#fff' }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};