import { HomeApp } from "@/components/HomeApp";
import { AppProvider } from "@/components/providers/AppProvider";

export default function Page() {
  return (
    <AppProvider>
      <HomeApp />
    </AppProvider>
  );
}
