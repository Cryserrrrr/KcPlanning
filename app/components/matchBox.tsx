import { MatchTypeWithId } from "~/routes/_index";
import { format } from "date-fns";
import questionMark from "/icons/question-mark.svg";
import { useState } from "react";
import eyeIcon from "/icons/eye.svg";
import lol from "/lol2.jpg";

const MatchBox = ({
  match,
  onClick,
}: {
  match: MatchTypeWithId;
  onClick: () => void;
}) => {
  const [isScoreVisible, setIsScoreVisible] = useState(false);
  // take first letter of each word after space of league if league have space
  let league = match.league;
  if (league.includes(" ")) {
    league = league
      .split(" ")
      .map((word) => word[0])
      .join("");
  }
  return (
    <div
      className="flex flex-col gap-2 border border-gray p-1 mx-2 w-96% bg-cover bg-center"
      style={{ backgroundImage: `url(${lol})` }}
      onClick={onClick}
    >
      <div className="flex flex-row justify-between gap-2">
        <div className="text-sm border border-gray rounded-md p-2 px-4 bg-black/50">
          {league}
        </div>
        <div className="text-sm border border-gray rounded-md p-2 w-full text-center bg-black/50">
          {match.game}
        </div>
      </div>
      <div className="flex flex-row justify-between gap-4">
        <div
          className={`text-sm border border-gray rounded-md p-2 px-4 bg-black/50 ${
            match.score ? "w-1/3" : "w-1/2"
          } relative`}
        >
          <div className="absolute bottom-0 left-0 text-[10px] text-white p-1 text-center">
            {match.teams[0].acronym}
          </div>
          <img
            src={match.teams[0].logoUrl ? match.teams[0].logoUrl : questionMark}
            alt={match.teams[0].name ?? "TBD"}
          />
        </div>
        {match.score && (
          <div
            className="flex flex-col justify-center items-center text-center"
            onClick={(e) => {
              e.stopPropagation();
              setIsScoreVisible(true);
            }}
          >
            {isScoreVisible ? (
              <div className="flex flex-row justify-center items-center w-[50px] h-[50px] z-10">
                <div className="text-white text-center">
                  {match.score?.teamOne} - {match.score?.teamTwo}
                </div>
              </div>
            ) : (
              <div className="flex flex-row justify-center items-center bg-black rounded-md w-[50px] h-[50px] z-10">
                <img src={eyeIcon} alt="eye" />
              </div>
            )}
          </div>
        )}
        <div
          className={`text-sm border border-gray rounded-md p-2 px-4 bg-black/50 ${
            match.score ? "w-1/3" : "w-1/2"
          } relative`}
        >
          <div className="absolute bottom-0 left-0 text-[10px] text-white p-1 text-center">
            {match.teams[1].acronym}
          </div>
          <img
            src={match.teams[1].logoUrl ? match.teams[1].logoUrl : questionMark}
            alt={match.teams[1].name ?? "TBD"}
          />
        </div>
      </div>
      <div className="flex flex-row justify-between gap-4 w-full">
        <div
          className={`font-bold border border-gray rounded-md p-2 px-4 w-full text-center text-primary bg-black/50 ${
            match.status === 1 ? "animate-pulse-red" : ""
          }`}
        >
          {match.status === 0
            ? format(match.date, "HH:mm")
            : match.status === 1
            ? "Live"
            : match.status === 2
            ? "Finished"
            : "TBD"}
        </div>
      </div>
    </div>
  );
};

export default MatchBox;
