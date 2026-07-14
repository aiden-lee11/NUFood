import { useMemo, useState } from 'react';
import { Pencil, StarOff, Trash2, X } from 'lucide-react';
import { postUserPreferences } from '../util/data';
import { useAuth } from '../context/AuthProvider';
import { FavoriteItem } from '../types/ItemTypes';
import { useDataStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import SEO from '../components/SEO';


const Preferences: React.FC = () => {
  var userPreferences = useDataStore((state) => state.UserDataResponse.userPreferences)
  const setUserPreferences = useDataStore((state) => state.setUserPreferences)

  const { token } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [filter, setFilter] = useState('');

  const sortedPreferences = useMemo(
    () =>
      (userPreferences ?? [])
        .slice()
        .sort((a, b) =>
          a.toLowerCase().localeCompare(b.toLowerCase())
        ),
    [userPreferences]
  );

  const count = sortedPreferences.length;

  // Contacts-style alphabetical groups, filtered live by the search text.
  // Non-letter first characters group under "#".
  const groups = useMemo(() => {
    const query = filter.trim().toLowerCase();
    const visible = query
      ? sortedPreferences.filter((name) => name.toLowerCase().includes(query))
      : sortedPreferences;

    const result: { letter: string; items: string[] }[] = [];
    for (const name of visible) {
      const first = name.trim().charAt(0).toUpperCase();
      const letter = first >= 'A' && first <= 'Z' ? first : '#';
      const last = result[result.length - 1];
      if (last && last.letter === letter) {
        last.items.push(name);
      } else {
        result.push({ letter, items: [name] });
      }
    }
    return result;
  }, [sortedPreferences, filter]);

  const persist = (next: string[]) => {
    setUserPreferences(next);
    // postUserPreferences rejects on failure; swallow here so an unresolved
    // promise doesn't surface as an unhandled rejection.
    postUserPreferences(next, token as string).catch((err) =>
      console.error('Error posting userPreferences:', err)
    );
  };

  // Single removal: reuse the existing toggle logic (item is a favorite, so
  // this removes it).
  const handleItemClick = (item: FavoriteItem) => {
    if (userPreferences) {
      let tempPreferences = userPreferences;
      const formattedItemName = item.Name.toLowerCase().trim();
      if (userPreferences.some(i => i.toLowerCase().trim() === formattedItemName)) {
        tempPreferences = userPreferences.filter(i => i.toLowerCase().trim() !== formattedItemName);
      } else {
        tempPreferences = [...userPreferences, item.Name];
      }
      persist(tempPreferences);
    }
  };

  const toggleSelected = (itemName: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(itemName)) {
        next.delete(itemName);
      } else {
        next.add(itemName);
      }
      return next;
    });
  };

  const exitEditMode = () => {
    setIsEditing(false);
    setSelected(new Set());
  };

  const toggleEditMode = () => {
    if (isEditing) {
      exitEditMode();
    } else {
      setIsEditing(true);
    }
  };

  // Batch removal: single state update + single network call.
  const removeSelected = () => {
    if (userPreferences) {
      const next = userPreferences.filter((i) => !selected.has(i));
      persist(next);
    }
    setConfirmOpen(false);
    exitEditMode();
  };

  const selectedCount = selected.size;

  return (
    <div className="p-6 min-h-screen text-black bg-background dark:text-white transition-colors duration-200">
      <SEO
        title="Your Preferences - NUFood"
        description="Manage your favorite Northwestern University dining items. View and edit your personalized food preferences and favorites."
        keywords="Northwestern dining preferences, NU favorite foods, campus dining favorites, Northwestern food preferences"
        url="https://nufood.me/preferences"
      />

      <div className="max-w-3xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold">Your Favorite Items</h1>
            {count > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {count} {count === 1 ? 'item' : 'items'}
              </p>
            )}
          </div>

          {count > 0 && (
            <Button
              variant="outline"
              onClick={toggleEditMode}
              aria-pressed={isEditing}
              className="shrink-0"
            >
              {!isEditing && <Pencil aria-hidden="true" />}
              {isEditing ? 'Done' : 'Edit'}
            </Button>
          )}
        </div>

        {count > 0 && (
          <Input
            type="text"
            aria-label="Filter favorites"
            placeholder="Filter favorites..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="mb-4 w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 bg-background text-black dark:text-white transition-colors duration-200"
          />
        )}

        {isEditing && (
          <div className="mb-4">
            <Button
              variant="destructive"
              disabled={selectedCount === 0}
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 aria-hidden="true" />
              Remove Selected ({selectedCount})
            </Button>
          </div>
        )}

        {count > 0 ? (
          groups.length > 0 ? (
            <div className="space-y-4">
              {groups.map(({ letter, items }) => (
                <section key={letter} aria-label={`Favorites starting with ${letter}`}>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 px-1">
                    {letter}
                  </h2>
                  <ul className="rounded-lg border border-border bg-card text-card-foreground divide-y divide-border overflow-hidden">
                    {items.map((itemName) => {
                      const isSelected = selected.has(itemName);

                      if (isEditing) {
                        return (
                          <li key={itemName}>
                            <button
                              type="button"
                              onClick={() => toggleSelected(itemName)}
                              aria-pressed={isSelected}
                              aria-label={`Select ${itemName}`}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${isSelected ? 'bg-muted' : 'hover:bg-item-hover'}`}
                            >
                              <Checkbox
                                checked={isSelected}
                                className="pointer-events-none"
                                tabIndex={-1}
                                aria-hidden="true"
                              />
                              <span className="flex-1 min-w-0 truncate" title={itemName}>
                                {itemName}
                              </span>
                            </button>
                          </li>
                        );
                      }

                      return (
                        <li
                          key={itemName}
                          className="flex items-center gap-3 px-4 py-3"
                        >
                          <span className="flex-1 min-w-0 truncate" title={itemName}>
                            {itemName}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleItemClick({ Name: itemName })}
                            aria-label={`Remove ${itemName} from favorites`}
                            className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <X className="h-5 w-5" aria-hidden="true" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No matches</p>
          )
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-16 text-muted-foreground">
            <StarOff className="h-10 w-10 mb-4" aria-hidden="true" />
            <p className="text-lg font-medium text-foreground">No favorites yet</p>
            <p className="text-sm mt-1">
              Star items in All Items to see them here
            </p>
          </div>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Remove {selectedCount} {selectedCount === 1 ? 'favorite' : 'favorites'}?
            </DialogTitle>
            <DialogDescription>This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={removeSelected}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Preferences;
