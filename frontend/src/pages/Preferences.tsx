import { useMemo, useState } from 'react';
import { StarOff } from 'lucide-react';
import { postUserPreferences } from '../util/data';
import { useAuth } from '../context/AuthProvider';
import { useDataStore } from '@/store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import AuthPopup from '../components/AuthPopup';
import SEO from '../components/SEO';


const Preferences: React.FC = () => {
  var userPreferences = useDataStore((state) => state.UserDataResponse.userPreferences)
  const setUserPreferences = useDataStore((state) => state.setUserPreferences)

  const { token } = useAuth();
  const { toast } = useToast();

  const [filter, setFilter] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  // Unfavorited rows stay in place (dimmed, outline star) until the user leaves
  // the page, so an accidental tap can be undone by tapping again.
  const [pendingRemoved, setPendingRemoved] = useState<Set<string>>(new Set());

  const favoriteSet = useMemo(
    () => new Set((userPreferences ?? []).map((name) => name.toLowerCase().trim())),
    [userPreferences]
  );

  const sortedNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const name of userPreferences ?? []) {
      names.set(name.toLowerCase().trim(), name);
    }
    for (const name of pendingRemoved) {
      const key = name.toLowerCase().trim();
      if (!names.has(key)) {
        names.set(key, name);
      }
    }
    return Array.from(names.values()).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  }, [userPreferences, pendingRemoved]);

  const count = (userPreferences ?? []).length;

  // Flat alphabetized list, filtered live by the search text.
  const visibleNames = useMemo(() => {
    const query = filter.trim().toLowerCase();
    return query
      ? sortedNames.filter((name) => name.toLowerCase().includes(query))
      : sortedNames;
  }, [sortedNames, filter]);

  const toggleFavorite = (itemName: string) => {
    const current = userPreferences ?? [];
    const key = itemName.toLowerCase().trim();
    const isFavorited = current.some((i) => i.toLowerCase().trim() === key);
    const previousPreferences = current;
    const previousPending = new Set(pendingRemoved);

    const next = isFavorited
      ? current.filter((i) => i.toLowerCase().trim() !== key)
      : [...current, itemName];

    setPendingRemoved((prev) => {
      const nextSet = new Set(prev);
      if (isFavorited) {
        nextSet.add(itemName);
      } else {
        nextSet.delete(itemName);
      }
      return nextSet;
    });
    setUserPreferences(next);
    // Revert the optimistic update if the save fails.
    postUserPreferences(next, token as string).catch(() => {
      setUserPreferences(previousPreferences);
      setPendingRemoved(previousPending);
      toast({
        variant: 'destructive',
        title: "Couldn't save favorite — try again.",
      });
    });
  };

  return (
    <div className="p-6 min-h-screen text-black bg-background dark:text-white transition-colors duration-200">
      <SEO
        title="Your Preferences - NUFood"
        description="Manage your favorite Northwestern University dining items. View and edit your personalized food preferences and favorites."
        keywords="Northwestern dining preferences, NU favorite foods, campus dining favorites, Northwestern food preferences"
        url="https://dining.nu/preferences"
      />

      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Your Favorite Items</h1>
          {count > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {count} {count === 1 ? 'item' : 'items'}
            </p>
          )}
        </div>

        {!token ? (
          <div className="flex flex-col items-center justify-center text-center py-16 text-muted-foreground">
            <StarOff className="h-10 w-10 mb-4" aria-hidden="true" />
            <p className="text-lg font-medium text-foreground">
              Sign in to start favoriting items.
            </p>
            <Button
              onClick={() => setShowPopup(true)}
              className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-200"
            >
              Sign in
            </Button>
          </div>
        ) : (
          <>
        {sortedNames.length > 0 && (
          <Input
            type="text"
            aria-label="Filter favorites"
            placeholder="Filter favorites..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="mb-4 w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 bg-background text-black dark:text-white transition-colors duration-200"
          />
        )}

        {sortedNames.length > 0 ? (
          visibleNames.length > 0 ? (
            <ul className="rounded-lg border border-border bg-card text-card-foreground divide-y divide-border overflow-hidden">
              {visibleNames.map((itemName) => {
                const isFavorited = favoriteSet.has(itemName.toLowerCase().trim());

                return (
                  <li key={itemName}>
                    <button
                      type="button"
                      onClick={() => toggleFavorite(itemName)}
                      aria-pressed={isFavorited}
                      aria-label={
                        isFavorited
                          ? `Remove ${itemName} from favorites`
                          : `Add ${itemName} back to favorites`
                      }
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-item-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${isFavorited ? '' : 'opacity-50'}`}
                    >
                      <span
                        aria-hidden="true"
                        className={isFavorited ? 'text-primary' : 'text-muted-foreground'}
                      >
                        {isFavorited ? '★' : '☆'}
                      </span>
                      <span className="flex-1 min-w-0 truncate" title={itemName}>
                        {itemName}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No matches</p>
          )
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-16 text-muted-foreground">
            <StarOff className="h-10 w-10 mb-4" aria-hidden="true" />
            <p className="text-lg font-medium text-foreground">No favorites yet</p>
            <p className="text-sm mt-1">
              Tap any item to save it to your favorites.
            </p>
          </div>
        )}
          </>
        )}
      </div>

      {showPopup && (
        <AuthPopup isOpen={showPopup} onClose={() => setShowPopup(false)} />
      )}
    </div>
  );
};

export default Preferences;
