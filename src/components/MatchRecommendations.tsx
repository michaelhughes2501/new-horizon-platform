/**
 * AI Match Recommendation Component
 * Uses AI to suggest compatible matches
 */

import React, { useState, useEffect } from 'react';

interface Match {
  id: number;
  username: string;
  age: number;
  location: string;
  bio: string;
  match_score: number;
  avatar?: string;
}

interface RecommendationCardProps {
  match: Match;
  onLike: (id: number) => void;
  onSkip: (id: number) => void;
  loading?: boolean;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({
  match,
  onLike,
  onSkip,
  loading,
}) => {
  const scoreColor =
    match.match_score >= 80
      ? 'text-green-600'
      : match.match_score >= 60
        ? 'text-yellow-600'
        : 'text-red-600';

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden max-w-sm">
      {/* Avatar placeholder */}
      <div className="h-48 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-4xl">
        {match.username[0].toUpperCase()}
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold">{match.username}</h3>
            <p className="text-gray-600">{match.age} • {match.location}</p>
          </div>
          <div className={`text-2xl font-bold ${scoreColor}`}>
            {match.match_score}%
          </div>
        </div>

        <p className="text-gray-700 text-sm mb-6">{match.bio}</p>

        {/* Match Score Breakdown */}
        <div className="mb-6 p-4 bg-gray-50 rounded">
          <p className="text-xs font-semibold text-gray-600 mb-2">AI Match Score</p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                match.match_score >= 80
                  ? 'bg-green-600'
                  : match.match_score >= 60
                    ? 'bg-yellow-600'
                    : 'bg-red-600'
              }`}
              style={{ width: `${match.match_score}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-2">
            High compatibility based on interests, location, and goals
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => onSkip(match.id)}
            disabled={loading}
            className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50"
          >
            Skip
          </button>
          <button
            onClick={() => onLike(match.id)}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
          >
            ♥ Like
          </button>
        </div>
      </div>
    </div>
  );
};

export const MatchRecommendations: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      const res = await fetch('/api/dashboard/ai/recommend-matches');
      const data = await res.json();
      setMatches(data);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (userId: number) => {
    try {
      await fetch(`/like/${userId}`, { method: 'POST' });
      nextMatch();
    } catch (error) {
      console.error('Error liking user:', error);
    }
  };

  const handleSkip = () => {
    nextMatch();
  };

  const nextMatch = () => {
    if (currentIndex < matches.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setMatches([]);
      setCurrentIndex(0);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⚙️</div>
          <p className="text-gray-600">Finding your perfect matches...</p>
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <p className="text-2xl mb-4">🎉</p>
          <p className="text-gray-600 font-semibold">
            You've seen all recommendations!
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Check back tomorrow for new matches
          </p>
        </div>
      </div>
    );
  }

  const currentMatch = matches[currentIndex];

  return (
    <div className="flex flex-col items-center">
      <div className="mb-6">
        <p className="text-gray-600 text-sm">
          Match {currentIndex + 1} of {matches.length}
        </p>
        <div className="w-64 h-1 bg-gray-200 rounded-full mt-2">
          <div
            className="h-1 bg-blue-600 rounded-full transition-all"
            style={{
              width: `${((currentIndex + 1) / matches.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <RecommendationCard
        match={currentMatch}
        onLike={handleLike}
        onSkip={handleSkip}
        loading={loading}
      />

      <button
        onClick={fetchRecommendations}
        className="mt-6 px-6 py-2 text-sm text-blue-600 hover:text-blue-700 font-semibold"
      >
        Refresh Matches
      </button>
    </div>
  );
};

export default MatchRecommendations;
