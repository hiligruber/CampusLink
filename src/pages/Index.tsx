import { mockRides } from "@/lib/mock-data";
import RideCard from "@/components/RideCard";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";

const Index = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Available Rides" />
      <main className="max-w-lg mx-auto px-4 py-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          {mockRides.length} rides heading to campus today
        </p>
        {mockRides.map((ride, i) => (
          <RideCard key={ride.id} ride={ride} index={i} />
        ))}
      </main>
      <BottomNav />
    </div>
  );
};

export default Index;
