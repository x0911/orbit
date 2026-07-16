"use client";

import { useState } from "react";
import { UserPlus, UserCheck, Search } from "lucide-react";
import { toggleFollow } from "@/app/app/shelf/actions";

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
}

interface CommunityFollowProps {
  profiles: Profile[];
  initialFollowedIds: string[];
}

export default function CommunityFollow({
  profiles,
  initialFollowedIds,
}: CommunityFollowProps) {
  const [followedIds, setFollowedIds] = useState<string[]>(initialFollowedIds);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleToggle = async (userId: string) => {
    setLoadingId(userId);
    const res = await toggleFollow(userId);
    setLoadingId(null);

    if (res.success) {
      if (followedIds.includes(userId)) {
        setFollowedIds(followedIds.filter((id) => id !== userId));
      } else {
        setFollowedIds([...followedIds, userId]);
      }
    }
  };

  const filteredProfiles = profiles.filter((p) => {
    const term = searchQuery.toLowerCase();
    const name = (p.display_name || "").toLowerCase();
    const uname = p.username.toLowerCase();
    return name.includes(term) || uname.includes(term);
  });

  return (
    <div className="bg-ink-900 border border-ink-850 rounded-2xl p-5 space-y-4 shadow-lg sticky top-8">
      <div>
        <h3 className="font-sans text-lg font-bold text-parchment-100">
          Find Readers
        </h3>
        <p className="text-xs text-parchment-500">
          Follow other book lovers to populate your feed.
        </p>
      </div>

      {/* Search profile input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-parchment-500" />
        <input
          type="text"
          placeholder="Search usernames..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-ink-950 border border-ink-800 rounded-lg py-1.5 pl-9 pr-4 text-xs text-parchment-100 placeholder-parchment-500/40 focus:outline-none focus:border-amber-500/50"
        />
      </div>

      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
        {filteredProfiles.length === 0 ? (
          <p className="text-xs text-parchment-500 text-center py-4">
            No readers found.
          </p>
        ) : (
          filteredProfiles.map((p) => {
            const isFollowing = followedIds.includes(p.id);
            const isLoading = loadingId === p.id;

            return (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 p-2 rounded-lg bg-ink-950/40 border border-ink-850 hover:border-ink-800 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-parchment-100 truncate">
                    {p.display_name || p.username}
                  </p>
                  <p className="text-[10px] text-parchment-500 truncate">
                    @{p.username}
                  </p>
                </div>

                <button
                  onClick={() => handleToggle(p.id)}
                  disabled={isLoading}
                  className={`shrink-0 text-xs px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                    isFollowing
                      ? "bg-ink-900 border-ink-800 text-parchment-300 hover:bg-ink-850 hover:text-red-400 hover:border-red-950"
                      : "bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20 hover:border-amber-500/40"
                  }`}
                >
                  {isLoading ? (
                    <div className="w-3.5 h-3.5 rounded-full border border-t-transparent animate-spin" />
                  ) : isFollowing ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      Follow
                    </>
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
