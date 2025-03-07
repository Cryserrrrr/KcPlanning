import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Match, MatchType } from "~/models/match";
import { format, startOfWeek, addDays, parseISO, Locale } from "date-fns";
import { fr } from "date-fns/locale";
import kcLogo from "/icons/kc-logo.svg";
import arrow from "/icons/arrow.svg";
import { useState, useEffect } from "react";
import { Types } from "mongoose";
import MatchBox from "~/components/matchBox";
import Sidebar from "~/components/sideBar";
import heart from "/icons/heart.svg";
import { isMobileScreen } from "~/utils/utilsFunctions";
import { Calendar } from "~/components/calendar";

export const meta: MetaFunction = () => {
  return [
    { title: "Karmine Corp Schedule" },
    { name: "description", content: "Karmine Corp Schedule" },
  ];
};

type LoaderData = {
  matches: MatchTypeWithId[];
  weekDays: {
    date: Date;
    formattedDate: Date;
    dayName: string;
  }[];
  startDate: Date;
  endDate: Date;
  oldestMatch: Date;
  newestMatch: Date;
};

export type MatchTypeWithId = Omit<MatchType, "_id"> & { _id: Types.ObjectId };

export const loader: LoaderFunction = async ({ request }) => {
  const today = new Date();
  const startDay = startOfWeek(today, { weekStartsOn: 2 });

  // Get language from request headers
  const acceptLanguage = request.headers.get("accept-language") || "";
  const locale = acceptLanguage.includes("fr") ? fr : null;

  const weekDays = Array.from({ length: 7 }).map((_, index) => {
    const date = addDays(startDay, index);
    return {
      date,
      formattedDate: date,
      dayName: locale ? format(date, "EEEE", { locale }) : format(date, "EEEE"),
    };
  });

  const startDate = format(startDay, "yyyy-MM-dd");
  const endDate = format(addDays(startDay, 6), "yyyy-MM-dd");

  const startDateTime = new Date(startDate);
  startDateTime.setDate(startDateTime.getDate() - 1);
  startDateTime.setUTCHours(23, 0, 0, 0);

  const endDateTime = new Date(endDate);
  endDateTime.setUTCHours(22, 59, 59, 999);

  const matches = (await Match.find({
    date: { $gte: startDateTime, $lte: endDateTime },
  })
    .sort({ date: 1 })
    .lean()) as unknown as MatchTypeWithId[];

  const oldestMatch = await Match.findOne({}).sort({ date: 1 }).lean();
  const newestMatch = await Match.findOne({}).sort({ date: -1 }).lean();

  let oldestMatchDate: Date;
  let newestMatchDate: Date;

  if (!oldestMatch || !newestMatch) {
    oldestMatchDate = new Date();
    newestMatchDate = new Date();
  } else {
    oldestMatchDate = new Date(oldestMatch.date);
    oldestMatchDate.setDate(oldestMatchDate.getDate() - 1);
    oldestMatchDate.setHours(23, 0, 0, 0);
    newestMatchDate = new Date(newestMatch.date);
    newestMatchDate.setHours(22, 59, 59, 999);
  }

  return json<LoaderData>({
    matches,
    weekDays,
    startDate: startDateTime,
    endDate: endDateTime,
    oldestMatch: oldestMatchDate,
    newestMatch: newestMatchDate,
  });
};

export default function Index() {
  const {
    matches: initialMatches,
    weekDays: initialWeekDays,
    startDate: initialStartDate,
    endDate: initialEndDate,
    oldestMatch,
    newestMatch,
  } = useLoaderData<LoaderData>();
  const [startDate, setStartDate] = useState<Date>(new Date(initialStartDate));
  const [endDate, setEndDate] = useState<Date>(new Date(initialEndDate));
  const [allMatches, setAllMatches] =
    useState<MatchTypeWithId[]>(initialMatches);
  const [weekMatches, setWeekMatches] =
    useState<MatchTypeWithId[]>(initialMatches);
  const [dateAlreadyLoaded, setDateAlreadyLoaded] = useState<Date[]>([
    startDate,
  ]);
  const [weekDays, setWeekDays] = useState(initialWeekDays);
  const [isSidebarOpen, setIsSidebarOpen] = useState<string | null>(null);
  const [showArrows, setShowArrows] = useState<{
    start: boolean;
    end: boolean;
  }>({
    start: new Date(oldestMatch) < startDate,
    end: new Date(newestMatch) > endDate,
  });
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [currentDayIndex, setCurrentDayIndex] = useState<number>(0);
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [weekDaysState, setWeekDaysState] = useState<
    {
      date: Date;
      formattedDate: Date;
      dayName: string;
    }[]
  >(initialWeekDays);

  // Remove client-side localization since it's now handled on the server
  useEffect(() => {
    // Check if device is mobile
    const checkMobile = () => {
      setIsMobile(isMobileScreen());
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const loadMatchesForPeriod = async (start: Date, end: Date) => {
    const formattedStart = format(start, "yyyy-MM-dd");
    const formattedEnd = format(end, "yyyy-MM-dd");

    try {
      const url = `/api/matches?startDate=${formattedStart}&endDate=${formattedEnd}`;

      const response = await fetch(url);

      if (response.ok) {
        const newMatches = await response.json();

        setAllMatches((prevMatches) => {
          const existingIds = new Set(prevMatches.map((match) => match._id));
          const uniqueNewMatches = newMatches.filter(
            (match: MatchTypeWithId) => !existingIds.has(match._id)
          );
          return [...prevMatches, ...uniqueNewMatches];
        });

        const matches: MatchTypeWithId[] = newMatches.filter(
          (match: MatchTypeWithId) => {
            return (
              new Date(match.date) >= startDate &&
              new Date(match.date) <= endDate
            );
          }
        );
        setWeekMatches(matches);
      } else {
        const errorText = await response.text();
        console.error("Erreur API:", response.status, errorText);
      }
    } catch (error) {
      console.error("Error loading matches:", error);
    }
  };

  // UseEffect to load matches when the dates change
  useEffect(() => {
    const isDateAlreadyLoaded = dateAlreadyLoaded.find(
      (date) => date.getTime() === startDate.getTime()
    );
    const tempWeekDaysState = Array.from({ length: 7 }).map((_, index) => {
      const date = addDays(startDate, index);
      return {
        date,
        formattedDate: date,
        dayName: weekDays[index].dayName,
      };
    });
    setWeekDaysState(tempWeekDaysState);
    if (startDate && endDate && !isDateAlreadyLoaded) {
      loadMatchesForPeriod(startDate, endDate);
      setDateAlreadyLoaded((prev) => [...prev, startDate]);
    } else if (dateAlreadyLoaded.length > 1) {
      const matches: MatchTypeWithId[] = allMatches.filter(
        (match: MatchTypeWithId) => {
          const matchDate = new Date(match.date);
          // Ajuster les heures pour inclure toute la journée du dernier jour
          const adjustedEndDate = new Date(endDate);
          adjustedEndDate.setHours(23, 59, 59, 999);
          return matchDate >= startDate && matchDate <= adjustedEndDate;
        }
      );
      setWeekMatches(matches);
    }
    setShowArrows({
      start: new Date(oldestMatch) < startDate,
      end: new Date(newestMatch) > endDate,
    });
  }, [startDate, endDate]);

  const goToPreviousDay = () => {
    if (currentDayIndex > 0) {
      setCurrentDayIndex(currentDayIndex - 1);
    } else if (showArrows.start) {
      // If we're at the first day of the week and can go to previous week
      setStartDate(addDays(startDate, -7));
      setEndDate(addDays(endDate, -7));
      setCurrentDayIndex(6); // Set to last day of the new week
    }
  };

  const goToNextDay = () => {
    if (currentDayIndex < 6) {
      setCurrentDayIndex(currentDayIndex + 1);
    } else if (showArrows.end) {
      // If we're at the last day of the week and can go to next week
      setStartDate(addDays(startDate, 7));
      setEndDate(addDays(endDate, 7));
      setCurrentDayIndex(0); // Set to first day of the new week
    }
  };

  const handleDateSelect = (date: Date) => {
    const weekStart = startOfWeek(date, { weekStartsOn: 2 });
    setStartDate(weekStart);
    setEndDate(addDays(weekStart, 6));

    if (isMobile) {
      // Find which day of the week was selected
      let dayDiff = Math.floor(
        (date.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)
      );

      setCurrentDayIndex(dayDiff);
    }

    setIsCalendarOpen(false);
  };

  return (
    <div className="min-h-screen bg-secondary text-white py-8 px-4 w-full flex flex-col">
      <div className="flex flex-row items-center">
        <div className="w-1/4">
          <img src={kcLogo} alt="Karmine Corp Logo" className="w-16 h-16" />
        </div>
        <div className="w-2/4 flex justify-center">
          <h1 className="text-4xl font-bold">Karmine Corp Schedule</h1>
        </div>
        <div className="w-1/4 flex justify-end">
          <div className="flex flex-row items-center space-x-4">
            {!isMobile && (
              <img
                src={arrow}
                alt="Arrow"
                className={`w-6 h-6 hover:scale-105 transition-all duration-150 ${
                  !showArrows.start
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer"
                }`}
                onClick={() => {
                  if (showArrows.start) {
                    setStartDate(addDays(startDate, -7));
                    setEndDate(addDays(endDate, -7));
                  }
                }}
              />
            )}
            <p
              className={`text-gray-400 ${
                isMobile ? "text-2xl" : ""
              } cursor-pointer hover:text-primary transition-colors`}
              onClick={() => setIsCalendarOpen(true)}
            >
              {isMobile
                ? format(weekDaysState[currentDayIndex].date, "yyyy-MM-dd")
                : `${format(startDate, "yyyy-MM-dd")} - ${format(
                    endDate,
                    "yyyy-MM-dd"
                  )}`}
            </p>
            {!isMobile && (
              <img
                src={arrow}
                alt="Arrow"
                className={`w-6 h-6 rotate-180 hover:scale-105 transition-all duration-150 ${
                  !showArrows.end
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer"
                }`}
                onClick={() => {
                  if (showArrows.end) {
                    setStartDate(addDays(startDate, 7));
                    setEndDate(addDays(endDate, 7));
                  }
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Calendar modal */}
      {isCalendarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className={`bg-secondary p-4 rounded-lg border border-gray-700 ${
              isMobile ? "max-w-[80%] w-full" : "max-w-md w-full"
            }`}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className={`${isMobile ? "text-2xl" : "text-xl"} font-bold`}>
                Select a date
              </h2>
              <button
                className="text-gray-400 hover:text-white text-2xl"
                onClick={() => setIsCalendarOpen(false)}
              >
                ✕
              </button>
            </div>
            <Calendar
              onSelectDate={handleDateSelect}
              minDate={new Date(oldestMatch)}
              maxDate={new Date(newestMatch)}
              currentDate={
                isMobile ? weekDaysState[currentDayIndex].date : startDate
              }
              onClose={() => setIsCalendarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Mobile day navigation */}
      {isMobile && (
        <div className="flex justify-between items-center mt-8 mb-2">
          <img
            src={arrow}
            alt="Previous Day"
            className={`w-12 h-12 hover:scale-105 transition-all duration-150 ${
              currentDayIndex === 0 && !showArrows.start
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer"
            }`}
            onClick={goToPreviousDay}
          />
          <h2
            className="text-4xl font-bold text-primary cursor-pointer"
            onClick={() => setIsCalendarOpen(true)}
          >
            {weekDaysState[currentDayIndex].dayName.charAt(0).toUpperCase() +
              weekDaysState[currentDayIndex].dayName.slice(1)}{" "}
            {format(weekDaysState[currentDayIndex].date, "dd")}
          </h2>
          <img
            src={arrow}
            alt="Next Day"
            className={`w-12 h-12 rotate-180 hover:scale-105 transition-all duration-150 ${
              currentDayIndex === 6 && !showArrows.end
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer"
            }`}
            onClick={goToNextDay}
          />
        </div>
      )}

      {/* Display planning with days and matches */}
      <div
        className="flex flex-row items-center justify-center flex-grow"
        style={{ height: `calc(100vh - ${isMobile ? "300px" : "200px"})` }}
      >
        {isMobile
          ? // Mobile view - show only current day
            (() => {
              const day = weekDaysState[currentDayIndex];
              const todayStartDate = new Date(day.date);
              todayStartDate.setHours(0, 0, 0, 0);
              const todayEndDate = new Date(day.date);
              todayEndDate.setHours(23, 59, 59, 999);
              const dayMatches = weekMatches.filter((match) => {
                return (
                  new Date(match.date) >= todayStartDate &&
                  new Date(match.date) <= todayEndDate
                );
              });

              return (
                <div
                  key={new Date(day.date).getTime()}
                  className="flex flex-col items-center justify-center w-full pt-4 h-full"
                >
                  <div className="border border-gray py-4 h-full w-full flex flex-col items-center space-between rounded-lg">
                    {/* Display matches */}
                    <div className="flex flex-col items-center justify-center overflow-y-scroll scrollbar-hide w-full">
                      {dayMatches.length > 0 ? (
                        dayMatches.map((match) => (
                          <MatchBox
                            key={match._id.toString()}
                            match={match}
                            onClick={() =>
                              setIsSidebarOpen(match._id.toString())
                            }
                          />
                        ))
                      ) : (
                        <p className="text-gray-400 text-2xl mt-8">
                          No matches for this day
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()
          : // Desktop view - show all days
            weekDaysState.map((day) => {
              const todayStartDate = new Date(day.date);
              todayStartDate.setHours(0, 0, 0, 0);
              const todayEndDate = new Date(day.date);
              todayEndDate.setHours(23, 59, 59, 999);
              const dayMatches = weekMatches.filter((match) => {
                return (
                  new Date(match.date) >= todayStartDate &&
                  new Date(match.date) <= todayEndDate
                );
              });
              return (
                <div
                  key={new Date(day.date).getTime()}
                  className="flex flex-col items-center justify-center w-full pt-10 h-full w-1/7"
                >
                  <div
                    className={`border-l border-t border-gray py-4 h-full w-full flex flex-col items-center space-between ${
                      new Date(day.date).getTime() ===
                      new Date(weekDaysState[6].date).getTime()
                        ? "border-r"
                        : ""
                    }`}
                  >
                    {/* Display day name and date */}
                    <div className="text-lg font-bold border-b border-gray pb-4 w-full text-center mb-3 text-primary">
                      {day.dayName.charAt(0).toUpperCase() +
                        day.dayName.slice(1)}{" "}
                      {format(day.date, "dd")}
                    </div>
                    {/* Display matches */}
                    <div className="flex flex-col items-center justify-center overflow-y-scroll scrollbar-hide">
                      {dayMatches.map((match) => (
                        <MatchBox
                          key={match._id.toString()}
                          match={match}
                          onClick={() => setIsSidebarOpen(match._id.toString())}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
      </div>

      {/* Footer */}
      <div className="flex flex-row items-center mt-auto pt-4 border-t border-gray-700">
        <div className="w-1/4">
          <p className="text-gray-400 flex flex-row items-center space-x-2 gap-1">
            Made with <img src={heart} alt="heart" className="w-4 h-4" />
            by Cryser
          </p>
        </div>
        <div className="w-2/4 flex justify-center">
          <p className="text-gray-400 font-bold">Unofficial Project</p>
        </div>
        <div className="w-1/4 flex justify-end">
          <p className="text-gray-400">In development</p>
        </div>
      </div>

      <Sidebar
        isOpen={isSidebarOpen !== null}
        onClose={() => setIsSidebarOpen(null)}
        match={allMatches.find(
          (match) => match._id.toString() === isSidebarOpen
        )}
      />
    </div>
  );
}
