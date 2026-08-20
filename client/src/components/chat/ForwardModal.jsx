import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Avatar } from '../common/Avatar';
import { Button } from '../common/Button';
import { useChat } from '../../context/ChatContext';
import { Send, Search, Check } from 'lucide-react';

export const ForwardModal = ({ isOpen, onClose, messageToForward }) => {
  const { conversations, sendMessage, openChatWithUser } = useChat();
  const [search, setSearch] = useState('');
  const [selectedConv, setSelectedConv] = useState(null);
  const [forwarding, setForwarding] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const filtered = conversations.filter((c) =>
    c.recipient?.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.recipient?.username?.toLowerCase().includes(search.toLowerCase())
  );

  const handleForward = async () => {
    if (!selectedConv || !messageToForward) return;
    try {
      setForwarding(true);
      await sendMessage({
        text: messageToForward.text,
        media: messageToForward.media,
        type: messageToForward.type,
      });
      setSentSuccess(true);
      setTimeout(() => {
        setSentSuccess(false);
        onClose();
      }, 800);
    } catch (err) {
      console.error('Forward failed:', err);
    } finally {
      setForwarding(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Forward Message" maxWidth="max-w-sm">
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800 text-sm rounded-xl border border-transparent focus:border-emerald-500 focus:outline-none"
          />
        </div>

        {/* Message preview snippet */}
        <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 border-l-2 border-emerald-500 line-clamp-2">
          {messageToForward?.text || (messageToForward?.type === 'image' ? '📷 Photo' : '📎 File')}
        </div>

        {/* Contacts List */}
        <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {filtered.map((conv) => {
            const isSelected = selectedConv?._id === conv._id;
            return (
              <button
                key={conv._id}
                onClick={() => setSelectedConv(conv)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors ${
                  isSelected ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar src={conv.recipient?.avatar} name={conv.recipient?.name} size="sm" />
                  <div className="truncate">
                    <div className="text-sm font-semibold truncate text-slate-900 dark:text-slate-100">{conv.recipient?.name}</div>
                    <div className="text-xs text-slate-400">@{conv.recipient?.username}</div>
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!selectedConv || forwarding}
            loading={forwarding}
            onClick={handleForward}
            icon={sentSuccess ? Check : Send}
          >
            {sentSuccess ? 'Forwarded!' : 'Send'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
