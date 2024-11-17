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
    console.log('Success:', result);

    // Update sessionStorage with the new userPreferences
    sessionStorage.setItem("userPreferences", JSON.stringify(preferences));

    // Update sessionStorage with the new availableFavorites
    sessionStorage.setItem("availableFavorites", JSON.stringify(result));

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

    // Check sessionStorage for the "date" item
    const storedDate = sessionStorage.getItem("date");
    if (storedDate === formattedToday) {
      console.log("Data already fetched today");
      return {
        allItems: JSON.parse(sessionStorage.getItem("allItems") || "[]"),
        dailyItems: JSON.parse(sessionStorage.getItem("dailyItems") || "[]"),
        availableFavorites: JSON.parse(sessionStorage.getItem("availableFavorites") || "[]"),
        userPreferences: JSON.parse(sessionStorage.getItem("userPreferences") || "[]")
      };
    }
    else {
      console.log("New day... fetching new data");
      // Perform the fetch if the dates do not match
      const response = await fetch(`${API_URL}/api/allData?userID=${userID}`);
      if (!response.ok) {
        console.error("Error fetching all data:", response.statusText);
        return;
      }

      const result = await response.json();

      // Update sessionStorage with today's date and the new data
      sessionStorage.setItem("date", formattedToday);
      sessionStorage.setItem("allItems", JSON.stringify(result.allItems));
      sessionStorage.setItem("dailyItems", JSON.stringify(result.dailyItems));
      sessionStorage.setItem("availableFavorites", JSON.stringify(result.availableFavorites));
      sessionStorage.setItem("userPreferences", JSON.stringify(result.userPreferences));

      return result;
    }
  } catch (error) {
    console.error("Error fetching all data:", error);
  }
};
