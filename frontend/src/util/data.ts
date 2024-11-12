interface Item {
  Name: string
}

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

export const postUserPreferences = async (preferences: Item[], userID: string) => {
  try {
    // userPreferences returns an updated array of how these preferences changed the availableFavorites
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

    // Update localStorage with the new userPreferences
    localStorage.setItem("userPreferences", JSON.stringify(preferences));

    // Update localStorage with the new availableFavorites
    localStorage.setItem("availableFavorites", JSON.stringify(result));

  } catch (error) {
    console.error('Error posting userPreferences:', error);
  }
};

// "2024-11-11"
export const fetchAllData = async (userID: string) => {
  try {
    // Get today's date in "YYYY-MM-DD" format
    const today = new Date();
    const formattedToday = today.toISOString().split("T")[0]; // "YYYY-MM-DD"

    // Check localStorage for the "date" item
    const storedDate = localStorage.getItem("date");
    if (storedDate === formattedToday) {
      console.log("Data already fetched today");
      return {
        allItems: JSON.parse(localStorage.getItem("allItems") || "[]"),
        dailyItems: JSON.parse(localStorage.getItem("dailyItems") || "[]"),
        availableFavorites: JSON.parse(localStorage.getItem("availableFavorites") || "[]"),
        userPreferences: JSON.parse(localStorage.getItem("userPreferences") || "[]")
      };
    }

    // Perform the fetch if the dates do not match
    const response = await fetch(`${API_URL}/api/allData?userID=${userID}`);
    if (!response.ok) {
      console.error("Error fetching all data:", response.statusText);
      return;
    }

    const result = await response.json();

    // Update localStorage with today's date and the new data
    localStorage.setItem("date", formattedToday);
    localStorage.setItem("allItems", JSON.stringify(result.allItems));
    localStorage.setItem("dailyItems", JSON.stringify(result.dailyItems));
    localStorage.setItem("availableFavorites", JSON.stringify(result.availableFavorites));
    localStorage.setItem("userPreferences", JSON.stringify(result.userPreferences));

    return result;
  } catch (error) {
    console.error("Error fetching all data:", error);
  }
};
