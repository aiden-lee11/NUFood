import { postUserPreferences } from '../util/data';
import { useAuth } from '../context/AuthProvider';
import { FavoriteItem } from '../types/ItemTypes';
import { useDataStore } from '@/store';
import SEO from '../components/SEO';


const Preferences: React.FC = () => {
  var userPreferences = useDataStore((state) => state.UserDataResponse.userPreferences)
  const setUserPreferences = useDataStore((state) => state.setUserPreferences)

  const { token } = useAuth();


  const handleItemClick = (item: FavoriteItem) => {
    if (userPreferences) {
      let tempPreferences = userPreferences;
      const formattedItemName = item.Name.toLowerCase().trim();
      if (userPreferences.some(i => i.toLowerCase().trim() === formattedItemName)) {
        tempPreferences = userPreferences.filter(i => i.toLowerCase().trim() !== formattedItemName);
      } else {
        tempPreferences = [...userPreferences, item.Name];
      }
      setUserPreferences(tempPreferences);
      postUserPreferences(tempPreferences, token as string);
    }
  };

  return (
    <div className="p-6 min-h-screen text-black bg-background dark:text-white transition-colors duration-200">
      <SEO 
        title="Your Preferences - NUFood"
        description="Manage your favorite Northwestern University dining items. View and edit your personalized food preferences and favorites."
        keywords="Northwestern dining preferences, NU favorite foods, campus dining favorites, Northwestern food preferences"
        url="https://nufood.me/preferences"
      />
      <h1 className="text-2xl font-bold mb-4">Your Favorite Items</h1>

      {(userPreferences && userPreferences.length > 0) ? (
        <ul className="space-y-2">
          {userPreferences.map((itemName, index) => (
            <li key={index}>
              <button
                onClick={() => handleItemClick({ Name: itemName })}
                className="w-full text-left p-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] hover:shadow-md focus:outline-none border-2 bg-card text-card-foreground border-border hover:bg-item-hover hover:border-muted-foreground"
              >
                <span className="flex justify-between items-center">
                  <span>{itemName} ★</span>
                  <span className="text-destructive hover:text-destructive/80 transition-colors duration-200 text-lg font-bold">
                    −
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-foreground">You have no favorite items yet.</p>
      )}
    </div>
  );
};

export default Preferences;
