import { MatchTypeWithId } from "~/routes/_index";
import closeIcon from "/icons/close.svg";
import SidebarContentLol from "./sideBarContentLol";

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  match: MatchTypeWithId | undefined;
};

export default function Sidebar({ isOpen, onClose, match }: SidebarProps) {
  const karmineCorp = match?.teams.find((team) =>
    team.name.includes("Karmine")
  );
  const opponent = match?.teams.find((team) => !team.name.includes("Karmine"));
  return (
    <>
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed right-0 top-0 h-full w-1/3 bg-black shadow-lg z-50 p-6 transition-transform duration-300 overflow-y-scroll scrollbar-hide ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-600 cursor-pointer"
        >
          <img src={closeIcon} alt="close" className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold">
          {karmineCorp?.name} vs {opponent?.name || "TBD"}
        </h1>
        {match?.game === "League of Legends" && (
          <SidebarContentLol
            match={match}
            karmineCorp={karmineCorp}
            opponent={opponent}
          />
        )}
      </div>
    </>
  );
}
