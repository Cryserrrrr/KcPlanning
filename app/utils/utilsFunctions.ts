import { MatchTypeWithId } from "~/routes/_index";

export function correctLolName(name: string) {
  switch (name) {
    case "Team Liquid Honda":
      return "Team Liquid";
    case "TOPESPORTS":
      return "Top Esports";
    case "E Wie Einfach E-Sports":
      return name.toUpperCase();
    case "Ici Japon Corp":
      return "Ici Japon Corp. Esport";
    case "Rogue":
      return "Rogue (European Team)";
    default:
      return name;
  }
}

export function correctValorantName(name: string, league: string) {
  if (league.includes("Game Changers") && name.includes("Karmine")) {
    name = "Karmine Corp GC";
  } else if (league.includes("Challengers") && name.includes("KC")) {
    name = "Karmine Corp Blue Stars";
  } else if (name.includes("KOI")) {
    name = "KOI";
  }
  return name;
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

  return `https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/${championNameFormatted}.png`;
}

export function isMobileScreen() {
  if (typeof window === "undefined") {
    return false; // Default to desktop during server-side rendering
  }
  return window.innerWidth < 1000;
}

export const getMatchColor = (match: MatchTypeWithId) => {
  switch (match.game) {
    case "League of Legends":
      return "bg-gradient-to-t from-[#05e4c5]/40 to-[#8ff0e4]/10";
    case "Valorant":
      return "bg-gradient-to-t from-[#d74646]/40 to-[#d74646]/10";
    default:
      return "bg-gradient-to-t from-indigo-500 to-black";
  }
};
