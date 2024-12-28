Had a ton of issues with naming conventions for getting the locations operating hours so heres what will be implemented

+------------------------------+--------------------------------------------------------------------+
| New Name                     | Reason                                                             |
+------------------------------+--------------------------------------------------------------------+
| LocationOperationsResponse   | Represents a response containing operational data                  |
|                              | for multiple locations.                                            |
+------------------------------+--------------------------------------------------------------------+
| LocationOperatingInfo        | Describes the operational details for a single location.           |
+------------------------------+--------------------------------------------------------------------+
| DailyOperatingInfo           | Provides operational details for a single day at a location.       |
+------------------------------+--------------------------------------------------------------------+
| HourlyOperatingInfo          | Details specific start and end times within a single day.          |
+------------------------------+--------------------------------------------------------------------+
| LocationOperatingTimes       | Indicates an abstraction of the operational times                  |
|                              | for a location, possibly for database use.                         |
+------------------------------+--------------------------------------------------------------------+
| DailyOperatingTimes          | Reflects operational times for a specific day in a location.       |
+------------------------------+--------------------------------------------------------------------+
| HourlyTimes                  | Represents start and end times for a time block on a specific day. |
+------------------------------+--------------------------------------------------------------------+
| locationOperatingTimesList   | An array of operational times for multiple locations.              |
+------------------------------+--------------------------------------------------------------------+
