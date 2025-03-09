import { SidebarProps } from "./sideBarContentLol";

const SideBarContentValorant: React.FC<SidebarProps> = ({
  match,
  karmineCorp,
  opponent,
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <h2 className="text-2xl font-bold text-center mb-4">Valorant</h2>
      <p className="text-center text-gray-500">🚧 Coming Soon 🚧</p>
    </div>
  );
};

export default SideBarContentValorant;
