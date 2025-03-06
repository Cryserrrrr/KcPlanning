import { MatchTypeWithId } from "~/routes/_index";

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

export function isMobileScreen() {
  if (typeof window === "undefined") {
    return false; // Default to desktop during server-side rendering
  }
  return window.innerWidth < 1000;
}

export const getMatchColor = (match: MatchTypeWithId) => {
  if (match.game === "League of Legends" && match.league === "LFL") {
    return "bg-gradient-to-t from-indigo-500 to-black";
  } else if (match.game === "League of Legends" && match.league === "Div2") {
    return "bg-gradient-to-t from-[#fd30d4]/40 to-[#fd30d4]/10";
  } else if (match.game === "League of Legends") {
    return "bg-gradient-to-t from-[#05e4c5]/40 to-[#8ff0e4]/10";
  }
};
