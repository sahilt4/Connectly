import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/Avatar';
import { Plus, Sparkles, RefreshCw } from 'lucide-react';

export const StoryBar = ({ onOpenCreator, onOpenViewer }) => {
  const { user } = useAuth();
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = async () => {
    try {
      setLoading(true);
      const res = await api.get('/stories/feed');
      if (res.data.success) {
        setFeed(res.data.feed);
      }
    } catch (err) {
      console.error('Failed to fetch stories feed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  const myGroup = feed.find((g) => g.isOwn);
  const otherGroups = feed.filter((g) => !g.isOwn);

  return (
    <div className="px-4 py-3 border-b border-slate-200/50 dark:border-white/10 ios-glass-subtle">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold gradient-text-primary">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>24h Stories</span>
        </div>
        <button
          onClick={fetchFeed}
          className="text-[11px] font-semibold text-indigo-500 hover:text-indigo-400 transition-colors flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      <div className="flex items-center gap-3.5 overflow-x-auto no-scrollbar py-1">
        {/* Current User Story Bubble / Create button */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer group">
          <div className="relative">
            <div
              onClick={() => {
                if (myGroup && myGroup.stories.length > 0) {
                  onOpenViewer(myGroup);
                } else {
                  onOpenCreator();
                }
              }}
              className={`p-0.5 rounded-full transition-all duration-200 group-hover:scale-105 ${
                myGroup && myGroup.stories.length > 0
                  ? 'story-ring-gradient shadow-md shadow-pink-500/20'
                  : 'border-2 border-dashed border-indigo-400/50 dark:border-indigo-400/30'
              }`}
            >
              <Avatar src={user?.avatar} name={user?.name} size="md" />
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenCreator();
              }}
              className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-tr from-indigo-600 to-cyan-400 text-white rounded-full flex items-center justify-center shadow-lg ring-2 ring-white dark:ring-slate-900 transition-transform group-hover:scale-110"
              title="Create Story"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 max-w-[60px] truncate">
            {myGroup && myGroup.stories.length > 0 ? 'Your Story' : 'Add Story'}
          </span>
        </div>

        {/* Other Users' Stories */}
        {otherGroups.map((group) => {
          const author = group.author;
          const isUnviewed = !group.allViewed;

          return (
            <div
              key={author._id}
              onClick={() => onOpenViewer(group)}
              className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer group"
            >
              <div
                className={`p-0.5 rounded-full transition-all duration-200 group-hover:scale-105 ${
                  isUnviewed
                    ? 'story-ring-gradient shadow-lg shadow-purple-500/25'
                    : 'ring-2 ring-slate-300 dark:ring-slate-700/60'
                }`}
              >
                <Avatar src={author.avatar} name={author.name} size="md" />
              </div>
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 max-w-[60px] truncate">
                {author.name.split(' ')[0]}
              </span>
            </div>
          );
        })}

        {otherGroups.length === 0 && (
          <div className="flex items-center text-xs text-slate-400 dark:text-slate-500 italic pl-1">
            No recent stories from friends
          </div>
        )}
      </div>
    </div>
  );
};
