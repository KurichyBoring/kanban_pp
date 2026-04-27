import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DndContext, DragEndEvent, DragOverEvent, DragStartEvent, PointerSensor, useSensor, useSensors, closestCorners, DragOverlay } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Board, List, Card } from '../types';
import api from '../utils/api';
import { toast } from 'sonner';

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
      toast.error('Failed to load board');
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
      toast.error('Failed to create list');
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
    } catch (e) {
      toast.error('Failed to update list');
    }
  };

  const deleteList = async (listId: string) => {
    if (!confirm('Delete this list and all cards?')) return;
    try {
      await api.delete(`/lists/${listId}`);
      setBoard({ ...board!, lists: board!.lists.filter((l) => l.id !== listId) });
      toast.success('List deleted');
    } catch (e) {
      toast.error('Failed to delete list');
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
      toast.error('Failed to create card');
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
      toast.success('Card deleted');
    } catch (e) {
      toast.error('Failed to delete card');
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
      toast.success('Card updated');
    } catch (e) {
      toast.error('Failed to update card');
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return null;
    const d = new Date(date);
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) return { text: 'Overdue', color: 'text-red-600 bg-red-50' };
    if (days === 0) return { text: 'Today', color: 'text-orange-600 bg-orange-50' };
    if (days === 1) return { text: 'Tomorrow', color: 'text-yellow-600 bg-yellow-50' };
    if (days <= 7) return { text: `${days}d`, color: 'text-blue-600 bg-blue-50' };
    return { text: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), color: 'text-gray-600 bg-gray-50' };
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
        <div className="text-gray-500">Board not found</div>
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
              Boards
            </Link>
            <div className="h-4 w-px bg-gray-300"></div>
            <h1 className="text-lg font-semibold text-gray-800">{board.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-medium border-2 border-white">
                {board.owner?.name?.[0]?.toUpperCase()}
              </div>
              {board.members?.slice(0, 3).map((m) => (
                <div key={m.id} className="w-7 h-7 rounded-full bg-gray-500 flex items-center justify-center text-white text-xs font-medium border-2 border-white">
                  {m.user?.name?.[0]?.toUpperCase()}
                </div>
              ))}
              {board.members?.length > 3 && (
                <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-medium border-2 border-white">
                  +{board.members.length - 3}
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
                      className="font-medium text-gray-700 cursor-pointer hover:text-gray-900 text-sm"
                    >
                      {list.title}
                    </h3>
                  )}
                  <div className="flex items-center gap-1 ml-2">
                    <span className="text-xs text-gray-500">{list.cards.length}</span>
                    <button onClick={() => deleteList(list.id)} className="text-gray-400 hover:text-red-500 p-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
                  <SortableContext items={list.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                    {list.cards.map((card) => (
                      <div
                        key={card.id}
                        onClick={() => setSelectedCard(card)}
                        className="bg-white rounded border border-gray-200 p-2.5 cursor-pointer hover:border-gray-300 hover:shadow-sm transition group relative"
                      >
                        <p className="text-sm text-gray-800 font-medium">{card.title}</p>
                        {(card.description || card.dueDate || card.priority) && (
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            {card.priority && card.priority !== 'medium' && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getPriorityColor(card.priority)}`}>
                                {card.priority}
                              </span>
                            )}
                            {card.dueDate && (() => {
                              const dateInfo = formatDate(card.dueDate);
                              return dateInfo ? (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${dateInfo.color}`}>
                                  📅 {dateInfo.text}
                                </span>
                              ) : null;
                            })()}
                          </div>
                        )}
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteCard(card.id, list.id); }}
                          className="hidden group-hover:block absolute top-1 right-1 text-gray-400 hover:text-red-500"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </SortableContext>
                  
                  {quickAddCard === list.id ? (
                    <div className="bg-white rounded border border-gray-200 p-2">
                      <input
                        autoFocus
                        value={quickCardTitle}
                        onChange={(e) => setQuickCardTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && createQuickCard(list.id)}
                        placeholder="Enter card title..."
                        className="w-full text-sm bg-transparent focus:outline-none"
                      />
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => createQuickCard(list.id)} className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">Add</button>
                        <button onClick={() => { setQuickAddCard(null); setQuickCardTitle(''); }} className="px-2 py-1 text-gray-600 text-xs hover:bg-gray-100 rounded">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setQuickAddCard(list.id)}
                      className="w-full text-left text-gray-500 hover:text-gray-700 hover:bg-gray-300 p-2 rounded text-sm transition flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add card
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
                    placeholder="Enter list title..."
                    className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="flex gap-2 mt-2">
                    <button type="submit" disabled={!newListTitle.trim()} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50">
                      Add List
                    </button>
                    <button type="button" onClick={() => { setAddingList(false); setNewListTitle(''); }} className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded text-sm">
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button 
                  onClick={() => setAddingList(true)}
                  className="w-full bg-white/50 hover:bg-white text-gray-600 p-3 rounded-lg border border-gray-200 transition flex items-center gap-2 text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add another list
                </button>
              )}
            </div>
          </div>
          
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-200">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg font-semibold text-gray-900 w-full focus:outline-none"
            placeholder="Card title"
          />
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
              placeholder="Add a description..."
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md text-sm transition">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition text-sm">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};