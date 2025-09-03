const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8081';

export const postUserPreferences = async (preferences: string[], userToken: string) => {
  try {
    // userPreferences returns an updated array of how these preferences changed the availableFavorites
    const auth = `Bearer ${userToken}`;
    const response = await fetch(`${API_URL}/api/userPreferences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',

        Authorization: auth,
      },
      body: JSON.stringify(preferences),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

  } catch (error) {
    console.error('Error posting userPreferences:', error);
  }
};

export const updateMailing = async (mailing: boolean, userToken: string) => {
  try {
    // userPreferences returns an updated array of how these preferences changed the availableFavorites
    const auth = `Bearer ${userToken}`;
    const response = await fetch(`${API_URL}/api/mailing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',

        Authorization: auth,
      },
      body: JSON.stringify({ mailing }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

  } catch (error) {
    console.error('Error updating mailing status:', error);
  }
};


