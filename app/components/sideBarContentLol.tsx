import { MatchTypeWithId } from "~/routes/_index";
import { getChampionImageUrl, isMobileScreen } from "~/utils/utilsFunctions";

type SidebarProps = {
  match: MatchTypeWithId | undefined;
  karmineCorp: any | undefined;
  opponent: any | undefined;
};

// Component to display player statistics for each role (Top, Jungle, Mid, ADC, Support)
const RoleStatsTable = ({
  roleName,
  players,
  isMobile,
}: {
  roleName: string;
  players: { name: string; position: string; stats?: any }[][] | undefined;
  isMobile: boolean;
}) => {
  if (!players) return null;

  const tableTitle = ["Player", "KDA", "CS/min", "Gold/min", "Dmg/min", "KP %"];
  const statKeys = ["kda", "csm", "gm", "dmgm", "kpar"];

  return (
    <div className="flex flex-col w-full mb-8">
      <h1 className={`font-bold mb-3 ${isMobile ? "text-3xl" : "text-2xl"}`}>
        {roleName}
      </h1>

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-black">
            {tableTitle.map((title, index) => (
              <th
                key={index}
                className={`px-4 py-2 text-left border border-gray-300 font-semibold text-center ${
                  isMobile ? "text-2xl" : ""
                }`}
              >
                {title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {players?.map((teamPlayers, teamIndex) => {
            const player = teamPlayers[0];
            const opposingTeamPlayers = players[teamIndex === 0 ? 1 : 0];
            const opposingPlayer = opposingTeamPlayers?.[0];

            return (
              <tr key={teamIndex} className="bg-secondary">
                <td
                  className={`px-4 py-2 border border-gray-300 ${
                    isMobile ? "text-2xl" : ""
                  }`}
                >
                  {player.name}
                </td>
                {/* Map through each stat and highlight if better than opponent */}
                {statKeys.map((statKey, i) => {
                  const shouldHighlight =
                    opposingPlayer &&
                    player.stats?.[statKey] &&
                    opposingPlayer.stats?.[statKey] &&
                    parseFloat(player.stats[statKey]) >
                      parseFloat(opposingPlayer.stats[statKey]);

                  return (
                    <td
                      key={i}
                      className={`px-4 py-2 border border-gray-300 text-center ${
                        shouldHighlight ? "bg-primary" : ""
                      } ${isMobile ? "text-2xl" : ""}`}
                    >
                      {player.stats?.[statKey] || "-"}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// Component to display champion statistics for a team
const ChampionStatsTable = ({
  teamName,
  teamStats,
  numberOfChampionsPlayed,
  teamPlayers,
  isMobile,
}: {
  teamName: string;
  teamStats: any[];
  numberOfChampionsPlayed: number;
  teamPlayers: any[];
  isMobile: boolean;
}) => {
  if (!teamStats || teamStats.length === 0) return null;

  const tableTitle = [
    "Champion",
    "KDA",
    "CS/min",
    "Gold/min",
    "Dmg/min",
    "KP %",
  ];
  const statKeys = ["kda", "csm", "gm", "dmgm", "kpar"];

  return (
    <div className="flex flex-col w-full mb-8">
      <h1 className={`font-bold mb-3 ${isMobile ? "text-3xl" : "text-2xl"}`}>
        {teamName} Champions
      </h1>
      {/* Champion stats table */}
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-black">
            {tableTitle.map((title, index) => (
              <th
                key={index}
                className={`px-4 py-2 text-left border border-gray-300 font-semibold text-center ${
                  isMobile ? "text-2xl" : ""
                }`}
              >
                {title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {teamStats.map((champion, index) => (
            <tr key={index} className="bg-secondary">
              <td className="px-4 py-2 border border-gray-300 flex items-center justify-center">
                <img
                  src={getChampionImageUrl(champion.champion)}
                  alt={champion.champion}
                  className={`${isMobile ? "w-12 h-12" : "w-8 h-8"}`}
                />
              </td>
              {statKeys.map((statKey, i) => (
                <td
                  key={i}
                  className={`px-4 py-2 border border-gray-300 text-center ${
                    isMobile ? "text-2xl" : ""
                  }`}
                >
                  {champion[statKey] || "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {/* Display champion count */}
      <div className={`mt-2 ${isMobile ? "text-2xl" : ""}`}>
        <p>
          {teamStats.length} / {numberOfChampionsPlayed}
        </p>
      </div>
      {/* Most played champions by player */}
      <div className={`flex flex-col mt-2 ${isMobile ? "text-2xl" : ""}`}>
        <h2 className={`font-bold mb-2 ${isMobile ? "text-2xl" : ""}`}>
          Players Most Played Champions
        </h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-black">
              <th
                className={`px-4 py-2 text-left border border-gray-300 font-semibold ${
                  isMobile ? "text-2xl" : ""
                }`}
              >
                Player
              </th>
              <th
                className={`px-4 py-2 text-left border border-gray-300 font-semibold text-center ${
                  isMobile ? "text-2xl" : ""
                }`}
              >
                Champions
              </th>
            </tr>
          </thead>
          <tbody>
            {teamPlayers.map((player, index) => (
              <tr key={index} className="bg-secondary">
                <td
                  className={`px-4 py-2 border border-gray-300 ${
                    isMobile ? "text-2xl" : ""
                  }`}
                >
                  {player.name}
                </td>
                <td
                  className={`px-4 py-2 border border-gray-300 flex flex-row gap-2 h-full justify-center items-center ${
                    isMobile ? "text-2xl" : ""
                  }`}
                >
                  {player.stats.mostPlayedChampion.map(
                    (champion: string, index: number) => (
                      <img
                        key={index}
                        src={getChampionImageUrl(champion)}
                        alt={champion}
                        className={`${isMobile ? "w-12 h-12" : "w-8 h-8"}`}
                      />
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Main component for the League of Legends sidebar content
export default function SidebarContentLol({
  match,
  karmineCorp,
  opponent,
}: SidebarProps) {
  // Helper function to get players by position
  const getPlayersByPosition = (position: string) => {
    return match?.teams
      .map((team) =>
        team.players.filter((player) => player.position === position)
      )
      .sort((a, b) => (a[0].name === "Karmine Corp" ? 1 : -1));
  };

  const isMobile = isMobileScreen();

  // Define positions for role-based stats
  const positions = [
    { role: "Top", position: "Top Laner" },
    { role: "Jungle", position: "Jungler" },
    { role: "Mid", position: "Mid Laner" },
    { role: "ADC", position: "Bot Laner" },
    { role: "Support", position: "Support" },
  ];

  // Column definitions for standings table
  const standingTableTitle = [
    "Rank",
    "Team",
    "Region",
    "Win",
    "Lose",
    "Percentage",
  ];
  const standingKeys = [
    "position",
    "teamName",
    "regionName",
    "win",
    "lose",
    "percentage",
  ];

  // Calculate win percentages
  const formattedWinByRedSidePercentage = Math.round(
    match?.kcStats?.winByRedSidePercentage * 100
  );
  const formattedWinByBlueSidePercentage = Math.round(
    match?.kcStats?.winByBlueSidePercentage * 100
  );

  // Generate Leaguepedia URL based on league name
  let leaguepediaUrl = `https://lol.fandom.com/wiki/${match?.league}`;
  if (
    match?.league === "LEC" ||
    match?.league === "LFL" ||
    match?.league === "EMEA Masters"
  ) {
    const formatedLeague = match?.league.replace(" ", "_");
    leaguepediaUrl = `https://lol.fandom.com/wiki/${formatedLeague}/${new Date().getFullYear()}_Season`;
  }

  return (
    <div>
      {/* Casters section */}
      <div className="flex flex-col mt-6">
        <h1 className={`text-2xl font-bold mb-3 ${isMobile ? "text-3xl" : ""}`}>
          Caster(s)
        </h1>
        {match?.casters?.map((caster) => (
          <div
            key={caster.name}
            className={`flex flex-row gap-2 ${isMobile ? "text-3xl" : ""}`}
          >
            <p>{caster.name}:</p>
            <p
              className={`text-primary underline cursor-pointer ${
                isMobile ? "text-3xl" : ""
              }`}
            >
              {caster.twitchLink}
            </p>
          </div>
        ))}
        {/* VOD link */}
        {match?.status === 2 && (
          <div
            className={`flex flex-row gap-2 ${isMobile ? "text-3xl" : ""} mt-2`}
          >
            <p>VOD: </p>
            <p>
              <a
                href="https://www.youtube.com/@KarmineCorpVOD/videos"
                target="_blank"
                rel="noopener noreferrer"
                className={`text-primary underline cursor-pointer ${
                  isMobile ? "text-3xl" : ""
                }`}
              >
                https://www.youtube.com/@KarmineCorpVOD/videos
              </a>
            </p>
          </div>
        )}
      </div>

      {/* Role-based player stats */}
      <div className="flex flex-col mt-6">
        {positions.map((pos) => (
          <RoleStatsTable
            key={pos.role}
            roleName={pos.role}
            players={getPlayersByPosition(pos.position)}
            isMobile={isMobile}
          />
        ))}
      </div>

      {/* Team champion stats */}
      <div className="flex flex-col mt-6">
        <ChampionStatsTable
          teamName={karmineCorp?.name || "Karmine Corp"}
          teamStats={karmineCorp?.stats}
          numberOfChampionsPlayed={karmineCorp?.numberOfChampionsPlayed}
          teamPlayers={karmineCorp?.players}
          isMobile={isMobile}
        />
        {opponent && (
          <ChampionStatsTable
            teamName={opponent?.name || "Opponent"}
            teamStats={opponent?.stats}
            numberOfChampionsPlayed={opponent?.numberOfChampionsPlayed}
            teamPlayers={opponent?.players}
            isMobile={isMobile}
          />
        )}
      </div>

      {/* Karmine Corp team stats */}
      <div className={`flex flex-col mt-6 ${isMobile ? "text-2xl" : ""}`}>
        <div className="flex flex-row">
          <img
            src={karmineCorp?.logoUrl}
            alt={karmineCorp?.name}
            className="w-8 h-8"
          />
          <h1
            id={karmineCorp?.name}
            className={`text-2xl font-bold mb-3 ml-2 ${
              isMobile ? "text-3xl" : ""
            }`}
          >
            {karmineCorp?.name}
          </h1>
        </div>
        {/* Win rates by side */}
        <div className="flex flex-row gap-2">
          <p>
            Win on red side:{" "}
            <span className="font-bold">
              {formattedWinByRedSidePercentage}%
            </span>
          </p>
          <p>
            Win on blue side:{" "}
            <span className="font-bold">
              {formattedWinByBlueSidePercentage}%
            </span>
          </p>
        </div>
        {/* Win rate against opponent */}
        <div className="flex flex-row gap-2">
          <p>
            Winrate vs {opponent?.name || "TBD"}:{" "}
            <span className="font-bold">
              {match?.kcStats?.winrateVsOtherTeamPercentage
                ? `${match?.kcStats?.winrateVsOtherTeamPercentage}%`
                : "Never played against them"}
            </span>
          </p>
        </div>
        {/* Top banned champions */}
        <div className="flex flex-row gap-2">
          <p>
            Top 3 banned champions vs {opponent?.name || "TBD"}:{" "}
            <span className="font-bold">
              {match?.kcStats?.topThreeChampions
                ? match?.kcStats?.topThreeChampions
                    .map((champion: [string, number]) => champion[0])
                    .join(", ")
                : "Never played against them"}
            </span>
          </p>
        </div>
        <a
          href={`https://lol.fandom.com/wiki/${karmineCorp?.name}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline inline-block"
        >
          View {karmineCorp?.name} on Leaguepedia →
        </a>
      </div>

      {/* League standings */}
      <div className="flex flex-col mt-6">
        <h1 className={`text-2xl font-bold mb-3 ${isMobile ? "text-3xl" : ""}`}>
          Standings
        </h1>
        {match?.rankingData && match.rankingData.length > 0 ? (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-black">
                {standingTableTitle.map((title, index) => (
                  <th
                    key={index}
                    className={`px-4 py-2 text-left border border-gray-300 font-semibold ${
                      isMobile ? "text-2xl" : ""
                    }`}
                  >
                    {title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {match?.rankingData?.map((standing, index) => (
                <tr key={index} className="bg-secondary">
                  {standingKeys.map((key, index) => (
                    <td
                      key={index}
                      className={`px-4 py-2 border border-gray-300 ${
                        isMobile ? "text-2xl" : ""
                      } ${key === "teamName" ? "w-1/2" : "w-1/4 text-center"}`}
                    >
                      {key === "win" || key === "lose" || key === "percentage"
                        ? `${
                            standing.series[key as keyof typeof standing.series]
                          }%`
                        : key === "teamName"
                        ? standing[key as keyof typeof standing].toString()
                        : standing[key as keyof typeof standing]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className={`mt-2 ${isMobile ? "text-2xl" : ""}`}>
            <p>No standings data available.</p>
          </div>
        )}

        {/* External links */}
        <div className="flex flex-col gap-2 mt-2">
          <a
            href={leaguepediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-primary hover:underline inline-block ${
              isMobile ? "text-2xl" : ""
            }`}
          >
            View League on Leaguepedia →
          </a>
        </div>
        {/* Post-game analysis placeholder */}
        <div
          className={`flex flex-col gap-2 mt-2 ${isMobile ? "text-2xl" : ""}`}
        >
          <h1
            className={`font-bold mb-3 ${isMobile ? "text-3xl" : "text-2xl"}`}
          >
            Post-Game Analysis
          </h1>
          <p>🚧 Coming soon 🚧</p>
        </div>
      </div>
    </div>
  );
}
