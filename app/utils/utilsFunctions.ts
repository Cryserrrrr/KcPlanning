export function correctName(name: string) {
  switch (name) {
    case "Team Liquid Honda":
      return "Team Liquid";
    case "TOPESPORTS":
      return "Top Esports";
    default:
      return name;
  }
}

export function getChampionImageUrl(championName: string) {
  // Remove spaces from champion name
  let championNameFormatted = championName.replace(/\s+/g, "");

  // Map of special champion names that need formatting
  const specialChampions: Record<string, string> = {
    "K'Sante": "KSante",
    "Kai'Sa": "Kaisa",
    "Rek'Sai": "RekSai",
    "Bel'Veth": "Belveth",
    "Cho'Gath": "Chogath",
    "Dr.Mundo": "DrMundo",
    "Kha'Zix": "Khazix",
    "Kog'Maw": "KogMaw",
    "Vel'Koz": "Velkoz",
    RenataGlasc: "Renata",
  };

  // Check if champion needs special formatting
  if (specialChampions[championNameFormatted]) {
    championNameFormatted = specialChampions[championNameFormatted];
  }

  return `https://ddragon.leagueoflegends.com/cdn/13.1.1/img/champion/${championNameFormatted}.png`;
}
