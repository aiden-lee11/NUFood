interface Item {
  Name: string
}

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

export const postUserPreferences = async (preferences: Item[], userID: string) => {
  try {
    console.log('Posting userPreferences:', preferences);
    const response = await fetch(`${API_URL}/api/userPreferences?userID=${userID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferences),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Response from server:', result);
  } catch (error) {
    console.error('Error posting userPreferences:', error);
  }
};

export const fetchUserPreferences = async (userID: string) => {
  try {
    const response = await fetch(`${API_URL}/api/userPreferences?userID=${userID}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.Favorites
    console.log('Response from server:', result);
  } catch (error) {
    console.error('Error posting userPreferences:', error);
  }
};

