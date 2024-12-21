// Returns
// -- Breakfast if current time is between 8:00 AM and 10:59 AM
// -- Lunch if current time is between 11:00 AM and 4:59 PM
// -- Dinner if current time is between 5:00 PM and 7:59 PM
// -- Empty string if current time is outside of the above ranges
export const getCurrentTimeOfDay = (): [string] => {
  const currentTime = new Date();
  const currentHour = currentTime.getHours();
  if (currentHour >= 8 && currentHour <= 10) {
    return ["Breakfast"];
  } else if (currentHour >= 11 && currentHour <= 16) {
    return ["Lunch"];
  } else if (currentHour >= 17 && currentHour <= 19) {
    return ["Dinner"];
  }
  return [""];
};
