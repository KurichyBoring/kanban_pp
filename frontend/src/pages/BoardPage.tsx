import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DndContext, DragEndEvent, DragOverEvent, DragStartEvent, PointerSensor, useSensor, useSensors, closestCorners, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Board, List, Card } from '../types';
import api from '../utils/api';
import { toast } from 'sonner';

const PriorityBadge = ({ priority }: { priority: string }) => {
  const colors: Record<string, string> = {
    urgent: 'bg-red-100 text-red-700 border-red-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    medium: 'bg-blue-100 text-blue-700 border-blue-200',
    low: 'bg-gray-100 text-gray-700 border-gray-200',
  };
  const labels: Record<string, string> = {
    urgent: 'срочный',
    high: 'высокий',
    medium: 'средний',
    low: 'низкий',
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${colors[priority] || colors.low}`}>
      {labels[priority] || priority}
    </span>
  );
};

const DueBadge = ({ date }: { date: string }) => {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return <span className="text-[10px] px-1.5 py-0.5 rounded text-red-600 bg-red-50">Просрочено</span>;
  if (days === 0) return <span className="text-[10px] px-1.5 py-0.5 rounded text-orange-600 bg-orange-50">Сегодня</span>;
  if (days === 1) return <span className="text-[10px] px-1.5 py-0.5 rounded text-yellow-600 bg-yellow-50">Завтра</span>;
  if (days <= 7) return <span className="text-[10px] px-1.5 py-0.5 rounded text-blue-600 bg-blue-50">{days}д</span>;
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded text-gray-600 bg-gray-50">
      {d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
    </span>
  );
};

const SortableCard = ({ card, onClick, onDelete }: { card: Card; onClick: () => void; onDelete: () => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="bg-white rounded border border-gray-200 p-2.5 cursor-pointer hover:border-gray-300 hover:shadow-sm transition group relative"
    >
      <p className="text-sm text-gray-800 font-medium">{card.title}</p>
      {(card.description || card.dueDate || card.priority) && (
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {card.priority && card.priority !== 'medium' && <PriorityBadge priority={card.priority} />}
          {card.dueDate && <DueBadge date={card.dueDate} />}
        </div>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(); }}
        className="hidden group-hover:block absolute top-1 right-1 text-gray-400 hover:text-red-500"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export const BoardPage = () => {
  const { id } = useParams<{ id: string }>();
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [newListTitle, setNewListTitle] = useState('');
  const [addingList, setAddingList] = useState(false);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListTitle, setEditingListTitle] = useState('');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [quickAddCard, setQuickAddCard] = useState<string | null>(null);
  const [quickCardTitle, setQuickCardTitle] = useState('');
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    if (id) loadBoard();
  }, [id]);

  const loadBoard = async () => {
    try {
      const res = await api.get(`/boards/${id}`);
      setBoard(res.data);
    } catch (e) {
      console.error(e);
      toast.error('Не удалось загрузить доску');
    } finally {
      setLoading(false);
    }
  };

  const createList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListTitle.trim() || !id) return;
    setAddingList(true);
    try {
      const res = await api.post(`/boards/${id}/lists`, { title: newListTitle });
      setBoard({ ...board!, lists: [...board!.lists, res.data] });
      setNewListTitle('');
      setAddingList(false);
    } catch (e) {
      toast.error('Не удалось создать колонку');
      setAddingList(false);
    }
  };

  const updateList = async (listId: string) => {
    if (!editingListTitle.trim()) return;
    try {
      await api.put(`/lists/${listId}`, { title: editingListTitle });
      setBoard({
        ...board!,
        lists: board!.lists.map(l => l.id === listId ? { ...l, title: editingListTitle } : l)
      });
      setEditingListId(null);
      toast.success('Колонка переименована');
    } catch (e) {
      toast.error('Не удалось обновить колонку');
    }
  };

  const deleteList = async (listId: string) => {
    if (!confirm('Удалить эту колонку вместе со всеми карточками?')) return;
    try {
      await api.delete(`/lists/${listId}`);
      setBoard({ ...board!, lists: board!.lists.filter((l) => l.id !== listId) });
      toast.success('Колонка удалена');
    } catch (e) {
      toast.error('Не удалось удалить колонку');
    }
  };

  const createQuickCard = async (listId: string) => {
    if (!quickCardTitle.trim()) return;
    try {
      const res = await api.post(`/lists/${listId}/cards`, { title: quickCardTitle });
      setBoard({
        ...board!,
        lists: board!.lists.map(l => 
          l.id === listId ? { ...l, cards: [...l.cards, res.data] } : l
        )
      });
      setQuickCardTitle('');
      setQuickAddCard(null);
    } catch (e) {
      toast.error('Не удалось создать карточку');
    }
  };

  const deleteCard = async (cardId: string, listId: string) => {
    try {
      await api.delete(`/cards/${cardId}`);
      setBoard({
        ...board!,
        lists: board!.lists.map(l => 
          l.id === listId ? { ...l, cards: l.cards.filter(c => c.id !== cardId) } : l
        )
      });
      toast.success('Карточка удалена');
    } catch (e) {
      toast.error('Не удалось удалить карточку');
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    const allCards = board?.lists.flatMap(l => l.cards) || [];
    const card = allCards.find(c => c.id === active.id);
    setActiveCard(card || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !board) return;
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    const activeList = board.lists.find((l) => l.id === activeId || l.cards.some((c) => c.id === activeId));
    const overList = board.lists.find((l) => l.id === overId || l.cards.some((c) => c.id === overId));
    
    if (!activeList || !overList || activeList.id === overList.id) return;
    
    const newLists = [...board.lists];
    const activeCards = [...newLists.find((l) => l.id === activeList.id)!.cards];
    const overCards = [...newLists.find((l) => l.id === overList.id)!.cards];
    
    const activeCardIndex = activeCards.findIndex((c) => c.id === activeId);
    const overCardIndex = overCards.findIndex((c) => c.id === overId);
    
    const [card] = activeCards.splice(activeCardIndex, 1);
    const insertIndex = overCardIndex >= 0 ? overCardIndex : overCards.length;
    
    overCards.splice(insertIndex, 0, card);
    
    newLists.find((l) => l.id === activeList.id)!.cards = activeCards;
    newLists.find((l) => l.id === overList.id)!.cards = overCards;
    
    setBoard({ ...board, lists: newLists });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    setActiveCard(null);
    const { active, over } = event;
    if (!over || !board) return;
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    const activeList = board.lists.find((l) => l.id === activeId || l.cards.some((c) => c.id === activeId));
    const overList = board.lists.find((l) => l.id === overId || l.cards.some((c) => c.id === overId));
    
    if (!activeList || !overList) return;
    
    if (activeList.id !== overList.id || activeId !== overId) {
      try {
        if (activeList.id === overList.id) {
          const cards = [...activeList.cards];
          const oldIndex = cards.findIndex((c) => c.id === activeId);
          const newIndex = cards.findIndex((c) => c.id === overId);
          
          if (oldIndex !== newIndex) {
            const reordered = arrayMove(cards, oldIndex, newIndex);
            const newLists = board.lists.map((l) => 
              l.id === activeList.id ? { ...l, cards: reordered } : l
            );
            setBoard({ ...board, lists: newLists });
            
            await api.put(`/cards/${activeId}/move`, { 
              listId: overList.id, 
              position: newIndex 
            });
          }
        } else {
          await api.put(`/cards/${activeId}/move`, { 
            listId: overList.id, 
            position: overList.cards.length 
          });
        }
      } catch (e) {
        loadBoard();
      }
    }
  };

  const updateCard = async (cardId: string, data: Partial<Card>) => {
    try {
      const res = await api.put(`/cards/${cardId}`, data);
      if (!board) return;
      
      const newLists = board.lists.map((list) => ({
        ...list,
        cards: list.cards.map((c) => c.id === cardId ? { ...c, ...res.data } : c),
      }));
      setBoard({ ...board, lists: newLists });
      setSelectedCard(null);
      toast.success('Карточка обновлена');
    } catch (e) {
      toast.error('Не удалось обновить карточку');
    }
  };

  const inviteMember = async () => {
    if (!inviteEmail.trim() || !id) return;
    setInviting(true);
    try {
      await api.post(`/boards/${id}/members`, { email: inviteEmail });
      toast.success('Участник добавлен');
      setInviteEmail('');
      loadBoard();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Не удалось добавить участника');
    } finally {
      setInviting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Доска не найдена</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-full mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Доски
            </Link>
            <div className="h-4 w-px bg-gray-300"></div>
            <h1 className="text-lg font-semibold text-gray-800">{board.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative group">
              <button
                onClick={() => setShowMembersModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                Участники
                <span className="text-xs text-gray-400">({(board.members?.length || 0) + 1})</span>
              </button>
              <div className="absolute top-full right-0 mt-1 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">
                Добавить участников по email
              </div>
            </div>
            <div className="flex -space-x-1">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-medium border-2 border-white" title={board.owner?.name}>
                {board.owner?.name?.[0]?.toUpperCase()}
              </div>
              {board.members?.slice(0, 2).map((m) => (
                <div key={m.id} className="w-7 h-7 rounded-full bg-gray-500 flex items-center justify-center text-white text-xs font-medium border-2 border-white" title={m.user?.name}>
                  {m.user?.name?.[0]?.toUpperCase()}
                </div>
              ))}
              {(board.members?.length || 0) > 2 && (
                <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-medium border-2 border-white">
                  +{(board.members?.length || 0) - 2}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {board.lists.length === 0 ? (
            <div className="w-full h-[calc(100vh-120px)] overflow-y-auto">
              <div className="max-w-xl mx-auto px-6 py-8">
                {!addingList ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-semibold text-gray-800 mb-1">Доска пуста</h2>
                    <p className="text-gray-500 text-sm mb-4">
                      Создайте первую колонку, чтобы начать работу с задачами.
                    </p>
                    <button
                      onClick={() => setAddingList(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium inline-flex items-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Создать первую колонку
                    </button>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">Новая колонка</h3>
                    <form onSubmit={createList}>
                      <input
                        autoFocus
                        value={newListTitle}
                        onChange={(e) => setNewListTitle(e.target.value)}
                        placeholder="Название колонки..."
                        className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 mb-3"
                      />
                      <div className="flex gap-2">
                        <button type="submit" disabled={!newListTitle.trim()} className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50">
                          Добавить
                        </button>
                        <button type="button" onClick={() => { setAddingList(false); setNewListTitle(''); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm">
                          Отмена
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="text-left mt-6">
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-5">
                    <h3 className="text-sm font-semibold text-blue-800 mb-2">О kanban-доске</h3>
                    <p className="text-xs text-blue-700 leading-relaxed mb-3">
                      Kanban-доска — это полноценная система управления задачами с интуитивным визуальным интерфейсом. 
                      Задачи создаются с указанием названия, подробного описания и уровня приоритета. 
                      Каждая задача может иметь один из четырёх уровней приоритета: низкий, средний, высокий или срочный — 
                      они визуально выделяются цветовой маркировкой. Задачи перемещаются между колонками 
                      с помощью drag-and-drop, что позволяет мгновенно обновлять статус выполнения.
                    </p>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li className="flex items-center gap-2">
                        <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Создание колонок и карточек с drag-and-drop
                      </li>
                      <li className="flex items-center gap-2">
                        <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Приоритеты задач: низкий, средний, высокий, срочный
                      </li>
                      <li className="flex items-center gap-2">
                        <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Добавление описаний и сроков выполнения
                      </li>
                      <li className="flex items-center gap-2">
                        <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Адаптивный интерфейс для любых устройств
                      </li>
                    </ul>
                  </div>

                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Пример доски</h3>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    <div className="w-64 flex-shrink-0 bg-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-700 text-sm">Нужно сделать</h4>
                        <span className="text-xs text-gray-500">3</span>
                      </div>
                      <div className="space-y-2">
                        <div className="bg-white rounded border border-gray-200 p-2.5">
                          <p className="text-sm text-gray-800 font-medium">Дизайн главной</p>
                          <div className="flex items-center gap-1.5 mt-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded border bg-orange-100 text-orange-700 border-orange-200">высокий</span>
                          </div>
                        </div>
                        <div className="bg-white rounded border border-gray-200 p-2.5">
                          <p className="text-sm text-gray-800 font-medium">Написать документацию</p>
                        </div>
                        <div className="bg-white rounded border border-gray-200 p-2.5">
                          <p className="text-sm text-gray-800 font-medium">Исправить баг входа</p>
                          <div className="flex items-center gap-1.5 mt-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded border bg-red-100 text-red-700 border-red-200">срочный</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded text-red-600 bg-red-50">Просрочено</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="w-64 flex-shrink-0 bg-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-700 text-sm">В процессе</h4>
                        <span className="text-xs text-gray-500">2</span>
                      </div>
                      <div className="space-y-2">
                        <div className="bg-white rounded border border-gray-200 p-2.5">
                          <p className="text-sm text-gray-800 font-medium">Настройка CI/CD</p>
                          <div className="flex items-center gap-1.5 mt-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded border bg-blue-100 text-blue-700 border-blue-200">средний</span>
                          </div>
                        </div>
                        <div className="bg-white rounded border border-gray-200 p-2.5">
                          <p className="text-sm text-gray-800 font-medium">Рефакторинг авторизации</p>
                          <div className="flex items-center gap-1.5 mt-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded text-blue-600 bg-blue-50">Сегодня</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="w-64 flex-shrink-0 bg-gray-200 rounded-lg p-3 opacity-60">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-700 text-sm">Готово</h4>
                        <span className="text-xs text-gray-500">1</span>
                      </div>
                      <div className="space-y-2">
                        <div className="bg-white rounded border border-gray-200 p-2.5">
                          <p className="text-sm text-gray-800 font-medium line-through">Первоначальная настройка</p>
                          <div className="flex items-center gap-1.5 mt-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded border bg-green-100 text-green-700 border-green-200">низкий</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex gap-3 h-[calc(100vh-120px)] min-w-max">
              {board.lists.map((list) => (
                <div key={list.id} className="w-72 flex-shrink-0 bg-gray-200 rounded-lg flex flex-col max-h-full">
                  <div className="p-3 flex items-center justify-between">
                    {editingListId === list.id ? (
                      <input
                        autoFocus
                        value={editingListTitle}
                        onChange={(e) => setEditingListTitle(e.target.value)}
                        onBlur={() => updateList(list.id)}
                        onKeyDown={(e) => e.key === 'Enter' && updateList(list.id)}
                        className="flex-1 bg-white px-2 py-1 rounded text-sm border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <h3
                        onClick={() => { setEditingListId(list.id); setEditingListTitle(list.title); }}
                        className="font-medium text-gray-700 cursor-pointer hover:text-gray-900 text-sm group flex items-center gap-1"
                      >
                        {list.title}
                        <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </h3>
                    )}
                    <div className="flex items-center gap-1 ml-2">
                      <span className="text-xs text-gray-500">{list.cards.length}</span>
                      <button onClick={() => deleteList(list.id)} className="text-gray-400 hover:text-red-500 p-1" title="Удалить колонку">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
                    <SortableContext items={list.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                      {list.cards.map((card) => (
                        <SortableCard
                          key={card.id}
                          card={card}
                          onClick={() => setSelectedCard(card)}
                          onDelete={() => deleteCard(card.id, list.id)}
                        />
                      ))}
                    </SortableContext>
                    
                    {quickAddCard === list.id ? (
                      <div className="bg-white rounded border border-gray-200 p-2">
                        <input
                          autoFocus
                          value={quickCardTitle}
                          onChange={(e) => setQuickCardTitle(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && createQuickCard(list.id)}
                          placeholder="Название карточки..."
                          className="w-full text-sm bg-transparent focus:outline-none"
                        />
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => createQuickCard(list.id)} className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">Добавить</button>
                          <button onClick={() => { setQuickAddCard(null); setQuickCardTitle(''); }} className="px-2 py-1 text-gray-600 text-xs hover:bg-gray-100 rounded">Отмена</button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setQuickAddCard(list.id)}
                        className="w-full text-left text-gray-500 hover:text-gray-700 hover:bg-gray-300 p-2 rounded text-sm transition flex items-center gap-1"
                        title="Добавить карточку"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Добавить карточку
                      </button>
                    )}
                  </div>
                </div>
              ))}
              
              <div className="w-72 flex-shrink-0">
                {addingList ? (
                  <form onSubmit={createList} className="bg-white rounded-lg border border-gray-200 p-3">
                    <input
                      autoFocus
                      value={newListTitle}
                      onChange={(e) => setNewListTitle(e.target.value)}
                      placeholder="Название колонки..."
                      className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <div className="flex gap-2 mt-2">
                      <button type="submit" disabled={!newListTitle.trim()} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50">
                        Добавить колонку
                      </button>
                      <button type="button" onClick={() => { setAddingList(false); setNewListTitle(''); }} className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded text-sm">
                        Отмена
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setAddingList(true)}
                    className="w-full bg-white/50 hover:bg-white text-gray-600 p-3 rounded-lg border border-gray-200 transition flex items-center gap-2 text-sm font-medium"
                    title="Добавить новую колонку"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Добавить колонку
                  </button>
                )}
              </div>
            </div>
          )}
          
          <DragOverlay>
            {activeCard ? (
              <div className="bg-white rounded border border-blue-300 p-2.5 shadow-lg opacity-90 rotate-2 cursor-grabbing">
                <p className="text-sm text-gray-800 font-medium">{activeCard.title}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>

      {selectedCard && (
        <CardModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onSave={(data) => updateCard(selectedCard.id, data)}
        />
      )}

      {showMembersModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onMouseDown={() => setShowMembersModal(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onMouseDown={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Участники доски</h3>
              <button onClick={() => setShowMembersModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-xs text-blue-700">
                  Приглашайте участников по email, чтобы они могли просматривать и редактировать 
                  задачи на этой доске. Все участники могут создавать, изменять и перемещать карточки.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Email участника</label>
                <div className="flex gap-2">
                  <input
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="example@mail.com"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    onKeyDown={(e) => e.key === 'Enter' && inviteMember()}
                  />
                  <button
                    onClick={inviteMember}
                    disabled={inviting || !inviteEmail.trim()}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    {inviting ? '...' : 'Пригласить'}
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Текущие участники</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-medium">
                      {board.owner?.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{board.owner?.name}</p>
                      <p className="text-xs text-gray-500">{board.owner?.email}</p>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Владелец</span>
                  </div>
                  {board.members?.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white text-xs font-medium">
                        {m.user?.name?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{m.user?.name}</p>
                        <p className="text-xs text-gray-500">{m.user?.email}</p>
                      </div>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                        {m.role === 'OWNER' ? 'Владелец' : 'Участник'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CardModal = ({ card, onClose, onSave }: { card: Card; onClose: () => void; onSave: (data: Partial<Card>) => Promise<void> }) => {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [dueDate, setDueDate] = useState(card.dueDate ? new Date(card.dueDate).toISOString().split('T')[0] : '');
  const [priority, setPriority] = useState(card.priority || 'medium');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ title, description, dueDate: dueDate || undefined, priority });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onMouseDown={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg" onMouseDown={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg font-semibold text-gray-900 w-full focus:outline-none"
            placeholder="Название задачи"
          />
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-2 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
              placeholder="Добавьте описание..."
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Срок выполнения</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Приоритет</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="low">Низкий</option>
                <option value="medium">Средний</option>
                <option value="high">Высокий</option>
                <option value="urgent">Срочный</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md text-sm transition">
            Отмена
          </button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition text-sm">
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
};
