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
};

export type MatchTypeWithId = Omit<MatchType, "_id"> & { _id: Types.ObjectId };

export const loader: LoaderFunction = async () => {
  const today = new Date();
  const startDay = startOfWeek(today, { weekStartsOn: 2 });

  const getLocalLanguage = () => {
    const language = navigator.language;
    if (language.includes("fr")) {
      return fr;
    }
    return null;
  };

  const locale = getLocalLanguage();

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
  startDateTime.setUTCHours(0, 0, 0, 0);

  const endDateTime = new Date(endDate);
  endDateTime.setUTCHours(23, 59, 59, 999);

  const matches = (await Match.find({
    date: { $gte: startDateTime, $lte: endDateTime },
  })
    .sort({ date: 1 })
    .lean()) as unknown as MatchTypeWithId[];

  return json<LoaderData>({
    matches,
    weekDays,
    startDate: startDateTime,
    endDate: endDateTime,
  });
};

export default function Index() {
  const {
    matches: initialMatches,
    weekDays,
    startDate: initialStartDate,
    endDate: initialEndDate,
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
  const [weekDaysState, setWeekDaysState] = useState<
    {
      date: Date;
      formattedDate: Date;
      dayName: string;
    }[]
  >(weekDays);
  const [isSidebarOpen, setIsSidebarOpen] = useState<string | null>(null);
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
      console.error("Erreur lors du chargement des matchs:", error);
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
          return (
            new Date(match.date) >= startDate && new Date(match.date) <= endDate
          );
        }
      );
      setWeekMatches(matches);
    }
  }, [startDate, endDate]);

  return (
    <div className="min-h-screen bg-secondary text-white py-8 px-4 w-full flex flex-col">
      <div className="flex flex-row items-center">
        <div className="w-1/4">
          <img src={kcLogo} alt="Karmine Corp Logo" className="w-16 h-16" />
        </div>
        <div className="w-2/4 flex justify-center">
          <h1 className="text-3xl font-bold">Karmine Corp Schedule</h1>
        </div>
        <div className="w-1/4 flex justify-end">
          <div className="flex flex-row items-center space-x-4">
            <img
              src={arrow}
              alt="Arrow"
              className="w-6 h-6 hover:cursor-pointer hover:scale-105 transition-all duration-150"
              onClick={() => {
                // change the start date
                setStartDate(addDays(startDate, -7));
                setEndDate(addDays(endDate, -7));
              }}
            />
            <p className="text-gray-400">
              {format(startDate, "yyyy-MM-dd")} -{" "}
              {format(endDate, "yyyy-MM-dd")}
            </p>
            <img
              src={arrow}
              alt="Arrow"
              className="w-6 h-6 rotate-180 hover:cursor-pointer hover:scale-105 transition-all duration-150"
              onClick={() => {
                setStartDate(addDays(startDate, 7));
                setEndDate(addDays(endDate, 7));
              }}
            />
          </div>
        </div>
      </div>
      {/* Display planning with days and matches */}
      <div
        className="flex flex-row items-center justify-center flex-grow"
        style={{ height: `calc(100vh - 200px)` }}
      >
        {weekDaysState.map((day) => {
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
                  {day.dayName} {format(day.date, "dd")}
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
