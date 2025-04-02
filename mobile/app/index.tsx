import { Text, View } from "react-native";
import { fetchGeneralData } from "@/util/store";
import { useEffect, useState } from "react";
import { DailyItem } from "@/types/ItemTypes";

export default function Index() {
  const [genData, setGenData] = useState(null);
  const [dailyItems, setDailyItems] = useState<DailyItem[]>([]);

  useEffect(() => {
    async function fetchData() {
      const data = await fetchGeneralData();
      console.log("Fetched data:", data);
      console.log("Daily items:", data["weeklyItems"]["2025-04-01"]); // Check if this has data

      setGenData({ ...data });
      setDailyItems([...(data["weeklyItems"]["2025-04-01"] || [])]); // Ensure new array reference
    }

    fetchData();
  }, []);

  useEffect(() => {
    console.log("Updated dailyItems:", dailyItems); // Check if this runs
  }, [dailyItems]);

  if (!genData) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Hello world</Text>
      {dailyItems.length > 0 ? (
        dailyItems.map((item, ind) => <Text key={`${item.Name} - ${ind}`}>{item.Name}</Text>)
      ) : (
        <Text>No items found</Text>
      )}
    </View>
  );
}
