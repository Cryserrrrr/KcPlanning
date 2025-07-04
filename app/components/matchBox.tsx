import { MatchTypeWithId } from "~/routes/_index";
import { format } from "date-fns";
import questionMark from "/icons/question-mark.svg";
import { useState, useEffect } from "react";
import eyeIcon from "/icons/eye.svg";
import lol from "/lol.jpg";
import { getMatchColor } from "~/utils/utilsFunctions";
import { isMobileScreen } from "~/utils/utilsFunctions";

const MatchBox = ({
  match,
  onClick,
}: {
  match: MatchTypeWithId;
  onClick: () => void;
}) => {
  const [isScoreVisible, setIsScoreVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(isMobileScreen());
  }, []);

  // take first letter of each word after space of league if league have space
  let league = match.league;
  if (league.includes(" ")) {
    league = league
      .split(" ")
      .map((word) => word[0])
      .join("");
  }
  const color = getMatchColor(match);
  return (
    <div
      className={`flex flex-col gap-2 mb-2 border border-gray ${
        isMobile ? "p-3" : "p-2"
      } mx-2 w-[96%] ${color}`}
      onClick={onClick}
    >
      <div className="flex flex-row justify-between gap-2">
        <div
          className={` border border-gray rounded-md bg-black/50 flex items-center justify-center ${
            isMobile ? "text-4xl p-6 mb-2 mr-2" : "p-2 px-4 text-sm"
          }`}
        >
          {match.leagueLogoUrl ? (
            <img
              src={match.leagueLogoUrl}
              alt={league}
              className="w-6 h-6 object-contain"
            />
          ) : (
            league
          )}
        </div>
        <div
          className={`border border-gray rounded-md p-2 w-full text-center bg-black/50 flex items-center justify-center ${
            isMobile ? "text-4xl py-6 mb-2" : "p-2 text-sm"
          }`}
        >
          {match.game}
        </div>
      </div>
      <div className="flex flex-row justify-between items-center gap-4">
        <div
          className={`text-sm border border-gray rounded-md p-2 px-4 bg-black/50 flex items-center justify-center w-1/3 relative ${
            isMobile ? "p-4" : ""
          }`}
        >
          <div
            className={`absolute bottom-0 left-0 text-[10px] text-white p-1 text-center f ${
              isMobile ? "text-base" : ""
            }`}
          >
            {match.teams[0].acronym}
          </div>
          <img
            src={match.teams[0].logoUrl ? match.teams[0].logoUrl : questionMark}
            alt={match.teams[0].name ?? "TBD"}
            className={isMobile ? "w-[70%] h-[70%] object-contain" : ""}
          />
        </div>
        <div className="w-1/3 flex justify-center items-center">
          {match.teams[0].score !== null ? (
            <div
              className="flex flex-col justify-center items-center text-center"
              onClick={(e) => {
                e.stopPropagation();
                setIsScoreVisible(true);
              }}
            >
              {isScoreVisible ? (
                <div
                  className={`flex flex-row justify-center items-center ${
                    isMobile
                      ? "w-[200px] h-[200px] text-5xl"
                      : "w-[50px] h-[50px]"
                  } z-10`}
                >
                  <div className="text-white text-center">
                    {match.teams[0].score} - {match.teams[1].score}
                  </div>
                </div>
              ) : (
                <div
                  className={`flex flex-row justify-center items-center bg-secondary rounded-md ${
                    isMobile ? "w-[200px] h-[200px]" : "w-[50px] h-[50px]"
                  } z-10`}
                >
                  <img
                    src={eyeIcon}
                    alt="eye"
                    className={isMobile ? "w-12 h-12" : ""}
                  />
                </div>
              )}
            </div>
          ) : (
            <div
              className={`flex flex-col justify-center items-center text-center ${
                isMobile
                  ? "w-[200px] h-[200px] text-5xl"
                  : "w-[50px] h-[50px] text-sm"
              } z-10`}
            >
              <div className="text-white text-center">
                {match.rounds ? `Bo${match.rounds}` : "Vs"}
              </div>
            </div>
          )}
        </div>
        <div
          className={`text-sm border border-gray rounded-md p-2 px-4 bg-black/50 flex items-center justify-center w-1/3 relative ${
            isMobile ? "p-4" : ""
          }`}
        >
          <div
            className={`absolute bottom-0 left-0 text-[10px] text-white p-1 text-center ${
              isMobile ? "text-base" : ""
            }`}
          >
            {match.teams[1].acronym}
          </div>
          <img
            src={match.teams[1].logoUrl ? match.teams[1].logoUrl : questionMark}
            alt={match.teams[1].name ?? "TBD"}
            className={isMobile ? "w-[70%] h-[70%] object-contain" : ""}
          />
        </div>
      </div>
      <div className="flex flex-row justify-between gap-4 w-full">
        <div
          className={`font-bold border border-gray rounded-md w-full text-center text-primary bg-black/50 ${
            match.status == 1 ? "animate-pulse-red cursor-pointer" : ""
          } ${isMobile ? "text-4xl py-6 mt-2" : "p-2 px-4"}`}
          onClick={(e) => {
            if (match.casters && match.status === 1) {
              e.stopPropagation();
              window.open(match.casters[0].twitchLink, "_blank");
            }
          }}
        >
          {match.status === 0
            ? format(match.date, "HH:mm")
            : match.status === 1
            ? "Live ↗"
            : match.status === 2
            ? "Finished"
            : "TBD"}
        </div>
      </div>
    </div>
  );
};

export default MatchBox;
