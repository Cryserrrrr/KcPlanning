import { MatchTypeWithId } from "~/routes/_index";
import { getChampionImageUrl } from "~/utils/utilsFunctions";

type SidebarProps = {
  match: MatchTypeWithId | undefined;
  karmineCorp: any | undefined;
  opponent: any | undefined;
};

// Generate a table for each role
const RoleStatsTable = ({
  roleName,
  players,
}: {
  roleName: string;
  players: { name: string; position: string; stats?: any }[][] | undefined;
}) => {
  if (!players) return null;

  const tableTitle = ["Player", "KDA", "CS/min", "Gold/min", "Dmg/min", "KP %"];
  const statKeys = ["kda", "csm", "gm", "dmgm", "kpar"];

  return (
    <div className="flex flex-col w-full mb-8">
      <h1 className="text-2xl font-bold mb-3">{roleName}</h1>

      <div className="flex flex-row">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-black">
              {tableTitle.map((title, index) => (
                <th
                  key={index}
                  className="px-4 py-2 text-left border border-gray-300 font-semibold text-center"
                >
                  {title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {players?.map((teamPlayers, teamIndex) => {
              // Get stats from both players for comparison
              const player = teamPlayers[0];
              const opposingTeamPlayers = players[teamIndex === 0 ? 1 : 0];
              const opposingPlayer = opposingTeamPlayers?.[0];

              return (
                <tr key={teamIndex} className="bg-secondary">
                  <td className="px-4 py-2 border border-gray-300">
                    {player.name}
                  </td>
                  {statKeys.map((statKey, i) => {
                    // Only highlight if both players exist and have stats
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
                        }`}
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
    </div>
  );
};

export default function SidebarContentLol({
  match,
  karmineCorp,
  opponent,
}: SidebarProps) {
  // Helper function to get players by position
  const getPlayersByPosition = (position: string) => {
    return match?.teams
      .map((team) => {
        return team.players.filter((player) => player.position === position);
      })
      .sort((a, b) => {
        return a[0].name === "Karmine Corp" ? 1 : -1;
      });
  };

  const positions = [
    { role: "Top", position: "Top Laner" },
    { role: "Jungle", position: "Jungler" },
    { role: "Mid", position: "Mid Laner" },
    { role: "ADC", position: "Bot Laner" },
    { role: "Support", position: "Support" },
  ];

  const standingTableTitle: string[] = [
    "Rank",
    "Team",
    "Region",
    "Win",
    "Lose",
    "Percentage",
  ];
  const standingKeys: string[] = [
    "position",
    "teamName",
    "regionName",
    "win",
    "lose",
    "percentage",
  ];
  //  match?.kcStats?.winByRedSidePercentage = 0.5 => 50%
  const formattedWinByRedSidePercentage = Math.round(
    match?.kcStats?.winByRedSidePercentage * 100
  );
  const formattedWinByBlueSidePercentage = Math.round(
    match?.kcStats?.winByBlueSidePercentage * 100
  );

  let leaguepediaUrl = `https://lol.fandom.com/wiki/${match?.league}`;
  if (match?.league === "LEC" || match?.league === "LFL") {
    leaguepediaUrl = `https://lol.fandom.com/wiki/${
      match?.league
    }/${new Date().getFullYear()}_Season`;
  }

  // Tableau des statistiques pour les champions
  const ChampionStatsTable = ({
    teamName,
    teamStats,
    numberOfChampionsPlayed,
    teamPlayers,
  }: {
    teamName: string;
    teamStats: any[];
    numberOfChampionsPlayed: number;
    teamPlayers: any[];
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
        <h1 className="text-2xl font-bold mb-3">{teamName} Champions</h1>
        <div className="flex flex-row">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-black">
                {tableTitle.map((title, index) => (
                  <th
                    key={index}
                    className="px-4 py-2 text-left border border-gray-300 font-semibold text-center"
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
                      className="w-8 h-8"
                    />
                  </td>
                  {statKeys.map((statKey, i) => (
                    <td
                      key={i}
                      className="px-4 py-2 border border-gray-300 text-center"
                    >
                      {champion[statKey] || "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-row mt-2">
          <p>
            {teamStats.length} / {numberOfChampionsPlayed}
          </p>
        </div>
        <div className="flex flex-col mt-2">
          <h2 className="text-lg font-bold mb-2">
            Players Most Played Champions
          </h2>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-black">
                <th className="px-4 py-2 text-left border border-gray-300 font-semibold">
                  Player
                </th>
                <th className="px-4 py-2 text-left border border-gray-300 font-semibold text-center">
                  Champions
                </th>
              </tr>
            </thead>
            <tbody>
              {teamPlayers.map((player, index) => (
                <tr key={index} className="bg-secondary">
                  <td className="px-4 py-2 border border-gray-300">
                    {player.name}
                  </td>
                  <td className="px-4 py-2 border border-gray-300 flex flex-row gap-2 h-full justify-center items-center">
                    {player.stats.mostPlayedChampion.map(
                      (champion: string, index: number) => (
                        <img
                          key={index}
                          src={getChampionImageUrl(champion)}
                          alt={champion}
                          className="w-8 h-8"
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

  return (
    <div>
      <div className="flex flex-col mt-6">
        <h1 className="text-2xl font-bold mb-3">Caster(s)</h1>
        {match?.casters?.map((caster) => (
          <div key={caster.name} className="flex flex-row gap-2">
            <p>{caster.name}</p>:
            <p className="text-primary underline cursor-pointer">
              {caster.twitchLink}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col mt-6">
        {positions.map((pos) => (
          <RoleStatsTable
            key={pos.role}
            roleName={pos.role}
            players={getPlayersByPosition(pos.position)}
          />
        ))}
      </div>

      {/* Tableaux des statistiques des champions pour chaque équipe */}
      <div className="flex flex-col mt-6">
        <ChampionStatsTable
          teamName={karmineCorp?.name || "Karmine Corp"}
          teamStats={karmineCorp?.stats}
          numberOfChampionsPlayed={karmineCorp?.numberOfChampionsPlayed}
          teamPlayers={karmineCorp?.players}
        />
        {opponent && (
          <ChampionStatsTable
            teamName={opponent?.name || "Opponent"}
            teamStats={opponent?.stats}
            numberOfChampionsPlayed={opponent?.numberOfChampionsPlayed}
            teamPlayers={opponent?.players}
          />
        )}
      </div>
      <div className="flex flex-col mt-6">
        <div className="flex flex-row">
          <img
            src={karmineCorp?.logoUrl}
            alt={karmineCorp?.name}
            className="w-8 h-8"
          />
          <h1 id={karmineCorp?.name} className="text-2xl font-bold mb-3 ml-2">
            {karmineCorp?.name}
          </h1>
        </div>
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
      <div className="flex flex-col mt-6">
        <h1 className="text-2xl font-bold mb-3">Standings</h1>
        {match?.rankingData && match.rankingData.length > 0 ? (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-black">
                {standingTableTitle.map((title, index) => (
                  <th
                    key={index}
                    className="px-4 py-2 text-left border border-gray-300 font-semibold"
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
                        key === "teamName" ? "w-1/2" : "w-1/4 text-center"
                      }`}
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
          <div className="mt-2">
            <p>No standings data available.</p>
          </div>
        )}

        <div className="flex flex-col gap-2 mt-2">
          <a
            href={leaguepediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-block"
          >
            View League on Leaguepedia →
          </a>
        </div>
      </div>
    </div>
  );
}
